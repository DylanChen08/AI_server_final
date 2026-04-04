import dotenv from 'dotenv';
import path from 'path';
import { createMasterAgent } from './master-agent';

// 与 master-agent 内 dotenv 一致；OpenAI 模块也会在 key.ts 中加载 .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  // 使用当前文件所在目录作为agent目录
  const agentDir = path.resolve(__dirname, 'master-agent');
  const masterAgent = createMasterAgent(agentDir);
  await masterAgent.start();
}

main().catch(console.error);
