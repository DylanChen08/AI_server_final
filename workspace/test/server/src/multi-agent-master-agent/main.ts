import { createMasterAgent } from './master-agent';
import path from 'path';

async function main() {
  // 使用当前文件所在目录作为agent目录
  const agentDir = path.resolve(__dirname, 'master-agent');
  const masterAgent = createMasterAgent(agentDir);
  await masterAgent.start();
}

main().catch(console.error);
