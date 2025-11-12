import axios from 'axios';

const N8N_CONFIG = {
  url: process.env.N8N_URL || 'https://automation.zeroazul.com/',
  apiKey: process.env.N8N_API_KEY || ''
};

const api = axios.create({
  baseURL: '/api/n8n',
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  tags: any[];
}

export interface Execution {
  id: string;
  finished: boolean;
  stoppedAt: string;
  startedAt: string;
  createdAt?: string;
  workflowId: string;
  mode: string;
  retryOf: string | null;
  retrySuccessId: string | null;
  data?: any;
  status: string;
  deletedAt?: string | null;
  waitTill?: string | null;
}

export interface ExecutionsResponse {
  data: Execution[];
  nextCursor?: string;
}

export interface DataTable {
  id: string;
  name: string;
  columns: Array<{ name: string; type: string }>;
  rowCount?: number;
}

export const n8nAPI = {
  // Obtener todos los workflows
  async getWorkflows(): Promise<Workflow[]> {
    const response = await api.get('/workflows', {
      params: { limit: 200 }
    });
    return response.data.data;
  },

  // Obtener ejecuciones de un workflow (solo de hoy)
  async getExecutions(workflowId: string, limit: number = 20, cursor?: string): Promise<ExecutionsResponse> {
    const params: any = {
      workflowId,
      limit
    };
    
    if (cursor) {
      params.cursor = cursor;
    }
    
    const response = await api.get(`/executions`, { params });
    return response.data;
  },

  // Obtener una ejecución específica
  async getExecution(executionId: string): Promise<Execution> {
    const response = await api.get(`/executions/${executionId}`, {
      params: { includeData: true }
    });
    return response.data;
  },

  // Obtener todas las datatables de n8n
  async getDataTables(): Promise<DataTable[]> {
    try {
      const response = await api.get('/data-tables');
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error obteniendo datatables de n8n:', error);
      // Si la API no existe o hay error, retornar array vacío
      return [];
    }
  }
};

