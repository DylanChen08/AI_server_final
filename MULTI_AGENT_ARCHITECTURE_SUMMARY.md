# Multi-Agent 架构详细总结

本文档总结当前项目中 `server/src/multi-agent` 的实现架构、执行链路、模块职责、上下文隔离方式、已知风险与优化方向。

## 1. 总体目标与定位

该 Multi-Agent 方案采用「**Master Agent 编排 + 专用 Sub-Agent 执行**」模式：

- `Master Agent` 负责任务规划、流程推进、状态管理、调用子 Agent。
- `WriteFile Agent` 负责文件写入。
- `CodeReview Agent` 负责读取文件并做审查建议。
- 基于 OpenAI Chat Completions + function calling + 流式输出实现 Agent loop。

整体上是一个 **可交互式命令行编排器（TUI）**，通过工具调用实现 Agent 之间协作。

---

## 2. 目录与模块结构

核心目录：`server/src/multi-agent`

- `main.ts`：启动入口，创建并启动 Master Agent
- `master-agent/`
  - `index.ts`：Master Agent 类，装配工具与工具描述
  - `prompt/index.ts`：Master Agent 系统提示词（流程约束与规则）
  - `tools/master-tools.ts`：任务列表管理 + 子 Agent 进程调用
- `agents/write-file-agent/`
  - `index.ts`：写文件子 Agent 主循环
  - `prompt/index.ts`：写文件子 Agent 提示词
  - `tools/file-tools.ts`：文件写入工具
- `agents/code-review-agent/`
  - `index.ts`：代码审查子 Agent 主循环
  - `prompt/index.ts`：代码审查子 Agent 提示词
  - `tools/file-tools.ts`：文件读取工具

共享能力依赖：

- `server/src/openAI/openai.ts`：模型请求与工具执行器（`generateResponse` / `functionRunner`）
- `server/src/openAI/tui.ts`：交互式 TUI 主循环与通用 Agent loop

---

## 3. 启动与执行主链路

## 3.1 入口阶段

1. `main.ts` 加载 `.env`。
2. 构造 `agentDir = path.resolve(__dirname, 'master-agent')`。
3. 创建 `MasterAgent(agentDir)` 并调用 `start()`。

## 3.2 Master Agent 启动阶段

`MasterAgent` 在构造时完成三件事：

1. 保存 `agentDir`
2. 加载 master 的 `systemPrompt`
3. 装配工具集：
   - `addTodo`
   - `listTodos`
   - `updateTodoStatus`
   - `removeTodo`
   - `callSubAgent`

随后 `start()` 调用 `startTUI(systemPrompt, tools, toolDescriptions)`，进入交互与自动工具调用循环。

## 3.3 TUI Agent Loop（通用）

`startTUI` 的核心循环机制：

1. 读取用户输入，写入 `historyMessages`
2. 调用 `generateResponse(...)` 获取流式模型响应
3. 解析 `content` 与分片 `tool_calls`
4. 若有工具调用：
   - 组装 assistant 的 `tool_calls` 消息入历史
   - 执行 `functionRunner(toolCalls, tools)`
   - 将每个 `tool` 结果写回历史
   - 继续下一轮模型调用
5. 若无工具调用，结束当前用户问题的 loop
6. 通过 `AGENT_MAX_STEPS`（默认 16）限制最大工具调用轮数

这套 loop 同时被主 Agent 和子 Agent（各自内部）复用同样思路。

---

## 4. Master Agent 的编排职责

Master 的系统提示词定义了强流程：

1. 先创建 todo（通常写代码任务 + 审查任务）
2. 按顺序逐个执行（单任务串行）
3. 调用 `callSubAgent` 执行当前任务
4. 依据结果更新 todo 状态
5. 全部完成后结束

Master 不直接读写文件，而是通过子 Agent 间接执行文件操作（在提示词层约束）。

---

## 5. 子 Agent 调用机制（进程级）

`callSubAgent(agentType, task, agentDir)` 做的事情：

1. 根据 `agentType` 选择脚本路径：
   - `write-file` -> `agents/write-file-agent/index.ts`
   - `code-review` -> `agents/code-review-agent/index.ts`
2. `spawn('node', ['-r', 'ts-node/register', scriptPath], ...)` 启动子进程
3. 通过环境变量注入任务：
   - `AGENT_TASK`
   - `AGENT_DIR`
4. 收集子进程 `stdout/stderr`
5. 监听 `close` 事件：
   - `code === 0` 视为执行成功
   - 同时用 `output.includes('finish')` 计算 `finished`

返回值结构：

- `success: boolean`
- `message: string`
- `finished: boolean`

---

## 6. Sub-Agent 内部执行细节

## 6.1 WriteFile Agent

职责：

- 接收任务（`AGENT_TASK`）
- 通过 LLM + tool-calling 决定是否调用 `writeFile(filePath, content)`
- 写入完成后返回 `'finish'`（并最终 `process.exit(0)`）

工具能力：

- 仅 `writeFile`

## 6.2 CodeReview Agent

职责：

- 接收任务（`AGENT_TASK`）
- 通过 LLM + tool-calling 调用 `readFile(filePath)`
- 基于读取内容输出审查意见
- 返回 `'finish'`（并最终 `process.exit(0)`）

工具能力：

- 仅 `readFile`

## 6.3 子 Agent 的 loop 结构

两类子 Agent 都是：

1. 初始化 `messages = [{ role: 'user', content: task }]`
2. 多轮调用 `generateResponse`
3. 解析并执行工具调用
4. 将工具结果写回 `messages`
5. 无工具调用或达到上限（`maxIterations = 10`）后退出

---

## 7. 上下文隔离与边界

当前实现的隔离机制：

1. **进程隔离**：子 Agent 在独立 Node 进程中执行，不共享内存。
2. **会话隔离**：子 Agent 的 `messages` 从任务开始单独构建，不继承主 Agent `historyMessages`。
3. **能力隔离**：不同子 Agent 只暴露其专属工具（读/写分离）。
4. **参数边界**：主 Agent 仅通过环境变量将任务与目录传入子进程。

注意：这是「逻辑隔离」，不是「强安全隔离」。

---

## 8. 模型层与工具执行层

`openai.ts` 提供两项核心能力：

1. `generateResponse(messages, systemPrompt, tools)`
   - 统一组装系统提示词 + 历史消息
   - `tool_choice: 'auto'`
   - `stream: true`
2. `functionRunner(toolCalls, tools)`
   - 解析 JSON 参数
   - 分发到本地函数 `tools[name](...Object.values(args))`
   - 将结果统一封装为 `{ tool_call_id, result }`

模型提供方可通过环境变量切换（dashscope / moonshot / openai）。

---

## 9. 当前实现的关键特性

1. **可观察性较好**：大量 `console.log` 输出便于追踪 Agent 行为。
2. **结构清晰**：Master 负责编排，Sub-Agent 负责执行。
3. **扩展点明确**：可继续新增 `agentType` 和对应子 Agent。
4. **避免主 Agent 直接文件操作**：职责分离较明确（至少在设计意图上）。

---

## 10. 已识别的风险与问题

1. **路径安全不足**  
   子工具允许绝对路径（`path.isAbsolute(filePath)` 直接放行），可能越过 `agentDir` 访问任意位置。

2. **工作目录边界不严格**  
   `spawn` 使用 `cwd: process.cwd()`，并非强制限定到子任务目录。

3. **`finished` 判断脆弱**  
   依赖 stdout 是否包含 `finish` 字符串，容易被误判；与 `exit code` 语义重叠。

4. **参数映射方式存在隐患**  
   `functionRunner` 用 `Object.values(args)` 传参，键顺序依赖对象序列化顺序，不是显式命名映射。

5. **异常与中断处理较弱**  
   子进程超时、卡死、取消、重试策略尚不完善。

6. **残留调试语句**  
   多处 `debugger`（如 master tools）会影响运行与可维护性。

7. **循环上限策略分裂**  
   TUI（默认 16）与子 Agent（10）分别限制，可能出现策略不一致。

---

## 11. 建议的演进方向（按优先级）

## P0（建议尽快）

1. **加强文件访问沙箱**
   - 使用 `path.resolve` + 前缀校验，强制 `resolvedPath` 必须在 `agentDir` 下。
   - 默认拒绝绝对路径或仅允许白名单目录。

2. **强化完成信号协议**
   - 用结构化 JSON（如 `{status:'done', taskId:'...'}`）替代字符串包含判断。
   - `exit code` 作为进程状态，业务完成状态用独立字段。

3. **移除 `debugger` 与脆弱日志依赖**
   - 清理调试残留，统一日志级别与格式。

## P1（中期）

4. **标准化工具调用参数绑定**
   - 改成按参数名映射，避免 `Object.values` 的顺序耦合。

5. **统一 Agent loop 策略**
   - 将步数上限、超时、重试策略抽成共享配置。

6. **任务协议化**
   - Master->SubAgent 的输入输出协议结构化（任务 ID、类型、文件集合、结果摘要）。

## P2（长期）

7. **并行与调度能力**
   - 从串行 todo 升级为可控并行（依赖图、队列、优先级）。

8. **状态持久化**
   - todo 与任务结果落盘/数据库，支持恢复与审计。

---

## 12. 一句话结论

当前架构已经具备「主控编排 + 专职执行 + 工具闭环」的 Multi-Agent 雏形，工程结构清晰、可扩展性好；但在路径安全、任务协议稳定性、异常处理与工具参数绑定方面仍需加强，才能从“可运行原型”升级到“稳健可生产化”形态。

