# 项目知识要点与复习架构（Knowledge Architecture）

> 目标：把本项目（`server/src/multi-agent` + `server/src/openAI`）涉及的核心知识点，整理成可复习的“知识树”。  
> 使用方式：按层级逐条复习；每个节点都配了 **关键词** 和 **自测问题**（能答出来≈掌握）。

---

## 0. 项目一句话模型（先背下来）

这是一个基于 LLM function calling 的 **Multi-Agent 编排系统**：Master Agent 在 TUI 中维护对话与任务列表，按流程调用独立进程的子 Agent（写文件/代码审查）完成具体动作；系统通过 Agent loop 将“模型输出 → 工具调用 → 工具结果回写 → 继续推理”闭环化。

---

## 1. 总体架构层（Architecture）

### 1.1 分层与职责

- **Master Agent（编排层）**
  - **关键词**：任务拆解、todo 状态、流程控制、调用子 Agent
  - **自测**：Master 为什么不直接读写文件？它“只编排不执行”的好处是什么？

- **Sub-Agent（执行层）**
  - **关键词**：专用能力、最小工具暴露、独立会话
  - **自测**：写文件与审查为什么要拆成两个 Agent？如何扩展第三个 Agent？

- **OpenAI/TUI（交互与循环层）**
  - **关键词**：流式响应、tool_calls 合并、历史消息回写
  - **自测**：TUI 这一层真正解决了什么问题？

### 1.2 项目模块映射（你要能指出文件）

- `server/src/multi-agent/main.ts`：启动入口
- `server/src/multi-agent/master-agent/*`：主 Agent + todo + 调用子 Agent
- `server/src/multi-agent/agents/*`：子 Agent（写文件、代码审查）
- `server/src/openAI/tui.ts`：TUI + 主 Agent loop
- `server/src/openAI/openai.ts`：模型请求 + tool 执行器

**自测**：说出一次完整请求从用户输入到子 Agent 结束的调用链路。

---

## 2. Agent Loop 核心机制（LLM Tool-Calling Loop）

### 2.1 Loop 的闭环结构

- **步骤**：用户输入 → `generateResponse` → 解析 `content/tool_calls` → 执行工具 → 写回 tool 结果 → 下一轮 → 直到无工具调用
- **关键词**：闭环、状态机、可中断、上限保护（steps）
- **自测**：为什么必须把 tool 结果写回 messages？不写会怎样？

### 2.2 tool_calls 的流式合并（Streaming Assembly）

- **关键词**：chunk、delta、tool_call index、arguments 拼接
- **自测**：为什么需要按 `index` 合并 tool call？arguments 为什么要累加？

### 2.3 步数上限与防失控

- TUI 用 `AGENT_MAX_STEPS`（默认 16）
- 子 Agent 内部也有 `maxIterations`（默认 10）
- **关键词**：死循环防护、成本控制、稳定性
- **自测**：如果模型一直要调用工具，系统如何避免无限循环？

---

## 3. 主控编排（Orchestration）

### 3.1 TodoManager 与执行策略

- **关键词**：任务列表、状态（pending/in_progress/completed）、串行执行
- **自测**：串行执行的优点是什么？并发执行会引入哪些新问题？

### 3.2 编排与提示词约束（Prompt-as-Policy）

- Master 系统提示词约束：先建 todo 再执行、一次一个 todo、文件操作交给子 Agent
- **关键词**：流程约束、策略、可控性
- **自测**：系统提示词是“软约束”，如何用工程手段把它变成“硬约束”？

---

## 4. 子 Agent 执行模型（Execution Agents）

### 4.1 WriteFile Agent

- **能力**：写文件（创建目录、落盘）
- **关键词**：最小权限、writeFile tool、返回 finish
- **自测**：写文件时怎么处理相对路径与绝对路径？如何防止越界？

### 4.2 CodeReview Agent

- **能力**：读文件 → 输出审查建议
- **关键词**：readFile tool、只读权限、审查模板
- **自测**：如何让审查更可操作（可执行建议、分级、示例）？

---

## 5. 上下文隔离（Context Isolation）

### 5.1 进程隔离

- Master 用 `spawn` 启子进程跑子 Agent
- **关键词**：内存隔离、生命周期、exit code
- **自测**：父进程如何感知子进程结束？为什么不用共享内存？

### 5.2 会话隔离

- Master：`historyMessages`
- Sub-Agent：每次任务新建 `messages`
- **关键词**：防串味、提示词污染控制
- **自测**：如果让子 Agent 继承 master 历史，会产生什么坏处？

### 5.3 能力隔离（最小工具暴露）

- 写/读拆开，减少误操作面
- **关键词**：最小权限、职责分离
- **自测**：如何设计工具白名单？如何防止模型调用不存在工具？

---

## 6. I/O 与文件系统（File I/O）

### 6.1 路径处理与目录创建

- **关键词**：`path.isAbsolute`、`path.join`、`fs.mkdirSync({recursive:true})`
- **自测**：为什么说当前实现还不是强安全隔离？你会怎么做“路径沙箱化”？

### 6.2 输出协议与完成信号

- 当前 `finished` 依赖 stdout 包含 `finish`
- **关键词**：协议脆弱、结构化输出、可验证性
- **自测**：你会怎么设计结构化完成信号？（JSON、exit code、字段定义）

---

## 7. 工具执行层（Tool Runner）

### 7.1 functionRunner 参数解析与分发

- **关键词**：JSON.parse、name->function 映射、返回 `tool_call_id`
- **自测**：为什么用 `Object.values(args)` 有风险？怎么改成显式参数绑定？

### 7.2 错误处理策略

- **关键词**：参数非 JSON、工具不存在、工具抛错、tool_result 回写兜底
- **自测**：工具失败时你会如何重试/降级？如何把错误呈现给用户可理解？

---

## 8. 模型与配置（LLM Provider & Config）

### 8.1 Provider/Model 选择

- **关键词**：dashscope/moonshot/openai、多 provider 兼容、baseURL/model 环境变量
- **自测**：切换模型供应商时，如何保证工具调用行为一致？

### 8.2 成本与延迟治理

- **关键词**：流式、步数上限、超时、缓存（可扩展）
- **自测**：你会如何监控 token、RT、失败率，并做预算控制？

---

## 9. 稳定性与可观测性（Reliability & Observability）

### 9.1 可观测性

- **关键词**：关键日志、阶段埋点、子进程 stdout/stderr 收集、链路追踪（可扩展）
- **自测**：线上出现“卡在工具调用”你怎么定位是哪一轮、哪个工具、哪个参数？

### 9.2 失控治理

- **关键词**：最大轮数、子进程超时/卡死、取消、重试、熔断（建议补齐）
- **自测**：如果子进程不退出（hang），你会怎么设计超时与 kill 策略？

---

## 10. 安全（Security）

### 10.1 Prompt Injection 与工具安全

- **关键词**：最小权限、工具白名单、输入校验、输出约束
- **自测**：如何防止用户输入诱导模型去读/写不该访问的路径？

### 10.2 敏感信息治理

- **关键词**：API Key、日志脱敏、错误信息控制
- **自测**：哪些字段绝对不能进日志？怎么做脱敏与审计？

---

## 11. 测试与工程化（Testing & Engineering）

### 11.1 测试分层建议（你可以这么讲）

- **单测**：`functionRunner`、路径校验、工具函数
- **集成测试**：TUI loop + mock LLM response（含 tool_calls）
- **端到端**：spawn 子进程执行子 Agent（可选）

**自测**：你会如何 mock 流式 `tool_calls`？如何覆盖“arguments 分片拼接”？

### 11.2 代码质量与规范

- **关键词**：TypeScript 类型、错误边界、lint、日志规范、可扩展目录结构
- **自测**：你会在哪些地方加类型以降低线上事故？

---

## 12. 面试复盘：你应该能讲清楚的 5 件事

1. **架构**：Master/Sub-Agent 分层与职责  
2. **Agent loop**：工具调用闭环与停止条件  
3. **隔离**：进程/会话/能力/协议边界  
4. **风险**：路径越界、finish 协议脆弱、参数顺序风险  
5. **改进**：路径沙箱、结构化协议、超时重试、可观测性与测试体系  

