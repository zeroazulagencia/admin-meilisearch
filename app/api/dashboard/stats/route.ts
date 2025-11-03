import { NextResponse } from 'next/server';
import { query } from '@/utils/db';
import { meilisearchAPI } from '@/utils/meilisearch';
import axios from 'axios';

const N8N_CONFIG = {
  url: 'https://automation.zeroazul.com/',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MTg1NjI0Yy1hNTRhLTQ4ZGItYTUwYS0wM2JjYzQ1MmY1ZjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzExNTQzfQ.RoRE5QTzrE-K_e0FKov5apD7We_9TN4eH2Wed72PCvA'
};

export async function GET() {
  try {
    // Obtener fecha de inicio del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfMonthISO = firstDayOfMonth.toISOString();

    // 1. Agentes por cliente
    const [agentsRows] = await query<any>('SELECT id, client_id, name FROM agents');
    const [clientsRows] = await query<any>('SELECT id, name FROM clients');
    
    const clientsMap = new Map(clientsRows.map((c: any) => [c.id, c.name]));
    const agentsByClientMap = new Map<string, number>();
    
    agentsRows.forEach((agent: any) => {
      const clientName = clientsMap.get(agent.client_id) || `Cliente ${agent.client_id}`;
      agentsByClientMap.set(clientName, (agentsByClientMap.get(clientName) || 0) + 1);
    });
    
    const agentsByClient = Array.from(agentsByClientMap.entries())
      .map(([clientName, count]) => ({ clientName, count }))
      .sort((a, b) => b.count - a.count);

    // 2. Ejecuciones por agente (este mes)
    const executionsByAgentMap = new Map<string, number>();
    const agentsMap = new Map(agentsRows.map((a: any) => [a.id, a]));
    
    try {
      // Obtener todos los workflows de n8n
      const workflowsResponse = await axios.get(`${N8N_CONFIG.url}api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': N8N_CONFIG.apiKey,
          'Content-Type': 'application/json'
        },
        params: { limit: 200 },
        timeout: 30000
      });
      
      const workflows = workflowsResponse.data.data || [];
      const workflowToAgentMap = new Map<string, number>();
      
      // Mapear workflows a agentes
      agentsRows.forEach((agent: any) => {
        let workflows: any = { workflowIds: [] };
        try {
          if (agent.workflows) {
            workflows = typeof agent.workflows === 'string' 
              ? JSON.parse(agent.workflows) 
              : agent.workflows;
          }
        } catch (e) {
          console.error(`Error parsing workflows for agent ${agent.id}:`, e);
        }
        
        if (Array.isArray(workflows.workflowIds)) {
          workflows.workflowIds.forEach((workflowId: string) => {
            workflowToAgentMap.set(workflowId, agent.id);
          });
        }
      });
      
      // Obtener ejecuciones de este mes para cada workflow
      for (const workflow of workflows) {
        const agentId = workflowToAgentMap.get(workflow.id);
        if (!agentId) continue;
        
        try {
          // Obtener ejecuciones con filtro de fecha (n8n API no soporta filtro directo, debemos obtenerlas todas y filtrar)
          const executionsResponse = await axios.get(`${N8N_CONFIG.url}api/v1/executions`, {
            headers: {
              'X-N8N-API-KEY': N8N_CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            params: {
              workflowId: workflow.id,
              limit: 1000 // Obtener muchas para poder filtrar por fecha
            },
            timeout: 30000
          });
          
          const executions = executionsResponse.data.data || [];
          
          // Filtrar ejecuciones de este mes
          const thisMonthExecutions = executions.filter((exec: any) => {
            const startedAt = exec.startedAt || exec.createdAt;
            if (!startedAt) return false;
            return new Date(startedAt) >= firstDayOfMonth;
          });
          
          const agent = agentsMap.get(agentId);
          if (agent) {
            const agentName = agent.name;
            executionsByAgentMap.set(
              agentName,
              (executionsByAgentMap.get(agentName) || 0) + thisMonthExecutions.length
            );
          }
        } catch (error: any) {
          console.error(`Error obteniendo ejecuciones para workflow ${workflow.id}:`, error.message);
          // Continuar con el siguiente workflow
        }
      }
    } catch (error: any) {
      console.error('Error obteniendo ejecuciones de n8n:', error.message);
      // Continuar sin datos de ejecuciones
    }
    
    const executionsByAgent = Array.from(executionsByAgentMap.entries())
      .map(([agentName, count]) => ({ agentName, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Top 5 índices de Meilisearch con más documentos
    let topIndexes: Array<{ indexUid: string; documentCount: number }> = [];
    
    try {
      const allIndexes = await meilisearchAPI.getIndexes();
      
      // Obtener stats de cada índice
      const indexesWithStats = await Promise.allSettled(
        allIndexes.map(async (index) => {
          try {
            const stats = await meilisearchAPI.getIndexStats(index.uid);
            return {
              indexUid: index.uid,
              documentCount: stats.numberOfDocuments || 0
            };
          } catch (error) {
            console.error(`Error obteniendo stats para índice ${index.uid}:`, error);
            return {
              indexUid: index.uid,
              documentCount: 0
            };
          }
        })
      );
      
      topIndexes = indexesWithStats
        .filter((result): result is PromiseFulfilledResult<{ indexUid: string; documentCount: number }> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value)
        .sort((a, b) => b.documentCount - a.documentCount)
        .slice(0, 5);
    } catch (error: any) {
      console.error('Error obteniendo índices de Meilisearch:', error.message);
      // Continuar sin datos de índices
    }

    return NextResponse.json({
      ok: true,
      agentsByClient,
      executionsByAgent,
      topIndexes
    });
  } catch (error: any) {
    console.error('Error en dashboard stats:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error desconocido' },
      { status: 500 }
    );
  }
}

