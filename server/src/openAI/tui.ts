import dotenv from 'dotenv';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { generateResponse } from './openai';
import { functionRunner } from './openai';


export async function startTUI(systemPrompt: string = 'You are a helpful assistant.', tools: any = {}, toolDescriptions: any[] = []) {

  try {
    console.log(chalk.blue('===================================='));
    console.log(chalk.blue('=            LLM TUI Tool          ='));
    console.log(chalk.blue('===================================='));
    console.log(chalk.green('Welcome! Ask any question to LLM.'));
    console.log(chalk.green('Type "exit" to quit.'));
    console.log(chalk.blue('===================================='));
    
    let historyMessages: any[] = [];

    while (true) {
      const { question } = await inquirer.prompt([
        {
          type: 'input',
          name: 'question',
          message: chalk.yellow('You: ')
        }
      ]);
      historyMessages.push({
        role: 'user',
        content: question,
      });

      if (question.toLowerCase() === 'exit') {
        console.log(chalk.blue('Goodbye!'));
        break;
      }

      try {
        // agent loop：持续处理工具调用直到没有新的工具调用
        let hasToolCalls = true;
        let assistantContent = '';
        
        while (hasToolCalls) {
          const response = await generateResponse(historyMessages, systemPrompt, toolDescriptions);
          let content = '';
          let toolCalls: any[] = [];
          
          for await (const chunk of response) {
            if (chunk.choices[0].delta.content) {
              content += chunk.choices[0].delta.content;
              assistantContent += chunk.choices[0].delta.content;
              process.stdout.write(chunk.choices[0].delta.content);
            }
            
            const delta = chunk.choices[0].delta;

            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const existingCall = toolCalls.find(tc => tc.index === toolCall.index);
                if (existingCall) {
                  // 累积 function.arguments
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
                  // 累积其他属性
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
                  // 添加新工具调用
                  toolCalls.push(toolCall);
                }
              }
            }
          }
          
          // 将 assistant 的响应添加到历史消息
          if (content) {
            historyMessages.push({
              role: 'assistant',
              content: content
            });
          }
          
          // 将工具调用添加到历史消息
          if (toolCalls && toolCalls.length > 0) {
            
            // 将工具调用添加到历史消息
            historyMessages.push({
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
            const toolResults = await functionRunner(toolCalls, tools);
            
            // 为每个工具调用添加 tool 消息（重要：必须为每个 tool_call_id 都添加响应）
            if (toolResults && toolResults.length > 0) {
              toolResults.forEach((resultItem) => {
                historyMessages.push({
                  role: 'tool',
                  tool_call_id: resultItem.tool_call_id,
                  content: resultItem.result
                });
              });
            }
            
            // 继续循环，因为还有工具调用
            hasToolCalls = true;
          } else {
            // 没有工具调用，结束循环
            hasToolCalls = false;
          }
        }
      } catch (error) {
        console.error(chalk.red('Error generating response:'), error);
      }

      console.log(chalk.blue('\n'));
      console.log(chalk.cyan('LLM: '));  
      console.log(chalk.blue('===================================='));
    }
  } catch (error) {
    console.error(chalk.red('Error starting TUI:'), error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  startTUI().catch(console.error);
}
