'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { meilisearchAPI } from '@/utils/meilisearch';
import { n8nAPI, Execution } from '@/utils/n8n';
import ProtectedLayout from '@/components/ProtectedLayout';
import { getPermissions, getUserId } from '@/utils/permissions';
import { useRouter } from 'next/navigation';

interface ErrorExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  startedAt: string;
  agentName: string;
  agentId: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    clients: 0,
    agents: 0,
    conversations: 0
  });
  const [loading, setLoading] = useState(true);
  const [hasDashboardAccess, setHasDashboardAccess] = useState<boolean | null>(null);
  const [errorExecutions, setErrorExecutions] = useState<ErrorExecution[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [reviewedErrors, setReviewedErrors] = useState<Set<string>>(new Set());
  const [markingAsReviewed, setMarkingAsReviewed] = useState<Set<string>>(new Set());
  const [justReviewed, setJustReviewed] = useState<Set<string>>(new Set());
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [loadingExecutionDetails, setLoadingExecutionDetails] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [aiExplanations, setAiExplanations] = useState<Map<string, string>>(new Map());
  const [loadingAI, setLoadingAI] = useState<string | null>(null);

  useEffect(() => {
    // Verificar permisos del usuario de forma síncrona
    const checkPermissions = () => {
      const permissions = getPermissions();
      console.log('[DASHBOARD] Permisos del usuario:', permissions);
      console.log('[DASHBOARD] Permisos completos (JSON):', JSON.stringify(permissions, null, 2));
      
      if (!permissions) {
        console.log('[DASHBOARD] No hay permisos, denegando acceso');
        setHasDashboardAccess(false);
        setLoading(false);
        return;
      }

      // Admin siempre tiene acceso
      if (permissions.type === 'admin') {
        console.log('[DASHBOARD] Usuario es admin, permitiendo acceso');
        setHasDashboardAccess(true);
        return;
      }

      // Verificar si tiene permisos de dashboard (viewOwn o viewAll)
      const dashboardPerms = permissions.dashboard;
      console.log('[DASHBOARD] Permisos de dashboard:', dashboardPerms);
      console.log('[DASHBOARD] dashboardPerms type:', typeof dashboardPerms);
      console.log('[DASHBOARD] dashboardPerms keys:', dashboardPerms ? Object.keys(dashboardPerms) : 'null');
      
      if (!dashboardPerms) {
        console.log('[DASHBOARD] No hay permisos de dashboard, denegando acceso');
        setHasDashboardAccess(false);
        setLoading(false);
        return;
      }

      // Verificar explícitamente si viewOwn o viewAll son true
      const viewOwn = dashboardPerms.viewOwn === true;
      const viewAll = dashboardPerms.viewAll === true;
      const hasAccess = viewOwn || viewAll;
      
      console.log('[DASHBOARD] Verificación detallada:');
      console.log('[DASHBOARD] - viewOwn:', dashboardPerms.viewOwn, 'es true?', viewOwn);
      console.log('[DASHBOARD] - viewAll:', dashboardPerms.viewAll, 'es true?', viewAll);
      console.log('[DASHBOARD] - hasAccess:', hasAccess);
      
      setHasDashboardAccess(hasAccess);
      if (!hasAccess) {
        console.log('[DASHBOARD] Acceso denegado, deteniendo loading');
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    // Solo cargar estadísticas si tiene acceso confirmado
    if (hasDashboardAccess === true) {
      const loadStats = async () => {
        try {
          console.log('[DASHBOARD] Cargando estadísticas...');
          const permissions = getPermissions();
          const isClient = permissions?.type === 'client';
          
          if (isClient) {
            // Para clientes: cargar solo sus agentes
            const userId = getUserId();
            if (userId) {
              const agentsRes = await fetch('/api/agents');
              const agentsData = await agentsRes.json();
              
              if (agentsData.ok && agentsData.agents) {
                const clientAgents = agentsData.agents.filter((a: any) => a.client_id === parseInt(userId));
                setStats({
                  clients: 0,
                  agents: clientAgents.length,
                  conversations: 0
                });
              } else {
                setStats({
                  clients: 0,
                  agents: 0,
                  conversations: 0
                });
              }
            } else {
              setStats({
                clients: 0,
                agents: 0,
                conversations: 0
              });
            }
          } else {
            // Para admin: cargar todas las estadísticas
            const [clientsRes, agentsRes] = await Promise.all([
              fetch('/api/clients'),
              fetch('/api/agents')
            ]);
            
            const clientsData = await clientsRes.json();
            const agentsData = await agentsRes.json();
            
            // Cargar total de conversaciones desde Meilisearch
            let conversations = 0;
            try {
              const stats = await meilisearchAPI.getIndexStats('bd_conversations_dworkers');
              conversations = stats.numberOfDocuments || 0;
            } catch (err) {
              console.error('Error loading conversations stats:', err);
            }
            
            setStats({
              clients: clientsData.ok ? clientsData.clients.length : 0,
              agents: agentsData.ok ? agentsData.agents.length : 0,
              conversations
            });
          }
        } catch (err) {
          console.error('Error loading stats:', err);
        } finally {
          setLoading(false);
        }
      };
      
      loadStats();
      loadRecentErrors();
    } else if (hasDashboardAccess === false) {
      // Si no tiene acceso, asegurarse de que loading sea false
      setLoading(false);
    }
  }, [hasDashboardAccess]);

  const loadRecentErrors = async () => {
    try {
      setLoadingErrors(true);
      console.log('[DASHBOARD] Cargando ejecuciones con error...');
      
      // Cargar errores revisados primero
      let reviewedSet = new Set<string>();
      try {
        const reviewedRes = await fetch('/api/reviewed-errors');
        const reviewedData = await reviewedRes.json();
        if (reviewedData.ok && reviewedData.reviewedErrors) {
          reviewedSet = new Set(reviewedData.reviewedErrors.map((r: any) => r.execution_id));
          setReviewedErrors(reviewedSet);
          console.log('[DASHBOARD] Errores revisados cargados:', reviewedSet.size);
        }
      } catch (e) {
        console.error('[DASHBOARD] Error cargando errores revisados:', e);
      }
      
      // Obtener todos los agentes
      const agentsRes = await fetch('/api/agents');
      const agentsData = await agentsRes.json();
      
      if (!agentsData.ok || !agentsData.agents) {
        console.error('[DASHBOARD] No se pudieron cargar los agentes');
        setErrorExecutions([]);
        return;
      }
      
      const agents = agentsData.agents;
      
      // Crear mapa de workflowId -> agente
      const workflowToAgentMap = new Map<string, { id: number; name: string }>();
      
      agents.forEach((agent: any) => {
        let workflows: any = { workflowIds: [] };
        try {
          if (agent.workflows) {
            if (typeof agent.workflows === 'string') {
              workflows = JSON.parse(agent.workflows);
            } else if (typeof agent.workflows === 'object') {
              workflows = agent.workflows;
            }
          }
        } catch (e) {
          console.error(`[DASHBOARD] Error parsing workflows for agent ${agent.id}:`, e);
          workflows = { workflowIds: [] };
        }
        
        if (workflows && Array.isArray(workflows.workflowIds)) {
          workflows.workflowIds.forEach((workflowId: string) => {
            workflowToAgentMap.set(workflowId, { id: agent.id, name: agent.name });
          });
        }
      });
      
      console.log('[DASHBOARD] Workflows relacionados a agentes:', workflowToAgentMap.size);
      console.log('[DASHBOARD] Total de workflows a revisar:', Array.from(workflowToAgentMap.entries()).length);
      
      // Obtener nombres de workflows
      const allWorkflows = await n8nAPI.getWorkflows();
      const workflowNameMap = new Map<string, string>();
      allWorkflows.forEach((wf: any) => {
        workflowNameMap.set(wf.id, wf.name);
      });
      
      // Obtener las últimas 3 ejecuciones de cada workflow y filtrar solo las que tienen error
      const allErrorExecutions: Array<Execution & { agentName: string; agentId: number; workflowName?: string }> = [];
      let totalWorkflowsChecked = 0;
      let totalExecutionsChecked = 0;
      
      for (const [workflowId, agentInfo] of Array.from(workflowToAgentMap.entries())) {
        try {
          totalWorkflowsChecked++;
          // Obtener más ejecuciones (100) para asegurar que encontramos las últimas 3 con error
          // ya que pueden haber muchas ejecuciones exitosas entre errores
          const executionsResponse = await n8nAPI.getExecutions(workflowId, 100);
          const allExecutions = executionsResponse.data || [];
          totalExecutionsChecked += allExecutions.length;
          
          // Filtrar solo las que tienen error y tomar las últimas 3
          const errorExecs = allExecutions
            .filter((exec: Execution) => exec.status === 'error')
            .slice(0, 3) // Tomar solo las últimas 3 con error
            .map((exec: Execution) => ({
              ...exec,
              agentName: agentInfo.name,
              agentId: agentInfo.id,
              workflowName: workflowNameMap.get(workflowId) || workflowId
            }));
          
          allErrorExecutions.push(...errorExecs);
          console.log(`[DASHBOARD] Workflow ${workflowId} (Agente: ${agentInfo.name}): ${allExecutions.length} ejecuciones revisadas, ${errorExecs.length} con error (últimas 3)`);
        } catch (err) {
          console.error(`[DASHBOARD] Error obteniendo ejecuciones para workflow ${workflowId}:`, err);
        }
      }
      
      console.log(`[DASHBOARD] Resumen: ${totalWorkflowsChecked} workflows revisados, ${totalExecutionsChecked} ejecuciones totales revisadas, ${allErrorExecutions.length} errores encontrados`);
      
      // Ordenar por fecha (más recientes primero) - SIN límite, mostrar TODAS
      const sortedErrors = allErrorExecutions
        .sort((a, b) => {
          const dateA = new Date(a.startedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.startedAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        })
        .map(exec => ({
          id: exec.id,
          workflowId: exec.workflowId,
          workflowName: exec.workflowName,
          startedAt: exec.startedAt || exec.createdAt || '',
          agentName: exec.agentName,
          agentId: exec.agentId
        }));
      
      // Filtrar errores ya revisados (solo en dashboard, no en ejecuciones)
      const unreviewedErrors = sortedErrors.filter(exec => !reviewedSet.has(exec.id));
      
      console.log('[DASHBOARD] Errores encontrados (ordenados por fecha):', sortedErrors.length, 'errores totales,', unreviewedErrors.length, 'sin revisar (filtrados:', sortedErrors.length - unreviewedErrors.length, 'ya revisados)');
      setErrorExecutions(unreviewedErrors);
    } catch (err) {
      console.error('[DASHBOARD] Error cargando ejecuciones con error:', err);
      setErrorExecutions([]);
    } finally {
      setLoadingErrors(false);
    }
  };

  const handleViewExecution = async (executionId: string) => {
    try {
      setLoadingExecutionDetails(executionId);
      const exec = await n8nAPI.getExecution(executionId);
      setSelectedExecution(exec);
      setAiExplanations(new Map()); // Limpiar todas las explicaciones
      setExpandedNodes(new Set()); // Limpiar nodos expandidos
    } catch (err) {
      console.error('[DASHBOARD] Error loading execution:', err);
    } finally {
      setLoadingExecutionDetails(null);
    }
  };

  const toggleNodeExpansion = (nodeName: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeName)) {
        newSet.delete(nodeName);
      } else {
        newSet.add(nodeName);
      }
      return newSet;
    });
  };

  const handleExplainWithAI = async (data: any, nodeName: string, isError: boolean = false) => {
    try {
      setLoadingAI(nodeName);
      const response = await fetch('/api/openai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: data,
          nodeName: nodeName,
          isError: isError
        })
      });
      const result = await response.json();
      
      // Guardar la explicación específica para este nodo
      const newExplanations = new Map(aiExplanations);
      newExplanations.set(nodeName, result.explanation);
      setAiExplanations(newExplanations);
    } catch (err) {
      console.error('[DASHBOARD] Error explaining with AI:', err);
      const newExplanations = new Map(aiExplanations);
      newExplanations.set(nodeName, 'Error al obtener explicación de IA');
      setAiExplanations(newExplanations);
    } finally {
      setLoadingAI(null);
    }
  };

  const renderJSON = (obj: any): React.ReactNode => {
    if (obj === null || obj === undefined) {
      return <span className="text-gray-400">null</span>;
    }
    
    if (typeof obj === 'string') {
      return <span className="text-gray-800">{obj}</span>;
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return <span className="text-blue-600">{String(obj)}</span>;
    }
    
    if (Array.isArray(obj)) {
      return (
        <div className="ml-4">
          {obj.map((item, idx) => (
            <div key={idx} className="mb-1">
              <span className="text-gray-500">[{idx}]</span> {renderJSON(item)}
            </div>
          ))}
        </div>
      );
    }
    
    if (typeof obj === 'object') {
      return (
        <div className="ml-4">
          {Object.entries(obj).map(([key, value]) => (
            <div key={key} className="mb-1">
              <span className="text-purple-600 font-medium">{key}:</span> {renderJSON(value)}
            </div>
          ))}
        </div>
      );
    }
    
    return <span>{String(obj)}</span>;
  };

  const handleMarkAsReviewed = async (executionId: string, workflowId: string, agentId: number) => {
    if (markingAsReviewed.has(executionId)) return;
    
    try {
      setMarkingAsReviewed(prev => new Set(prev).add(executionId));
      
      const res = await fetch('/api/reviewed-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId, workflowId, agentId })
      });
      
      const data = await res.json();
      
      if (data.ok) {
        // Actualizar estado local
        setReviewedErrors(prev => new Set(prev).add(executionId));
        // Mostrar check temporalmente antes de remover
        setJustReviewed(prev => new Set(prev).add(executionId));
        // Remover de la lista después de 2 segundos para mostrar el check
        setTimeout(() => {
          setErrorExecutions(prev => prev.filter(e => e.id !== executionId));
          setJustReviewed(prev => {
            const newSet = new Set(prev);
            newSet.delete(executionId);
            return newSet;
          });
        }, 2000);
        console.log('[DASHBOARD] Error marcado como revisado:', executionId);
      } else {
        console.error('[DASHBOARD] Error marcando como revisado:', data.error);
      }
    } catch (err) {
      console.error('[DASHBOARD] Error marcando como revisado:', err);
    } finally {
      setMarkingAsReviewed(prev => {
        const newSet = new Set(prev);
        newSet.delete(executionId);
        return newSet;
      });
    }
  };

  // Mostrar loading solo si aún no se ha verificado el acceso
  if (loading || hasDashboardAccess === null) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
        </div>
      </ProtectedLayout>
    );
  }

  // Verificar si es cliente
  const permissions = getPermissions();
  const isClient = permissions?.type === 'client';

  // Si no tiene acceso al dashboard, mostrar mensaje
  if (hasDashboardAccess === false) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-md">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sin permisos</h2>
            <p className="text-gray-600">No tienes permisos para ver contenido</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  // Si es cliente, mostrar solo cantidad de agentes
  if (isClient) {
    return (
      <ProtectedLayout>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        
        {/* Estadísticas para cliente */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Agentes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.agents}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4" style={{ borderLeftColor: '#5DE1E5' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.clients}</p>
                </div>
                <div className="rounded-full p-3" style={{ backgroundColor: 'rgba(93, 225, 229, 0.1)' }}>
                  <svg className="w-8 h-8" style={{ color: '#5DE1E5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Agentes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.agents}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Conversaciones</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.conversations.toLocaleString()}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

      {/* Sección de Errores Recientes */}
      {!isClient && (
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Errores Recientes</h2>
              {errorExecutions.length > 0 && (
                <span className="text-sm text-gray-500">
                  Errores en las últimas 3 ejecuciones de cada workflow ({errorExecutions.length} {errorExecutions.length === 1 ? 'error encontrado' : 'errores encontrados'})
                </span>
              )}
            </div>
            
            {loadingErrors ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
              </div>
            ) : errorExecutions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">No hay errores recientes</p>
                <p className="text-sm mt-1">Todas las ejecuciones están funcionando correctamente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {errorExecutions.map((exec) => (
                  <div
                    key={exec.id}
                    className="border border-red-200 bg-red-50 rounded-lg p-4 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Error
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            Agente: {exec.agentName}
                          </span>
                          {exec.workflowName && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm font-medium text-gray-700">
                                Flujo: {exec.workflowName}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {exec.startedAt ? new Date(exec.startedAt).toLocaleString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Fecha no disponible'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkAsReviewed(exec.id, exec.workflowId, exec.agentId)}
                          disabled={markingAsReviewed.has(exec.id) || justReviewed.has(exec.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={justReviewed.has(exec.id) ? "Marcado como revisado" : "Marcar como revisado"}
                        >
                          {justReviewed.has(exec.id) ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : markingAsReviewed.has(exec.id) ? (
                            <div className="animate-spin h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleViewExecution(exec.id)}
                          disabled={loadingExecutionDetails === exec.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {loadingExecutionDetails === exec.id ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                              <span>Cargando...</span>
                            </>
                          ) : (
                            'Ver Ejecución'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalles de Ejecución */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Detalles de Ejecución</h2>
                <p className="text-sm text-gray-500 mt-1">
                  ID: {selectedExecution.id} | Estado: <span className={`font-medium ${
                    selectedExecution.status === 'success' ? 'text-green-600' : 
                    selectedExecution.status === 'error' ? 'text-red-600' : 
                    'text-yellow-600'
                  }`}>{selectedExecution.status}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedExecution(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500 mb-1">Inicio</p>
                    <p className="text-sm font-medium">{new Date(selectedExecution.startedAt).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500 mb-1">Fin</p>
                    <p className="text-sm font-medium">{selectedExecution.stoppedAt ? new Date(selectedExecution.stoppedAt).toLocaleString() : '-'}</p>
                  </div>
                </div>
                {selectedExecution.data && selectedExecution.data.resultData && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Nodos Ejecutados:</h3>
                    <div className="space-y-2">
                      {Object.entries(selectedExecution.data.resultData.runData || {}).map(([nodeName, executions]: [string, any]) => {
                        const execData = executions[0];
                        const hasError = execData?.executionStatus === 'error';
                        const isExpanded = expandedNodes.has(nodeName);
                        return (
                          <div key={nodeName} className={`border rounded p-3 ${
                            hasError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <button
                                onClick={() => toggleNodeExpansion(nodeName)}
                                className="flex items-center gap-2 text-left"
                              >
                                <span className={`font-medium ${
                                  hasError ? 'text-red-900' : 'text-blue-900'
                                }`}>{nodeName}</span>
                                <span className="text-gray-500 text-sm">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                              </button>
                              <span className={`text-xs px-2 py-1 rounded ${
                                execData?.executionStatus === 'success' ? 'bg-green-100 text-green-800' :
                                execData?.executionStatus === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {execData?.executionStatus || 'unknown'}
                              </span>
                            </div>
                            {execData?.executionTime && (
                              <p className="text-xs text-gray-600 mb-2">Tiempo: {execData.executionTime}ms</p>
                            )}
                            {isExpanded && execData?.data && (
                              <div className="mt-2 p-2 bg-white border border-gray-300 rounded">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-xs font-semibold text-gray-700">Datos:</p>
                                  <button
                                    onClick={() => handleExplainWithAI(execData.data, nodeName, false)}
                                    disabled={loadingAI === nodeName}
                                    className="text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  >
                                    {loadingAI === nodeName ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                        Explicando...
                                      </>
                                    ) : (
                                      'Explicar con IA'
                                    )}
                                  </button>
                                </div>
                                <div className="text-xs overflow-x-auto max-h-96 overflow-y-auto break-words">
                                  {renderJSON(execData.data)}
                                </div>
                                {aiExplanations.get(nodeName) && (
                                  <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                                    <p className="text-xs font-semibold text-purple-800 mb-1">Explicación de IA:</p>
                                    <p className="text-xs text-purple-900">{aiExplanations.get(nodeName)}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {hasError && execData?.error && (
                              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-xs font-semibold text-red-800">Error:</p>
                                  <button
                                    onClick={() => handleExplainWithAI(execData.error, nodeName, true)}
                                    disabled={loadingAI === nodeName}
                                    className="text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  >
                                    {loadingAI === nodeName ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                        Explicando...
                                      </>
                                    ) : (
                                      'Explicar con IA'
                                    )}
                                  </button>
                                </div>
                                <div className="text-xs overflow-x-auto overflow-y-auto max-h-96 mb-2 break-words">
                                  {renderJSON(execData.error)}
                                </div>
                                {aiExplanations.get(nodeName) && (
                                  <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                                    <p className="text-xs font-semibold text-purple-800 mb-1">Explicación de IA:</p>
                                    <p className="text-xs text-purple-900">{aiExplanations.get(nodeName)}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}

