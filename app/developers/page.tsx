'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import AgentSelector from '@/components/ui/AgentSelector';
import NoticeModal from '@/components/ui/NoticeModal';
import { useState, useEffect } from 'react';
import { getPermissions, getUserId } from '@/utils/permissions';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

interface AgentDB {
  id: number;
  name: string;
  agent_code?: string;
  client_id?: number;
}

interface DeveloperDoc {
  id: number;
  agent_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  agent_name?: string;
  agent_code?: string;
}

export default function Developers() {
  const [allAgents, setAllAgents] = useState<AgentDB[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentDB | null>(null);
  const [docs, setDocs] = useState<DeveloperDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DeveloperDoc | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DeveloperDoc | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    content: '',
  });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  useEffect(() => {
    const loadAgents = async () => {
      try {
        // Verificar y crear tabla si no existe
        try {
          const migrationRes = await fetch('/api/migrations/create-developer-docs-table', {
            method: 'POST',
          });
          const migrationData = await migrationRes.json();
          if (migrationData.ok) {
            console.log('[DEVELOPERS] Migración ejecutada:', migrationData.message);
          }
        } catch (migrationError) {
          console.error('[DEVELOPERS] Error ejecutando migración:', migrationError);
        }

        const res = await fetch('/api/agents');
        const data = await res.json();
        let list: AgentDB[] = data.ok ? data.agents : [];
        
        // Aplicar filtros de permisos
        const permissions = getPermissions();
        const userId = getUserId();
        if (permissions && userId && permissions.type !== 'admin' && !permissions['agentes']?.viewAll) {
          list = list.filter(a => a.client_id === parseInt(userId));
        }
        
        setAllAgents(list);
      } catch (e) {
        console.error('[DEVELOPERS] Error cargando agentes:', e);
      } finally {
        setAgentsLoading(false);
      }
    };
    
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadDocs(selectedAgent.id);
    } else {
      setDocs([]);
    }
  }, [selectedAgent]);

  const loadDocs = async (agentId: number) => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/developer-docs?agent_id=${agentId}`);
      const data = await res.json();
      if (data.ok) {
        setDocs(data.docs || []);
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Error al cargar documentos',
          type: 'error',
        });
      }
    } catch (e: any) {
      console.error('[DEVELOPERS] Error cargando documentos:', e);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: e?.message || 'Error al cargar documentos',
        type: 'error',
      });
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleCreateDoc = () => {
    if (!selectedAgent) {
      setAlertModal({
        isOpen: true,
        title: 'Agente requerido',
        message: 'Por favor selecciona un agente primero',
        type: 'warning',
      });
      return;
    }
    setDocForm({ title: '', content: '' });
    setEditingDoc(null);
    setShowCreateModal(true);
  };

  const handleEditDoc = (doc: DeveloperDoc) => {
    setEditingDoc(doc);
    setDocForm({
      title: doc.title,
      content: doc.content,
    });
    setShowEditModal(true);
  };

  const handleSaveDoc = async () => {
    if (!selectedAgent) return;

    if (!docForm.title.trim() || !docForm.content.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Campos requeridos',
        message: 'Por favor completa el título y el contenido',
        type: 'warning',
      });
      return;
    }

    setSavingDoc(true);
    try {
      const url = editingDoc 
        ? `/api/developer-docs/${editingDoc.id}`
        : '/api/developer-docs';
      
      const method = editingDoc ? 'PUT' : 'POST';
      
      const body = editingDoc
        ? { title: docForm.title.trim(), content: docForm.content.trim() }
        : { agent_id: selectedAgent.id, title: docForm.title.trim(), content: docForm.content.trim() };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        setAlertModal({
          isOpen: true,
          title: editingDoc ? 'Documento actualizado' : 'Documento creado',
          message: data.message || (editingDoc ? 'El documento ha sido actualizado exitosamente' : 'El documento ha sido creado exitosamente'),
          type: 'success',
        });
        setShowCreateModal(false);
        setShowEditModal(false);
        setDocForm({ title: '', content: '' });
        setEditingDoc(null);
        await loadDocs(selectedAgent.id);
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Error al guardar el documento',
          type: 'error',
        });
      }
    } catch (e: any) {
      console.error('[DEVELOPERS] Error guardando documento:', e);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: e?.message || 'Error al procesar la solicitud',
        type: 'error',
      });
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDoc = (doc: DeveloperDoc) => {
    setDocToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;

    setDeletingDoc(true);
    setShowDeleteConfirm(false);
    try {
      const res = await fetch(`/api/developer-docs/${docToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Documento eliminado',
          message: 'El documento ha sido eliminado exitosamente',
          type: 'success',
        });
        if (selectedAgent) {
          await loadDocs(selectedAgent.id);
        }
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: data.error || 'Error al eliminar el documento',
          type: 'error',
        });
      }
    } catch (e: any) {
      console.error('[DEVELOPERS] Error eliminando documento:', e);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: e?.message || 'Error al procesar la solicitud',
        type: 'error',
      });
    } finally {
      setDeletingDoc(false);
      setDocToDelete(null);
    }
  };

  return (
    <ProtectedLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documentación de Developers</h1>
        <p className="text-gray-600">
          Documentación técnica y procesos para cada agente
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <AgentSelector
          label="Seleccionar Agente"
          agents={allAgents}
          selectedAgent={selectedAgent}
          onChange={(agent) => {
            if (agent && typeof agent === 'object' && agent.id !== 'all') {
              setSelectedAgent(agent as AgentDB);
            } else {
              setSelectedAgent(null);
            }
          }}
          placeholder="Seleccionar agente..."
          loading={agentsLoading}
          className="mb-6"
        />

        {selectedAgent && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Documentos de {selectedAgent.name}
              </h2>
              <button
                onClick={handleCreateDoc}
                className="flex items-center gap-2 px-4 py-2 bg-[#5DE1E5] text-black rounded-lg font-medium hover:bg-[#4BC4C7] transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Nuevo Documento
              </button>
            </div>

            {loadingDocs ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#5DE1E5] mx-auto"></div>
                <p className="mt-2 text-gray-500">Cargando documentos...</p>
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <CodeBracketIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No hay documentos para este agente</p>
                <p className="text-sm text-gray-400 mt-1">Crea un nuevo documento para comenzar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <DocumentTextIcon className="w-5 h-5 text-[#5DE1E5] flex-shrink-0" />
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {doc.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3 break-words overflow-wrap-anywhere">
                      {doc.content}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>
                        {new Date(doc.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      {doc.updated_at !== doc.created_at && (
                        <span className="text-gray-400">Actualizado</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditDoc(doc)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc)}
                        disabled={deletingDoc}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedAgent && !agentsLoading && (
          <div className="text-center py-8">
            <CodeBracketIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Selecciona un agente para ver su documentación</p>
          </div>
        )}
      </div>

      {/* Modal para crear/editar documento */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingDoc ? 'Editar Documento' : 'Nuevo Documento'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {editingDoc ? 'Modifica el documento de developer' : 'Crea un nuevo documento de developer para este agente'}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  placeholder="Ej: Proceso de inicialización, Configuración de webhooks, etc."
                  disabled={savingDoc}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenido *
                </label>
                <textarea
                  value={docForm.content}
                  onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                  placeholder="Describe el proceso, configuración, o funcionalidad..."
                  disabled={savingDoc}
                  rows={12}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#5DE1E5] sm:text-sm/6 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 break-words overflow-wrap-anywhere">
                  Puedes usar Markdown para formatear el contenido
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setDocForm({ title: '', content: '' });
                  setEditingDoc(null);
                }}
                disabled={savingDoc}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDoc}
                disabled={savingDoc || !docForm.title.trim() || !docForm.content.trim()}
                className="px-4 py-2 rounded-lg font-medium text-white bg-[#5DE1E5] hover:bg-[#4BC4C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingDoc ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{editingDoc ? 'Actualizar' : 'Crear'} Documento</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <NoticeModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      <NoticeModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDocToDelete(null);
        }}
        onConfirm={confirmDeleteDoc}
        title="Eliminar Documento"
        message={docToDelete ? `¿Estás seguro de que deseas eliminar el documento "${docToDelete.title}"? Esta acción no se puede deshacer.` : ''}
        type="warning"
        showCancel={true}
      />
    </ProtectedLayout>
  );
}

