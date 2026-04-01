import dotenv from 'dotenv';
import path from 'path';
import { startTUI } from '../../openAI/tui';
import { systemPrompt } from './prompt';
import { todoManager, callSubAgent } from './tools';

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
      addTodo: (description: string) => todoManager.addTodo(description),
      listTodos: () => todoManager.listTodos(),
      updateTodoStatus: (id: string, status: 'pending' | 'in_progress' | 'completed') => todoManager.updateTodoStatus(id, status),
      removeTodo: (id: string) => todoManager.removeTodo(id),
      callSubAgent: (agentType: string, task: string) => callSubAgent(agentType, task, this.agentDir)
    };
    
    const toolDescriptions = [
      {
        type: 'function',
        function: {
          name: 'addTodo',
          description: '添加任务到任务列表',
          parameters: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: '任务描述',
              }
            },
            required: ['description'],
          },
        }
      },
      {
        type: 'function',
        function: {
          name: 'listTodos',
          description: '列出所有任务',
          parameters: {
            type: 'object',
            properties: {},
          },
        }
      },
      {
        type: 'function',
        function: {
          name: 'updateTodoStatus',
          description: '更新任务状态',
          parameters: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: '任务ID',
              },
              status: {
                type: 'string',
                description: '任务状态 (pending, in_progress, completed)',
                enum: ['pending', 'in_progress', 'completed']
              }
            },
            required: ['id', 'status'],
          },
        }
      },
      {
        type: 'function',
        function: {
          name: 'removeTodo',
          description: '删除任务',
          parameters: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: '任务ID',
              }
            },
            required: ['id'],
          },
        }
      },
      {
        type: 'function',
        function: {
          name: 'callSubAgent',
          description: '调用子 Agent 执行特定任务。可用类型: write-file (写文件), code-review (代码审查)',
          parameters: {
            type: 'object',
            properties: {
              agentType: {
                type: 'string',
                description: '子 Agent 类型 (write-file 或 code-review)',
                enum: ['write-file', 'code-review']
              },
              task: {
                type: 'string',
                description: '任务描述',
              },
              filePath: {
                type: 'string',
                description: '写入的文件和用于codereview的文件路径',
              },
            },
            required: ['agentType', 'task'],
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
