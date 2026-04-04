import inquirer from 'inquirer';
import chalk from 'chalk';
import { generateResponse, functionRunner } from './openai';

const MAX_AGENT_STEPS = Math.max(
  1,
  Number.parseInt(process.env.AGENT_MAX_STEPS ?? '16', 10) || 16
);

export async function startTUI(
  systemPrompt: string = 'You are a helpful assistant.',
  tools: any = {},
  toolDescriptions: any[] = []
) {
  try {
    console.log(chalk.blue('===================================='));
    console.log(chalk.blue('=            LLM TUI Tool          ='));
    console.log(chalk.blue('===================================='));
    console.log(chalk.green('Welcome! Ask any question to LLM.'));
    console.log(chalk.green('Type "exit" to quit.'));
    console.log(chalk.blue('===================================='));

    const historyMessages: any[] = [];

    while (true) {
      const { question } = await inquirer.prompt([
        {
          type: 'input',
          name: 'question',
          message: chalk.yellow('You: '),
        },
      ]);

      const q = String(question ?? '').trim();
      if (q.toLowerCase() === 'exit') {
        console.log(chalk.blue('Goodbye!'));
        break;
      }

      historyMessages.push({
        role: 'user',
        content: question,
      });

      try {
        let hasToolCalls = true;
        let agentSteps = 0;

        while (hasToolCalls) {
          if (++agentSteps > MAX_AGENT_STEPS) {
            console.error(
              chalk.red(
                `已达到工具调用轮数上限（${MAX_AGENT_STEPS}），可在环境变量 AGENT_MAX_STEPS 中调整。`
              )
            );
            break;
          }

          const response = await generateResponse(
            historyMessages,
            systemPrompt,
            toolDescriptions
          );
          let content = '';
          const toolCalls: any[] = [];

          for await (const chunk of response) {
            if (chunk.choices[0].delta.content) {
              content += chunk.choices[0].delta.content;
              process.stdout.write(chunk.choices[0].delta.content);
            }

            const delta = chunk.choices[0].delta;

            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const existingCall = toolCalls.find((tc) => tc.index === toolCall.index);
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

          toolCalls.forEach((tc, i) => {
            if (!tc.id) tc.id = `auto_${agentSteps}_${i}`;
          });

          const hasTools = toolCalls.length > 0;
          const text = content.trim();

          if (text || hasTools) {
            const assistantMsg: Record<string, unknown> = { role: 'assistant' };
            if (text) {
              assistantMsg.content = content;
            } else if (hasTools) {
              assistantMsg.content = null;
            }
            if (hasTools) {
              assistantMsg.tool_calls = toolCalls.map((tc) => ({
                id: tc.id,
                type: tc.type ?? 'function',
                function: {
                  name: tc.function?.name ?? '',
                  arguments: tc.function?.arguments ?? '',
                },
              }));
            }
            historyMessages.push(assistantMsg);
          }

          if (hasTools) {
            const toolResults = await functionRunner(toolCalls, tools);
            const byId = new Map(
              toolResults.map((r) => [r.tool_call_id, r.result] as const)
            );

            for (const tc of toolCalls) {
              const id = tc.id ?? '';
              const payload =
                byId.get(id) ??
                JSON.stringify({
                  error: '未返回与该 tool_call_id 对应的工具结果',
                  tool_call_id: id,
                });
              historyMessages.push({
                role: 'tool',
                tool_call_id: id,
                content: payload,
              });
            }

            hasToolCalls = true;
          } else {
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

if (require.main === module) {
  startTUI().catch(console.error);
}
