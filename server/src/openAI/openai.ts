import OpenAI from 'openai';
import { apiKey, activeLlmProvider, trimEnv } from './key';

function defaultBaseURL(): string {
  const explicit = trimEnv(process.env.OPENAI_BASE_URL);
  if (explicit) return explicit.replace(/\/$/, '');

  switch (activeLlmProvider()) {
    case 'dashscope':
      return 'https://coding.dashscope.aliyuncs.com/v1';
    case 'moonshot':
      return 'https://api.moonshot.cn/v1';
    case 'openai':
      return 'https://api.openai.com/v1';
    default:
      return 'https://coding.dashscope.aliyuncs.com/v1';
  }
}


function defaultModel(): string {
  const explicit = trimEnv(process.env.OPENAI_MODEL) || trimEnv(process.env.LLM_MODEL);
  if (explicit) return explicit;

  switch (activeLlmProvider()) {
    case 'dashscope':
      return 'qwen3.5-plus';
    case 'moonshot':
      return 'moonshot-v1-8k';
    case 'openai':
      return 'gpt-4o-mini';
    default:
      return 'qwen3.5-plus';
  }
}

const baseURL = defaultBaseURL();
const chatModel = defaultModel();

if (!apiKey) {
  throw new Error(
    '未设置 API Key：在 server/.env 中配置其一：DASHSCOPE_API_KEY、MOONSHOT_API_KEY（或 KIMI_API_KEY）、OPENAI_API_KEY；需要固定端点时可设 OPENAI_BASE_URL'
  );
}

// 初始化 OpenAI 客户端（key 在 ./key 中已从 server/.env 注入）
const openai = new OpenAI({
  apiKey,
  baseURL,
});

export const generateResponse = async (messages: any[], systemPrompt: string, tools: any[]) => {
  const response = await openai.chat.completions.create({
    model: chatModel,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    tools: tools,
    tool_choice: 'auto',
    stream: true,
  });
  return response;
};

export const functionRunner = async (toolCallInfo: any, tools: any = {}) => {
  if (!toolCallInfo || toolCallInfo.length === 0) {
    return [];
  }

  const results: { tool_call_id: string; result: string }[] = [];

  for (const toolCall of toolCallInfo) {
    const callId = toolCall.id ?? `call_${results.length}`;
    const functionCallObj = toolCall.function;
    if (!functionCallObj) {
      results.push({
        tool_call_id: callId,
        result: '错误：无效的工具调用（缺少 function）',
      });
      continue;
    }

    const { name } = functionCallObj;

    let used_arguments: any = {};
    try {
      used_arguments = JSON.parse(functionCallObj.arguments || '{}');
    } catch {
      results.push({
        tool_call_id: callId,
        result: '错误：工具参数不是合法 JSON',
      });
      continue;
    }

    let result: string;
    try {
      let out: any;
      if (tools[name]) {
        out = await tools[name](...Object.values(used_arguments));
      } else {
        out = `未知的工具: ${name}`;
      }
      if (typeof out === 'object' && out !== null) {
        out = JSON.stringify(out);
      }
      result = String(out);
    } catch (error) {
      result = `工具执行失败: ${error}`;
    }

    results.push({
      tool_call_id: callId,
      result,
    });
  }

  return results;
};
