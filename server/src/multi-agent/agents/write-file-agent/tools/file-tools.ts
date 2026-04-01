import fs from 'fs';
import path from 'path';

export const writeFile = (filePath: string, content: string, agentDir: string) => {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(agentDir, filePath);
    const dir = path.dirname(fullPath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    return `文件写入成功: ${fullPath}`;
  } catch (error) {
    return `文件写入失败: ${error}`;
  }
};
