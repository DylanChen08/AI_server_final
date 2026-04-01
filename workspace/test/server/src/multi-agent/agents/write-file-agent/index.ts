import dotenv from 'dotenv';
import path from 'path';
import { generateResponse } from '../../../openAI/openai';
import { functionRunner } from '../../../openAI/openai';
import { systemPrompt } from './prompt';
import { writeFile } from './tools';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export class WriteFileAgent {
  private agentDir: string;
  private systemPrompt: string;
  private tools: any;
  private toolDescriptions: any[];

  constructor(agentDir: string) {
    this.agentDir = agentDir;
    console.log(`WriteFile Agent initialized with working directory: ${this.agentDir}`);

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
      writeFile: (filePath: string, content: string) => writeFile(filePath, content, this.agentDir)
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
      }
    ];

    return { tools, toolDescriptions };
  }

  async executeTask(task: string): Promise<string> {
    console.log(`\n🚀 WriteFile Agent 开始执行任务`);
    console.log(`📝 任务内容: ${task}`);
    console.log(`🔧 可用工具: ${this.toolDescriptions.map(t => t.function.name).join(', ')}`);

    const messages: any[] = [{
      role: 'user',
      content: task
    }];

    try {
      // 使用循环处理工具调用，直到没有更多工具调用
      let hasMoreToolCalls = true;
      let iteration = 0;
      const maxIterations = 10; // 防止无限循环

      while (hasMoreToolCalls && iteration < maxIterations) {
        iteration++;
        const response = await generateResponse(messages, this.systemPrompt, this.toolDescriptions);
        let content = '';
        let toolCalls: any[] = [];

        for await (const chunk of response) {
          if (chunk.choices[0].delta.content) {
            content += chunk.choices[0].delta.content;
            process.stdout.write(chunk.choices[0].delta.content);
          }

          const delta = chunk.choices[0].delta;
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const existingCall = toolCalls.find(tc => tc.index === toolCall.index);
              if (existingCall) {
                if (toolCall.function?.arguments) {
                  if (!existingCall.function) {
                    existingCall.function = {};
                  }
                  if (existingCall.function.arguments) {
                    existingCall.function.arguments += toolCall.function.arguments;
                  } else {
                    existingCall.function.arguments = toolCall.function.arguments;
                  }
                }
                if (toolCall.function?.name) {
                  if (!existingCall.function) {
                    existingCall.function = {};
                  }
                  existingCall.function.name = toolCall.function.name;
                }
                if (toolCall.id) {
                  existingCall.id = toolCall.id;
                }
                if (toolCall.type) {
                  existingCall.type = toolCall.type;
                }
              } else {
                toolCalls.push(toolCall);
              }
            }
          }
        }

        // 将 assistant 的响应添加到历史消息
        if (content) {
          messages.push({
            role: 'assistant',
            content: content
          });
        }

        // 检查是否有工具调用
        if (toolCalls && toolCalls.length > 0) {
          messages.push({
            role: 'assistant',
            tool_calls: toolCalls.map(tc => ({
              id: tc.id,
              type: tc.type,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments
              }
            }))
          });

          // 执行工具调用
          const toolResults = await functionRunner(toolCalls, this.tools);

          // 为每个工具调用添加 tool 消息
          if (toolResults && toolResults.length > 0) {
            toolResults.forEach((resultItem, idx) => {
              messages.push({
                role: 'tool',
                tool_call_id: resultItem.tool_call_id,
                content: resultItem.result
              });
            });
          }

          // 继续循环，处理可能的后续工具调用
          hasMoreToolCalls = true;
        } else {
          // 没有工具调用，结束循环
          hasMoreToolCalls = false;
        }
      }

      if (iteration >= maxIterations) {
        console.log(`\n⚠️ 达到最大迭代次数 (${maxIterations})，强制结束任务`);
      }

      return 'finish';
    } catch (error) {
      console.error(`\n❌ WriteFile Agent 执行任务失败:`, error);
      return `任务执行失败: ${error}`;
    }
  }

  async start() {
    console.log('\n========================================');
    console.log('🚀 WriteFile Agent 启动');
    console.log('========================================');

    // 检查是否通过环境变量接收任务
    const task = process.env.AGENT_TASK;
    if (task) {
      console.log(`\n📥 收到任务: ${task}`);
      console.log(`📂 工作目录: ${this.agentDir}`);
      console.log(`🔧 已加载工具: ${Object.keys(this.tools).join(', ')}`);

      // 执行任务模式
      const result = await this.executeTask(task);
      console.log(`\n========================================`);
      console.log(`📤 任务执行结果: ${result}`);
      console.log('========================================\n');
      process.exit(0);
    } else {
      // 交互模式（暂不支持）
      console.log('❌ WriteFile Agent 不支持交互模式，请通过环境变量 AGENT_TASK 传入任务');
      process.exit(1);
    }
  }
}

export const createWriteFileAgent = (agentDir: string) => new WriteFileAgent(agentDir);

// 如果直接运行此文件
if (require.main === module) {
  const agentDir = process.env.AGENT_DIR || process.cwd();
  const agent = new WriteFileAgent(agentDir);
  agent.start().catch(console.error);
}
