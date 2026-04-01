import dotenv from 'dotenv';
import path from 'path';
import { startTUI } from '../../openAI/tui';
import { systemPrompt } from './prompt';
import { writeFile, readFile } from './tools';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export class MasterAgent {
  private agentDir: string;
  private systemPrompt: string;
  private tools: any;
  private toolDescriptions: any[];

  constructor(agentDir: string) {
    this.agentDir = agentDir;
    console.log(`Master Agent initialized with working directory: ${this.agentDir}`);
    
    // 使用导入的系统提示词
    this.systemPrompt = systemPrompt;
    console.log('System prompt loaded successfully');
    
    // 加载工具
    const { tools, toolDescriptions } = this.loadTools();
    this.tools = tools;
    this.toolDescriptions = toolDescriptions;
    console.log('Tools loaded successfully');
  }
  
  private loadTools(): { tools: any, toolDescriptions: any[] } {
    const tools = {
      writeFile: (filePath: string, content: string) => writeFile(filePath, content, this.agentDir),
      readFile: (filePath: string) => readFile(filePath, this.agentDir)
    };
    
    const toolDescriptions = [
      {
        type: 'function',
        function: {
          name: 'writeFile',
          description: '写入文件内容',
          parameters: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: '文件路径',
              },
              content: {
                type: 'string',
                description: '文件内容',
              }
            },
            required: ['filePath', 'content'],
          },
        }
      },
      {
        type: 'function',
        function: {
          name: 'readFile',
          description: '读取文件内容',
          parameters: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: '文件路径',
              }
            },
            required: ['filePath'],
          },
        }
      }
    ];
    
    return { tools, toolDescriptions };
  }
  
  async start() {
    console.log('Master Agent started successfully');
    await startTUI(this.systemPrompt, this.tools, this.toolDescriptions);
  }
}

export const createMasterAgent = (agentDir: string) => new MasterAgent(agentDir);
