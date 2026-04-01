import fs from 'fs';
import path from 'path';

export const readFile = (filePath: string, agentDir: string) => {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(agentDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return `文件不存在: ${fullPath}`;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content;
  } catch (error) {
    return `文件读取失败: ${error}`;
  }
};
