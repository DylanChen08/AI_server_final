import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { apiKey } from './key';

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://coding.dashscope.aliyuncs.com/v1', //修改为你供应商的
});

export const generateResponse = async (messages: any[], systemPrompt: string, tools: any[]) => {
  const response = await openai.chat.completions.create({
    model: 'qwen3.5-plus',
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

export const functionRunner = async(toolCallInfo: any, tools: any = {}) => {
  if (!toolCallInfo || toolCallInfo.length === 0) {
    return [];
  }
  
  const results: any[] = [];
  
  for (const toolCall of toolCallInfo) {
    const functionCallObj = toolCall.function;
    if (!functionCallObj) {
      results.push({ tool_call_id: toolCall.id, error: 'Invalid function call' });
      continue;
    }
    
    const { name } = functionCallObj;

    let used_arguments: any = {};
    try {
      used_arguments = JSON.parse(functionCallObj.arguments || '{}');
    } catch (error) {
      results.push({ tool_call_id: toolCall.id, error: 'Invalid arguments' });
      continue;
    }
    
    let result: any;
    try {
      // 使用 agent 传入的工具
      if (tools[name]) {
        result = await tools[name](...Object.values(used_arguments));
      } else {
        result = `未知的工具: ${name}`;
      }
      
      // 确保结果是字符串
      if (typeof result === 'object') {
        result = JSON.stringify(result);
      }
    } catch (error) {
      result = `工具执行失败: ${error}`;
    }

    results.push({
      tool_call_id: toolCall.id,
      result: String(result)
    });
  }
  
  return results;
}
