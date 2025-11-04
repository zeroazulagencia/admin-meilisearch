'use client';

import { useState, useEffect } from 'react';
import { meilisearchAPI } from '@/utils/meilisearch';
import ProtectedLayout from '@/components/ProtectedLayout';

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
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
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
    </ProtectedLayout>
  );
}

