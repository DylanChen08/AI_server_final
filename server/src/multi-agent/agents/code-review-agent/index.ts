import dotenv from 'dotenv';
import path from 'path';
import { generateResponse } from '../../../openAI/openai';
import { functionRunner } from '../../../openAI/openai';
import { systemPrompt } from './prompt';
import { readFile } from './tools';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export class CodeReviewAgent {
  private agentDir: string;
  private systemPrompt: string;
  private tools: any;
  private toolDescriptions: any[];

  constructor(agentDir: string) {
    this.agentDir = agentDir;
    console.log(`CodeReview Agent initialized with working directory: ${this.agentDir}`);
    
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
      readFile: (filePath: string) => readFile(filePath, this.agentDir)
    };
    
    const toolDescriptions = [
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

  async executeTask(task: string): Promise<string> {
    console.log(`\n🚀 CodeReview Agent 开始执行任务`);
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
        console.log(`\n📡 第 ${iteration} 轮调用 LLM 生成响应...`);
        const response = await generateResponse(messages, this.systemPrompt, this.toolDescriptions);
        let content = '';
        let toolCalls: any[] = [];
        
        console.log(`📥 开始接收 LLM 响应流...`);
        let hasLoggedToolCall = false;
        for await (const chunk of response) {
          if (chunk.choices[0].delta.content) {
            content += chunk.choices[0].delta.content;
            process.stdout.write(chunk.choices[0].delta.content);
          }
          
          const delta = chunk.choices[0].delta;
          if (delta?.tool_calls) {
            if (!hasLoggedToolCall) {
              console.log(`\n🔧 检测到工具调用请求`);
              hasLoggedToolCall = true;
            }
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
          console.log(`\n🔧 准备执行 ${toolCalls.length} 个工具调用`);
          toolCalls.forEach((tc, idx) => {
            console.log(`   工具 ${idx + 1}: ${tc.function.name}`);
          });
          
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
          
          console.log(`\n⚙️  开始执行工具...`);
          // 执行工具调用
          const toolResults = await functionRunner(toolCalls, this.tools);
          
          console.log(`\n📊 工具执行结果: ${toolResults.length} 个结果`);
          // 为每个工具调用添加 tool 消息
          if (toolResults && toolResults.length > 0) {
            toolResults.forEach((resultItem, idx) => {
              console.log(`   结果 ${idx + 1}: ${resultItem.result.substring(0, 100)}${resultItem.result.length > 100 ? '...' : ''}`);
              messages.push({
                role: 'tool',
                tool_call_id: resultItem.tool_call_id,
                content: resultItem.result
              });
            });
          }
          
          console.log(`\n🔄 工具执行完成，继续下一轮...`);
          // 继续循环，处理可能的后续工具调用
          hasMoreToolCalls = true;
        } else {
          // 没有工具调用，结束循环
          hasMoreToolCalls = false;
          console.log(`\n✅ 任务执行完成，没有更多工具调用`);
        }
      }

      if (iteration >= maxIterations) {
        console.log(`\n⚠️ 达到最大迭代次数 (${maxIterations})，强制结束任务`);
      }
      
      return 'finish';
    } catch (error) {
      console.error(`\n❌ CodeReview Agent 执行任务失败:`, error);
      return `任务执行失败: ${error}`;
    }
  }
  
  async start() {
    console.log('\n========================================');
    console.log('🚀 CodeReview Agent 启动');
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
      console.log('❌ CodeReview Agent 不支持交互模式，请通过环境变量 AGENT_TASK 传入任务');
      process.exit(1);
    }
  }
}

export const createCodeReviewAgent = (agentDir: string) => new CodeReviewAgent(agentDir);

// 如果直接运行此文件
if (require.main === module) {
  const agentDir = process.env.AGENT_DIR || process.cwd();
  const agent = new CodeReviewAgent(agentDir);
  agent.start().catch(console.error);
}
