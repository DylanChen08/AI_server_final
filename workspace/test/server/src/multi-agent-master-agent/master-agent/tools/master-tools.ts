import fs from 'fs';
import path from 'path';

/**
 * 创建一个文件夹
 * @param folderName 要创建的文件夹名称
 * @param agentDir 代理的工作目录
 */
export const createFolder = (folderName: string, agentDir: string) => {
  const folderPath = path.join(agentDir, folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
    return `文件夹 ${folderName} 创建成功`;
  } else {
    return `文件夹 ${folderName} 已存在`;
  }
};

/**
 * 列出当前目录下的文件和文件夹
 * @param agentDir 代理的工作目录
 */
export const listFiles = (agentDir: string) => {
  const files = fs.readdirSync(agentDir);
  return files.map(file => {
    const filePath = path.join(agentDir, file);
    const stats = fs.statSync(filePath);
    return `${file} (${stats.isDirectory() ? '目录' : '文件'})`;
  }).join('\n');
};

/**
 * 读取文件内容
 * @param fileName 要读取的文件名称
 * @param agentDir 代理的工作目录
 */
export const readFile = (fileName: string, agentDir: string) => {
  const filePath = path.join(agentDir, fileName);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  } else {
    return `文件 ${fileName} 不存在`;
  }
};
