'use client';

import { useState, useEffect, useRef } from 'react';
import { n8nAPI, Workflow, Execution } from '@/utils/n8n';
import { getPermissions, getUserId } from '@/utils/permissions';

type FilterStatus = 'all' | 'success' | 'error' | 'running';

interface AgentDB {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  photo?: string;
  workflows?: any;
}

export default function Ejecuciones() {
  const [allAgents, setAllAgents] = useState<AgentDB[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [allWorkflows, setAllWorkflows] = useState<Workflow[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  // Filtrar agentes según permisos
  const agents = (() => {
    const permissions = getPermissions();
    const userId = getUserId();
    
    if (!permissions || !userId) return allAgents;
    if (permissions.type === 'admin') return allAgents;
    
    // Si no tiene permiso viewAll, filtrar solo sus agentes
    if (!permissions.ejecuciones?.viewAll) {
      return allAgents.filter(a => a.client_id === parseInt(userId));
    }
    
    return allAgents;
  })();
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (data.ok && data.agents) {
          // Normalizar workflows por seguridad - SIEMPRE garantizar estructura válida
          const normalized = data.agents.map((a: any) => {
            let workflows: any = { workflowIds: [] };
            try {
              if (a.workflows) {
                if (typeof a.workflows === 'string') {
                  workflows = JSON.parse(a.workflows);
                } else if (typeof a.workflows === 'object') {
                  workflows = a.workflows;
                }
              }
            } catch (e) {
              console.error(`[EJECUCIONES] Error parsing workflows for agent ${a.id}:`, e);
              workflows = { workflowIds: [] };
            }
            // Garantizar que workflowIds siempre sea un array
            if (!workflows || typeof workflows !== 'object') {
              workflows = { workflowIds: [] };
            }
            if (!Array.isArray(workflows.workflowIds)) {
              workflows.workflowIds = [];
            }
            return { ...a, workflows } as AgentDB;
          });
          setAllAgents(normalized);
        }
      } catch (e) {
        console.error('Error cargando agentes:', e);
      } finally {
        setAgentsLoading(false);
      }
    };
    loadAgents();
  }, []);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [execLoading, setExecLoading] = useState(false);
  const [loadingExecutionDetails, setLoadingExecutionDetails] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Map<string, string>>(new Map());
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('n8n_items_per_page');
      return saved ? parseInt(saved) : 20;
    }
    return 20;
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    if (selectedAgent && allWorkflows.length > 0) {
      // Filtrar workflows basándose en los del agente
      let agentWorkflowIds: string[] = [];
      try {
        const w = typeof selectedAgent.workflows === 'string' ? JSON.parse(selectedAgent.workflows) : (selectedAgent.workflows || {});
        agentWorkflowIds = Array.isArray(w.workflowIds) ? w.workflowIds : [];
      } catch {
        agentWorkflowIds = [];
      }
      if (agentWorkflowIds.length > 0) {
        const filtered = allWorkflows.filter(w => agentWorkflowIds.includes(w.id));
        setWorkflows(filtered);
      } else {
        setWorkflows([]);
      }
      // Limpiar selección de workflow cuando cambia el agente
      setSelectedWorkflow(null);
    }
  }, [selectedAgent, allWorkflows]);

  useEffect(() => {
    if (selectedWorkflow) {
      loadExecutions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflow, cursor, filterStatus, itemsPerPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await n8nAPI.getWorkflows();
      setAllWorkflows(data);
    } catch (err: any) {
      console.error('Error loading workflows:', err);
      alert('Error al cargar los flujos de n8n. Verifica que el servidor esté disponible.');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    if (!selectedWorkflow) return;
    
    try {
      setExecLoading(true);
      const response = await n8nAPI.getExecutions(selectedWorkflow.id, itemsPerPage, cursor);
      
      // Cargar datos completos para cada ejecución (necesario para verificar json.messages.text)
      const executionsWithData = await Promise.all(
        response.data.map(async (exec: Execution) => {
          try {
            const fullExec = await n8nAPI.getExecution(exec.id);
            return fullExec;
          } catch (err) {
            console.error(`Error cargando datos completos de ejecución ${exec.id}:`, err);
            return exec; // Retornar ejecución sin datos si falla
          }
        })
      );
      
      setExecutions(executionsWithData);
      setNextCursor(response.nextCursor);
    } catch (err) {
      console.error('Error loading executions:', err);
    } finally {
      setExecLoading(false);
    }
  };


  const getFilteredExecutions = () => {
    // Aplicar filtro de estado
    if (filterStatus === 'all') {
      return executions;
    }
    
    return executions.filter(exec => {
      if (filterStatus === 'success') {
        return exec.finished && exec.status === 'success';
      }
      if (filterStatus === 'error') {
        return exec.status === 'error';
      }
      if (filterStatus === 'running') {
        return !exec.finished;
      }
      return true;
    });
  };

  // Verificar si el primer nodo tiene json.messages.text
  const hasMessageText = (exec: Execution): boolean => {
    try {
      if (!exec.data?.resultData?.runData) {
        console.log('[TIPO] No hay runData para ejecución:', exec.id);
        return false;
      }
      
      const runData = exec.data.resultData.runData;
      const nodeNames = Object.keys(runData);
      if (nodeNames.length === 0) {
        console.log('[TIPO] No hay nodos para ejecución:', exec.id);
        return false;
      }
      
      // Obtener el primer nodo
      const firstNodeName = nodeNames[0];
      const firstNodeExecutions = runData[firstNodeName];
      if (!firstNodeExecutions || firstNodeExecutions.length === 0) {
        console.log('[TIPO] No hay ejecuciones del nodo para:', exec.id, firstNodeName);
        return false;
      }
      
      const firstExecution = firstNodeExecutions[0];
      console.log('[TIPO] Verificando nodo:', firstNodeName, 'para ejecución:', exec.id);
      console.log('[TIPO] Estructura firstExecution:', {
        hasData: !!firstExecution?.data,
        hasJson: !!firstExecution?.data?.json,
        hasMessages: !!firstExecution?.data?.json?.messages,
        hasText: !!firstExecution?.data?.json?.messages?.text
      });
      
      // Verificar múltiples rutas posibles
      const text1 = firstExecution?.data?.json?.messages?.text;
      const text2 = firstExecution?.json?.messages?.text;
      const text3 = firstExecution?.data?.messages?.text;
      
      const text = text1 || text2 || text3;
      const hasText = text !== undefined && text !== null && text !== '';
      
      console.log('[TIPO] Resultado para ejecución', exec.id, ':', hasText, 'text encontrado:', text);
      
      return hasText;
    } catch (e) {
      console.error('[TIPO] Error verificando message.text para ejecución', exec.id, ':', e);
      return false;
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    localStorage.setItem('n8n_items_per_page', value.toString());
    setCursor(undefined); // Reset pagination
  };

  const handleViewExecution = async (executionId: string) => {
    try {
      setLoadingExecutionDetails(executionId);
      const exec = await n8nAPI.getExecution(executionId);
      setSelectedExecution(exec);
      setAiExplanations(new Map()); // Limpiar todas las explicaciones
    } catch (err) {
      console.error('Error loading execution:', err);
    } finally {
      setLoadingExecutionDetails(null);
    }
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
      console.error('Error explaining with AI:', err);
      const newExplanations = new Map(aiExplanations);
      newExplanations.set(nodeName, 'Error al obtener explicación de IA');
      setAiExplanations(newExplanations);
    } finally {
      setLoadingAI(null);
    }
  };

  const toggleNodeExpansion = (nodeName: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeName)) {
      newExpanded.delete(nodeName);
    } else {
      newExpanded.add(nodeName);
    }
    setExpandedNodes(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string':
        return <span className="inline-flex items-center justify-center w-4 h-4 bg-green-100 text-green-700 rounded text-[10px] font-bold">S</span>;
      case 'number':
        return <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">#</span>;
      case 'boolean':
        return <span className="inline-flex items-center justify-center w-4 h-4 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">✓</span>;
      case 'array':
        return <span className="inline-flex items-center justify-center w-4 h-4 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">[]</span>;
      case 'object':
        return <span className="inline-flex items-center justify-center w-4 h-4 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">{}</span>;
      default:
        return <span className="inline-flex items-center justify-center w-4 h-4 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">?</span>;
    }
  };

  const renderJSON = (data: any, level = 0, showLabel = true): JSX.Element => {
    if (data === null || data === undefined) {
      return <span className="text-gray-500 text-sm">null</span>;
    }
    
    if (Array.isArray(data)) {
      // Si es un array con un solo elemento, mostrar directamente el contenido
      if (data.length === 1) {
        return renderJSON(data[0], level, false);
      }
      
      return (
        <div className="space-y-0.5">
          {showLabel && (
            <div className="flex items-center gap-1.5">
              {getTypeIcon('array')}
              <span className="text-gray-500 text-sm">{data.length} elementos</span>
            </div>
          )}
          <div className={`${showLabel ? 'ml-5 mt-0.5' : ''} space-y-0.5`}>
            {data.slice(0, 3).map((item, idx) => (
              <div key={idx}>
                {renderJSON(item, level + 1)}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      
      // Si el objeto tiene solo una propiedad, mostrar directamente
      if (keys.length === 1) {
        return renderJSON(data[keys[0]], level, false);
      }
      
      return (
        <div className="space-y-0.5">
          {showLabel && (
            <div className="flex items-center gap-1.5">
              {getTypeIcon('object')}
              <span className="text-gray-500 text-sm">{keys.length} propiedades</span>
            </div>
          )}
          <div className={`${showLabel ? 'ml-5 mt-0.5' : ''} space-y-0.5`}>
            {keys.map((k) => (
              <div key={k} className="flex items-start gap-1.5">
                <span className="text-purple-600 font-semibold text-sm whitespace-nowrap">{k}:</span>
                <div className="flex-1 min-w-0">
                  {renderJSON(data[k], level + 1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    if (typeof data === 'string') {
      if (data.length === 0) return <span className="text-gray-400 text-sm italic">vacío</span>;
      // No truncar strings, mostrar completos
      return (
        <div className="flex items-start gap-1.5 flex-wrap">
          {getTypeIcon('string')}
          <span className="text-green-700 text-sm break-words whitespace-pre-wrap">{data}</span>
        </div>
      );
    }
    
    if (typeof data === 'number') {
      return (
        <div className="flex items-center gap-1.5">
          {getTypeIcon('number')}
          <span className="text-blue-700 text-sm">{data}</span>
        </div>
      );
    }
    
    if (typeof data === 'boolean') {
      return (
        <div className="flex items-center gap-1.5">
          {getTypeIcon('boolean')}
          <span className="text-orange-700 text-sm">{data.toString()}</span>
        </div>
      );
    }
    
    return <span className="text-gray-600 text-sm">{String(data)}</span>;
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setIsOpen(false);
    setSearchQuery('');
    setCursor(undefined);
    setNextCursor(undefined);
    setFilterStatus('all');
  };


  if (agentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Ejecuciones n8n</h1>

        {/* Selector de Agente */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Agente
          </label>
          <select
            value={selectedAgent?.id || ''}
            onChange={(e) => {
              const agent = agents.find(a => a.id === parseInt(e.target.value));
              setSelectedAgent(agent || null);
              setSelectedWorkflow(null);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar agente...</option>
            {agents.map((agent) => {
              // Usar workflows ya normalizado del agente
              const workflowIds = agent.workflows?.workflowIds || [];
              const cnt = Array.isArray(workflowIds) ? workflowIds.length : 0;
              return (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {cnt ? `(${cnt} flujos)` : '(sin flujos)'}
                </option>
              );
            })}
          </select>
          {selectedAgent && selectedAgent.photo && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={selectedAgent.photo}
                alt={selectedAgent.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
              />
              <div>
                <p className="font-medium text-gray-900">{selectedAgent.name}</p>
                {selectedAgent.description && (
                  <p className="text-sm text-gray-500">{selectedAgent.description}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedAgent && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Seleccionar Flujo</h2>
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              value={isOpen ? searchQuery : (selectedWorkflow?.name || '')}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Buscar flujo..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {isOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {loading || workflows.length === 0 ? (
                  <div className="px-4 py-3 text-blue-600 text-sm flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    Cargando flujos...
                  </div>
                ) : filteredWorkflows.length === 0 ? (
                  <div className="px-4 py-3 text-gray-500 text-sm">
                    No se encontraron flujos
                  </div>
                ) : (
                  filteredWorkflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => handleSelectWorkflow(workflow)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {workflow.name}
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                          workflow.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {workflow.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          
          {selectedWorkflow && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Flujo seleccionado:</span> {selectedWorkflow.name}
              </p>
            </div>
          )}
        </div>
        )}

        {!selectedAgent && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">
              Por favor, selecciona un agente para ver sus flujos y ejecuciones.
            </p>
          </div>
        )}

        {selectedAgent && workflows.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">
              {selectedAgent.name} no tiene flujos asociados. Configura sus flujos desde la página de Agentes.
            </p>
          </div>
        )}

        {selectedWorkflow && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  Ejecuciones de {selectedWorkflow.name} - HOY
                </h2>
                <div className="flex gap-2 items-center">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                    <option value={200}>200 por página</option>
                  </select>
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFilterStatus('success')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === 'success'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Exitosas
                  </button>
                  <button
                    onClick={() => setFilterStatus('error')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Errores
                  </button>
                  <button
                    onClick={() => setFilterStatus('running')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === 'running'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    En Progreso
                  </button>
                </div>
              </div>
            </div>

            {execLoading ? (
              <div className="p-6 text-center">
                <p className="text-gray-600">Cargando ejecuciones...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredExecutions().map((exec) => (
                        <tr key={exec.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {exec.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(exec.startedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {exec.stoppedAt ? new Date(exec.stoppedAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              exec.status === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : exec.status === 'error'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {exec.status === 'success' 
                                ? 'Exitoso' 
                                : exec.status === 'error'
                                ? 'Error'
                                : 'En progreso'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {hasMessageText(exec) && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500 text-white">
                                Mensaje
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex gap-3 justify-end">
                              <a
                                href={`https://automation.zeroazul.com/workflow/${exec.workflowId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Workflow
                              </a>
                              <button
                                onClick={() => handleViewExecution(exec.id)}
                                disabled={loadingExecutionDetails === exec.id}
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {loadingExecutionDetails === exec.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                    <span>Cargando...</span>
                                  </>
                                ) : (
                                  'Ver'
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {filterStatus !== 'all' ? (
                      <>Mostrando {getFilteredExecutions().length} ejecuciones (filtradas)</>
                    ) : (
                      <>Mostrando {executions.length} ejecuciones</>
                    )}
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => setCursor(undefined)}
                      disabled={!cursor}
                      className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Primera página
                    </button>
                    <button
                      onClick={() => setCursor(nextCursor)}
                      disabled={!nextCursor}
                      className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

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
      </div>
    </div>
  );
}

