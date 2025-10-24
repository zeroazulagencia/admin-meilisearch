import axios from 'axios';

const N8N_CONFIG = {
  url: 'https://automation.zeroazul.com/',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MTg1NjI0Yy1hNTRhLTQ4ZGItYTUwYS0wM2JjYzQ1MmY1ZjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzExNTQzfQ.RoRE5QTzrE-K_e0FKov5apD7We_9TN4eH2Wed72PCvA'
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
  }
};

