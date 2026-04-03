# Cursor 接入本仓库 MCP（a2ui-mock-idl）说明

本文档总结：**如何让基于 `server/src/mcp` 的 MCP 在 Cursor 中稳定工作**，以及排查「无工具 / 编译失败 / 配置冲突」时的原因与处理。

---

## 1. 架构关系（你在用什么）

| 角色 | 说明 |
|------|------|
| **MCP 客户端（宿主）** | Cursor：负责启动子进程、通过 stdio 与 MCP 对话 |
| **MCP 服务端** | 本仓库 `server` 内进程：入口为 `server/run-mcp.cjs` → `server/src/mcp/main.ts` |
| **传输方式** | **Stdio**（标准输入/输出），**不是** HTTP 端口 |
| **暴露的能力** | 工具 **`generate_mock`**：根据 `apiUrl` 读取 `server/src/mcp/idl/*.json` 并返回文本（IDL + 提示） |

要点：

- 协议走 **stdout**，调试日志请用 **stderr**（例如 `console.error`），避免污染 MCP 消息。
- `generate_mock` **当前不直接生成最终业务 JSON**，而是把对应 IDL 内容返回给上层模型/人，再由其生成 mock。

---

## 2. 我们做了哪些改动，使 MCP「能正常工作」

### 2.1 工具列表 JSON Schema 修正

早期 `ListTools` 里工具的 `required: ['apiUrl']` 写在 **`inputSchema` 外面**，不符合 JSON Schema 的常见结构，部分客户端会**丢弃整条工具**，表现为 **「No tools, prompts, or resources」**。

**正确写法**：`required` 放在 `inputSchema` 内部（与 `properties` 同级）。

### 2.2 使用 `run-mcp.cjs` 固定工作目录

仅用 `npm run mcp --workspace=@a2ui/server` 时，若 Cursor 启动子进程的 **当前工作目录不是 monorepo 根目录**，npm workspace 可能解析失败，进程异常退出，界面仍可能显示「已连接」但**无工具**。

**做法**：增加 `server/run-mcp.cjs`：

- 启动时 `process.chdir(__dirname)`（即 `server` 目录）
- `require('ts-node/register')` 后加载 `src/mcp/main.ts`

这样 **无论从哪个 cwd 被拉起**，依赖与相对路径都一致。

### 2.3 项目级 `.cursor/mcp.json`

在仓库根目录 `.cursor/mcp.json` 中配置 stdio：

- `command`: `node`
- `args`: `["${workspaceFolder}/server/run-mcp.cjs"]`

**要求**：用 Cursor **打开本仓库根目录**作为工作区，以便 `${workspaceFolder}` 正确展开。

### 2.4 避免与全局配置「同名冲突」

若 **`~/.cursor/mcp.json`** 里还有一条也叫 `a2ui-mock-idl`（例如旧的 `sh -c … npx ts-node`），Cursor 里可能出现 **两条同名 MCP**，其中一条异常会导致 **绿点但无工具**。

**做法**：

- 项目内 MCP 的 key 使用 **`a2ui-mock-idl-local`**（或其它唯一名称）
- **删除或合并**全局里重复的 `a2ui-mock-idl` 配置，只保留一套真实可用的启动命令

### 2.5 服务端实现改为 SDK 推荐方式 + 解决 ts-node 编译错误

将低层 `Server` + 手写 `ListTools` / `CallTool`，改为 **`McpServer` + `registerTool`**，并 **`await mcp.connect(transport)`**，与 `@modelcontextprotocol/sdk` 示例一致，减少与 Cursor 的兼容性差异。

在 **ts-node 编译**阶段曾出现：

- `TS2589: Type instantiation is excessively deep and possibly infinite`
- `TS2339: Property 'apiUrl' does not exist on type ...`

**处理方式**：

- `zod` 使用与 SDK 示例一致的入口：`import * as z from 'zod/v4'`
- `registerTool` 的回调参数使用显式类型，例如 `(params: { apiUrl: string })`，避免深层泛型推导与解构类型不匹配

### 2.6 `package.json` 脚本（可选）

在 `server/package.json` 中增加：

- `"mcp": "node run-mcp.cjs"`

便于终端手动验证，不等同于 Cursor 必须走 npm。

---

## 3. 本地自检步骤

在终端执行（路径按本机修改）：

```bash
node /path/to/AI_server_final/server/run-mcp.cjs
```

预期：

- stderr 出现类似 `####mcp server run`
- 进程**持续运行**（stdio MCP 会等待 Cursor 发协议），无立即退出的 TypeScript 报错

若此处失败，Cursor 里一定也不会稳定出工具；应先根据终端报错修代码或依赖。

---

## 4. Cursor 侧操作清单

1. **打开工作区**：`AI_server_final` 根目录（含 `.cursor/mcp.json`）。
2. **安装依赖**：在仓库根执行 `npm install`。
3. **Settings → Tools & MCP**：启用 **`a2ui-mock-idl-local`**（或你配置的 key）。
4. **完全重启 Cursor**（或关闭再打开该 MCP），避免旧子进程缓存。
5. **Output → MCP Logs**：若仍异常，以日志为准（比设置页红点/绿点更具体）。

成功时：该 MCP 条目应显示 **至少 1 个工具**，并能看到 **`generate_mock`**。

---

## 5. `apiUrl` 与 IDL 文件如何对应

`server/src/mcp/server.ts` 中逻辑大致为：

- 去掉首尾 `/`，把路径里的 `/` 换成 `-`，再加 `.json`
- 在 `server/src/mcp/idl/` 下查找文件

示例：

| `apiUrl` | 映射文件 |
|----------|----------|
| `/order/api` | `order-api.json` |
| `/user/api` | `user-api.json` |
| `/product/api` | `product-api.json` |

若文件不存在，工具返回内容中会带错误说明（找不到 IDL）。

---

## 6. 在对话里如何调用

在 Cursor Agent 中（需允许工具执行），可说明：

- 调用 **`generate_mock`**
- 参数 **`apiUrl`**：例如 `"/order/api"`

返回内容为 **IDL 文本 +「请生成 mock」提示**；若需要 **工具直接返回 JSON mock**，需另行改 `generate_mock` 的实现（例如返回结构化 JSON 字符串或 `structuredContent`）。

---

## 7. 相关文件索引

| 路径 | 作用 |
|------|------|
| `.cursor/mcp.json` | Cursor 项目级 MCP 配置 |
| `server/run-mcp.cjs` | 固定 cwd + ts-node 启动入口 |
| `server/src/mcp/main.ts` | MCP 进程入口 |
| `server/src/mcp/server.ts` | `McpServer`、工具 `generate_mock`、IDL 读取 |
| `server/src/mcp/idl/*.json` | 各接口 IDL 定义 |
| `server/package.json` | `npm run mcp` 等脚本 |

---

## 8. 常见问题速查

| 现象 | 可能原因 | 处理方向 |
|------|----------|----------|
| 绿点但 **No tools** | 工具 schema 无效；子进程秒退；同名配置冲突 | 查 MCP Logs；删重复 MCP；确认 `run-mcp.cjs` 能手动跑 |
| MCP Logs 里 **TSError** | ts-node 编译 `server.ts` 失败 | 对齐 `zod/v4` 与回调参数类型；本地 `node run-mcp.cjs` 复现 |
| 工具调用返回一大段 IDL | 当前设计即如此 | 若要不返回 IDL 而直接 mock，需改工具实现 |
| `${workspaceFolder}` 不生效 | 未以仓库根打开工作区 | 用根目录打开项目或改用绝对路径 |

---

*文档根据本仓库接入 Cursor MCP 的排查与修改整理，便于团队复现与交接。*
