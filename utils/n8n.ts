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
  // NOTA: Las datatables pueden no estar disponibles vía API pública de n8n
  // Están diseñadas para usarse dentro de workflows, no a través de la API
  async getDataTables(): Promise<DataTable[]> {
    try {
      // Intentar diferentes endpoints posibles (aunque probablemente no existan)
      const endpoints = [
        '/data-tables',
        '/dataTables',
        '/data_tables',
        '/tables'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint);
          // La respuesta de n8n puede venir en diferentes formatos
          if (response.data && Array.isArray(response.data)) {
            return response.data;
          } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
            return response.data.data;
          } else if (response.data && response.data.tables && Array.isArray(response.data.tables)) {
            return response.data.tables;
          }
        } catch (endpointError: any) {
          // Si es 404, este endpoint no existe, intentar el siguiente
          if (endpointError?.response?.status === 404) {
            continue;
          }
          // Si es otro error, loguearlo pero continuar
          console.log(`[N8N] Endpoint ${endpoint} falló:`, endpointError?.response?.status);
          continue;
        }
      }
      
      // Si todos los endpoints fallaron (404), las datatables no están disponibles vía API
      // Esto es normal - las datatables están diseñadas para workflows, no para API pública
      console.warn('[N8N] Las datatables no están disponibles vía API. Esto es normal - las datatables están diseñadas para usarse dentro de workflows de n8n, no a través de la API pública.');
      return [];
    } catch (error: any) {
      // Si es un 404, las datatables simplemente no están disponibles vía API (comportamiento esperado)
      if (error?.response?.status === 404) {
        console.warn('[N8N] Endpoint de datatables no encontrado (404). Las datatables no están expuestas en la API pública de n8n - esto es el comportamiento esperado.');
        return [];
      }
      
      // Si hay otro error, loguearlo
      console.error('Error obteniendo datatables de n8n:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url
      });
      return [];
    }
  }
};

