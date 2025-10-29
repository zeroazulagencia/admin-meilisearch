'use client';

import { useState, useEffect } from 'react';
import { meilisearchAPI } from '@/utils/meilisearch';

export default function Dashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    agents: 0,
    conversations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Cargar estadísticas de clientes y agentes desde MySQL
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
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.clients}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
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

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
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

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Admin Conocimiento</h2>
            <p className="text-gray-600 text-sm mb-4">Administra tus índices de Meilisearch</p>
            <a href="/admin-conocimiento" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ir a Admin →
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Ejecuciones</h2>
            <p className="text-gray-600 text-sm mb-4">Revisa las ejecuciones de n8n</p>
            <a href="/ejecuciones" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver ejecuciones →
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Conversaciones</h2>
            <p className="text-gray-600 text-sm mb-4">Revisa conversaciones por agente</p>
            <a href="/conversaciones" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver conversaciones →
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Consumo API</h2>
            <p className="text-gray-600 text-sm mb-4">Monitorea créditos y consumo de las APIs</p>
            <a href="/consumo-api" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver consumo →
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Clientes</h2>
            <p className="text-gray-600 text-sm mb-4">Gestiona los clientes del sistema</p>
            <a href="/clientes" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver clientes →
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Agentes</h2>
            <p className="text-gray-600 text-sm mb-4">Gestiona los agentes de IA</p>
            <a href="/agentes" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver agentes →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
