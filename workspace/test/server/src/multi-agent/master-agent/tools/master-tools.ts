import { spawn } from 'child_process';
import path from 'path';

// 任务列表管理
interface Todo {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
}

class TodoManager {
  private todos: Todo[] = [];

  addTodo(description: string): string {
    debugger
    const id = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const todo: Todo = {
      id,
      description,
      status: 'pending',
      createdAt: new Date()
    };
    this.todos.push(todo);
    return `任务已添加: ${description} (ID: ${id})`;
  }

  listTodos(): string {
    if (this.todos.length === 0) {
      return '当前没有任务';
    }
    return this.todos.map(todo => 
      `[${todo.status}] ${todo.description} (ID: ${todo.id})`
    ).join('\n');
  }

  updateTodoStatus(id: string, status: 'pending' | 'in_progress' | 'completed'): string {
    debugger 
    const todo = this.todos.find(t => t.id === id);
    if (!todo) {
      return `任务未找到: ${id}`;
    }
    todo.status = status;
    return `任务状态已更新: ${todo.description} -> ${status}`;
  }

  removeTodo(id: string): string {
    const index = this.todos.findIndex(t => t.id === id);
    if (index === -1) {
      return `任务未找到: ${id}`;
    }
    const todo = this.todos.splice(index, 1)[0];
    return `任务已删除: ${todo.description}`;
  }

  getAllTodos(): Todo[] {
    debugger
    return this.todos;
  }

  getPendingTodos(): Todo[] {
    return this.todos.filter(t => t.status !== 'completed');
  }

  isAllCompleted(): boolean {
    return this.todos.length > 0 && this.todos.every(t => t.status === 'completed');
  }
}

export const todoManager = new TodoManager();

// 调用子 Agent
export const callSubAgent = (agentType: string, task: string, agentDir: string): Promise<{ success: boolean, message: string, finished: boolean }> => {
  debugger
  return new Promise((resolve, reject) => {
    let scriptPath: string;
    
    switch (agentType) {
      case 'write-file':
        scriptPath = path.resolve(__dirname, '../../agents/write-file-agent/index.ts');
        break;
      case 'code-review':
        scriptPath = path.resolve(__dirname, '../../agents/code-review-agent/index.ts');
        break;
      default:
        resolve({ 
          success: false, 
          message: `未知的子 Agent 类型: ${agentType}`,
          finished: true 
        });
        return;
    }

    // 使用 ts-node 运行子 agent
    const child = spawn('node', [
      '-r', 'ts-node/register',
      scriptPath
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        AGENT_TASK: task,
        AGENT_DIR: agentDir
      }
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      process.stdout.write(dataStr);
    });

    child.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      process.stderr.write(dataStr);
    });

    child.on('close', (code) => {
      if (code === 0) {
        // 检查输出中是否包含 finish 信号
        const isFinished = output.includes('finish') || output.includes('FINISH');
        resolve({ 
          success: true, 
          message: `子 Agent (${agentType}) 执行完成\n输出: ${output}`,
          finished: isFinished 
        });
        //histroyMessageList: role tool, 内容是 完成xx
      } else {
        resolve({ 
          success: false, 
          message: `子 Agent (${agentType}) 执行失败\n错误: ${errorOutput}`,
          finished: true 
        });
      }
    });

    child.on('error', (error) => {
      resolve({ 
        success: false, 
        message: `启动子 Agent 失败: ${error.message}`,
        finished: true 
      });
    });
  });
};
