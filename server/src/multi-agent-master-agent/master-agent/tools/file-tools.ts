import fs from 'fs';
import path from 'path';

/**
 * 写入文件
 * @param filePath 文件路径
 * @param content 文件内容
 * @param agentDir 代理的工作目录
 */
export const writeFile = (filePath: string, content: string, agentDir: string) => {
  try {
    // 确保文件路径是相对于 agent 目录的
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(agentDir, filePath);
    
    // 确保目录存在
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(fullPath, content);
    return `文件 ${filePath} 写入成功`;
  } catch (error) {
    return `文件 ${filePath} 写入失败: ${error}`;
  }
};

/**
 * 读取文件
 * @param filePath 文件路径
 * @param agentDir 代理的工作目录
 */
export const readFile = (filePath: string, agentDir: string) => {
  try {
    // 确保文件路径是相对于 agent 目录的
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(agentDir, filePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return `文件 ${filePath} 不存在`;
    }
    
    // 读取文件
    const content = fs.readFileSync(fullPath, 'utf8');
    // return content;
  } catch (error) {
    return `文件 ${filePath} 读取失败: ${error}`;
  }
};
