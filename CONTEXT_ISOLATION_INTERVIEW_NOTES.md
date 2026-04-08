# Multi-Agent 上下文隔离要点（面试版）

> 适用场景：介绍你在 Multi-Agent 架构里如何做「主 Agent 与子 Agent 的上下文隔离」。

## 一句话概括

我们采用 **进程隔离 + 会话隔离 + 工具能力隔离 + 协议边界隔离**，让 Master Agent 只负责编排，子 Agent 只负责执行，彼此不共享运行时状态。

---

## 1) 进程隔离（Process Isolation）

- Master 通过 `spawn` 启动子 Agent（独立 Node 进程）。
- 子 Agent 在独立内存空间运行，变量/对象/消息历史天然不共享。
- Master 只通过子进程 `stdout/stderr/exit code` 感知结果。

**面试表达**：  
“先把执行单元拆成独立进程，先拿到最硬的隔离边界，避免上下文串扰和内存污染。”

---

## 2) 会话隔离（Conversation Isolation）

- Master 维护自己的 `historyMessages`。
- 每个子 Agent 在执行任务时都会新建自己的 `messages`，只从当前 task 开始。
- 子 Agent 不继承 Master 的完整对话上下文，避免提示词污染和任务串味。

**面试表达**：  
“每个 Agent 都有独立对话上下文，子 Agent 不复用主会话历史，保证任务语义干净。”

---

## 3) 工具能力隔离（Capability Isolation）

- `write-file-agent` 只暴露写文件工具。
- `code-review-agent` 只暴露读文件工具。
- Master 不直接做文件 I/O，仅通过 `callSubAgent` 进行调度。

**面试表达**：  
“按职责最小化工具暴露，谁该读写文件由专门子 Agent 承担，Master 只编排不越权。”

---

## 4) 协议边界隔离（Protocol Boundary）

- Master 向子 Agent 只传最小输入：`AGENT_TASK`、`AGENT_DIR`。
- 子 Agent 输出通过结构化结果（当前实现含 `success/message/finished`）回传。
- 边界清晰后，可替换子 Agent 实现而不影响 Master 编排逻辑。

**面试表达**：  
“我把主子 Agent 之间做成‘输入输出协议’，而不是共享对象调用，降低耦合度。”

---

## 5) 当前方案的不足（可以主动加分）

虽然已有逻辑隔离，但还不是强安全隔离，主要风险：

1. 文件工具允许绝对路径，存在越目录访问风险。  
2. `finished` 依赖输出字符串包含 `finish`，协议不够稳。  
3. 子进程 `cwd` 目前未强制锁定到专属沙箱目录。  

**面试表达**：  
“架构层面已完成隔离，但安全边界还可继续收紧，下一步是做路径沙箱和结构化完成信号。”

---

## 6) 可落地的增强方案（面试可讲改进思路）

1. **路径沙箱化**：`resolve` 后校验必须在 `agentDir` 下，拒绝越界路径。  
2. **完成信号协议化**：改为 JSON 状态对象，不依赖文本匹配。  
3. **执行环境收敛**：子进程 `cwd` 固定到任务目录，必要时加超时与中断机制。  
4. **参数绑定显式化**：工具参数按 key 映射，避免 `Object.values` 顺序风险。  

---

## 7) 面试回答模板（30 秒版）

“我们做 Multi-Agent 时，把上下文隔离拆成四层：  
第一是进程隔离，Master 用 spawn 起子进程；  
第二是会话隔离，每个 Agent 维护自己的 messages；  
第三是能力隔离，写文件和读审查分别由不同子 Agent 执行；  
第四是协议隔离，主子之间只传任务输入和结果输出，不共享内部状态。  
这样可以避免上下文串扰、降低耦合，也便于后续扩展更多专用 Agent。”  

