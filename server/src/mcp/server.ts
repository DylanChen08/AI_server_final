import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import * as fs from 'fs';
import * as path from 'path';

interface IDLField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface IDLInterface {
  name: string;
  description: string;
  fields: IDLField[];
}

interface IDLMethod {
  name: string;
  description: string;
  parameters: IDLField[];
  returns: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    interfaceRef?: string;
    itemType?: string;
  };
}

interface IDLDefinition {
  name: string;
  version: string;
  description: string;
  interfaces: IDLInterface[];
  methods: IDLMethod[];
}

const IDL_DIR = path.join(__dirname, 'idl');

function getIDLFilePath(apiUrl: string): string | null {
  const normalizedPath = apiUrl.replace(/^\//, '').replace(/\/$/, '');
  const idlFileName = normalizedPath.replace(/\//g, '-') + '.json';
  const idlFilePath = path.join(IDL_DIR, idlFileName);

  if (fs.existsSync(idlFilePath)) {
    return idlFilePath;
  }

  return null;
}

function loadIDL(apiUrl: string): IDLDefinition | null {
  const idlFilePath = getIDLFilePath(apiUrl);
  if (!idlFilePath) {
    return null;
  }

  try {
    const content = fs.readFileSync(idlFilePath, 'utf-8');
    return JSON.parse(content) as IDLDefinition;
  } catch (error) {
    console.error('Failed to load IDL file:', error);
    return null;
  }
}

function getIdlContent(apiUrl: string): unknown {
  const idl = loadIDL(apiUrl);
  if (!idl) {
    return {
      error: `No IDL definition found for API: ${apiUrl}`,
    };
  }

  return idl;
}

export async function createServer(): Promise<McpServer> {
  const mcp = new McpServer({
    name: 'a2ui-mock-idl',
    version: '1.0.0',
  });

  mcp.registerTool(
    'generate_mock',
    {
      description:
        '一个生成MOCK数据的工具，根据接口对应的IDL以及业务知识，生成可用的JSON格式的mock数据',
      inputSchema: z.object({
        apiUrl: z.string().describe('需要生成mock数据的接口URL路径'),
      }),
    },
    async (params: { apiUrl: string }) => {
      const { apiUrl } = params;
      const IDLContent = getIdlContent(apiUrl);
      const usedContent = `
                接口IDL定义如下：
                ${JSON.stringify(IDLContent, null, 2)}
                请按照IDL内容生成对应的mock数据
            `;

      return {
        content: [
          {
            type: 'text' as const,
            text: usedContent,
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  return mcp;
}
