import { useState, useEffect } from 'react';

export interface Client {
  id: number;
  name: string;
  usuario: string;
  clave: string;
  company?: string;
  email?: string;
  phone?: string;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Cargar desde localStorage
    const stored = localStorage.getItem('admin_clients');
    if (stored) {
      try {
        const parsedClients = JSON.parse(stored);
        setClients(parsedClients);
      } catch (e) {
        console.error('Error loading clients from localStorage:', e);
      }
    } else {
      // Datos iniciales si no hay nada guardado
      const initialClients: Client[] = [
        { id: 1, name: 'Zero Azul Agencia', usuario: 'admin', clave: 'admin123', company: 'Zero Azul', email: 'admin@zeroazul.com', phone: '+573001234567' }
      ];
      setClients(initialClients);
      localStorage.setItem('admin_clients', JSON.stringify(initialClients));
    }
    setInitialized(true);
  }, []);

  const addClient = (client: Client) => {
    const updatedClients = [...clients, client];
    setClients(updatedClients);
    localStorage.setItem('admin_clients', JSON.stringify(updatedClients));
  };

  const updateClient = (id: number, updatedClient: Partial<Client>) => {
    const updatedClients = clients.map(c => 
      c.id === id ? { ...c, ...updatedClient } : c
    );
    setClients(updatedClients);
    localStorage.setItem('admin_clients', JSON.stringify(updatedClients));
  };

  const deleteClient = (id: number) => {
    const updatedClients = clients.filter(c => c.id !== id);
    setClients(updatedClients);
    localStorage.setItem('admin_clients', JSON.stringify(updatedClients));
  };

  return {
    clients,
    initialized,
    addClient,
    updateClient,
    deleteClient
  };
}

