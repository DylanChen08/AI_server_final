import dotenv from 'dotenv';
import path from 'path';

// 与 master-agent 等入口共用 server/.env（本文件相对 server/src/openAI）
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export function trimEnv(s: string | undefined): string {
  return (s ?? '').trim();
}

/** 与下方 apiKey 解析顺序一致，供 openai.ts 推断默认 baseURL / 模型 */
export type LlmProviderTag = 'dashscope' | 'moonshot' | 'openai' | 'none';

export function activeLlmProvider(): LlmProviderTag {
  if (trimEnv(process.env.DASHSCOPE_API_KEY)) return 'dashscope';
  if (
    trimEnv(process.env.MOONSHOT_API_KEY) ||
    trimEnv(process.env.KIMI_API_KEY)
  ) {
    return 'moonshot';
  }
  if (trimEnv(process.env.OPENAI_API_KEY)) return 'openai';
  return 'none';
}

/**
 * 密钥优先级：
 * DashScope（千问）→ Kimi / Moonshot → OpenAI 官方。
 * 也可用 OPENAI_BASE_URL 显式指定端点，此时仍须配置对应供应商的 Key（上述其一）。
 */
export const apiKey = (
  process.env.DASHSCOPE_API_KEY ??
  process.env.MOONSHOT_API_KEY ??
  process.env.KIMI_API_KEY ??
  process.env.OPENAI_API_KEY ??
  ''
).trim();
