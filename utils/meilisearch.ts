import axios from 'axios';

const api = axios.create({
  baseURL: '/api/meilisearch',
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface Index {
  uid: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  primaryKey?: string;
}

export interface IndexStats {
  numberOfDocuments: number;
  isIndexing: boolean;
  fieldDistribution: Record<string, number>;
}

export interface IndexSettings {
  displayedAttributes: string[];
  searchableAttributes: string[];
  filterableAttributes: string[];
  sortableAttributes: string[];
  rankingRules: string[];
  stopWords: string[];
  synonyms: Record<string, string[]>;
  distinctAttribute?: string;
  typoTolerance: any;
  faceting: any;
  pagination: any;
  retrieval: any;
  embedders?: Record<string, {
    source: string;
    model: string;
    dimensions?: number;
    apiKey?: string;
    documentTemplate?: string;
    documentTemplateMaxBytes?: number;
  }>;
}

export interface Document {
  [key: string]: any;
}

export const meilisearchAPI = {
  // Obtener todos los índices (con paginación para obtener todos)
  async getIndexes(cacheBust?: number): Promise<Index[]> {
    const params: any = cacheBust ? { _t: cacheBust } : {};
    const allIndexes: Index[] = [];
    let offset = 0;
    const limit = 100; // Obtener 100 por página para asegurar que obtenemos todos
    
    while (true) {
      const pageParams = { ...params, limit, offset };
      const response = await api.get('/indexes', { params: pageParams });
      const indexes = response.data.results || [];
      allIndexes.push(...indexes);
      
      // Si no hay más resultados o ya obtuvimos todos, salir
      if (indexes.length < limit || allIndexes.length >= response.data.total) {
        break;
      }
      
      offset += limit;
    }
    
    return allIndexes;
  },

  // Obtener información de un índice específico
  async getIndex(uid: string): Promise<Index> {
    const response = await api.get(`/indexes/${uid}`);
    return response.data;
  },

  // Obtener estadísticas de un índice
  async getIndexStats(uid: string): Promise<IndexStats> {
    const response = await api.get(`/indexes/${uid}/stats`);
    return response.data;
  },

  // Obtener configuración de un índice
  async getIndexSettings(uid: string): Promise<IndexSettings> {
    const response = await api.get(`/indexes/${uid}/settings`);
    const settings = response.data;
    
    // Si no hay embedders en settings, intentar obtenerlos directamente
    if (!settings.embedders || Object.keys(settings.embedders || {}).length === 0) {
      try {
        const embeddersResponse = await api.get(`/indexes/${uid}/settings/embedders`);
        if (embeddersResponse.data && Object.keys(embeddersResponse.data).length > 0) {
          settings.embedders = embeddersResponse.data;
        }
      } catch (embedderErr: any) {
        // Si falla, simplemente continuar sin embedders
        console.log('⚠️ No se pudieron obtener embedders directamente:', embedderErr.response?.data || embedderErr.message);
      }
    }
    
    return settings;
  },

  // Obtener documentos de un índice
  async getDocuments(uid: string, limit: number = 20, offset: number = 0): Promise<{ results: Document[], total: number }> {
    const response = await api.get(`/indexes/${uid}/documents`, {
      params: { limit, offset }
    });
    return response.data;
  },

  // Buscar documentos en un índice
  async searchDocuments(uid: string, query: string, limit: number = 20, offset: number = 0, params?: any): Promise<{ hits: Document[], totalHits: number, total: number }> {
    const page = Math.floor(offset / limit) + 1;
    const searchParams: any = { q: query, hitsPerPage: limit, page };
    
    if (params) {
      if (params.filter) searchParams.filter = params.filter;
      if (params.sort) searchParams.sort = params.sort;
      if (params.matchingStrategy) searchParams.matchingStrategy = params.matchingStrategy;
      if (params.rankingScoreThreshold !== undefined) searchParams.rankingScoreThreshold = params.rankingScoreThreshold;
      if (params.hybridEmbedder) searchParams.hybridEmbedder = params.hybridEmbedder;
      if (params.hybridSemanticRatio !== undefined) searchParams.hybridSemanticRatio = params.hybridSemanticRatio;
    }
    
    console.log('Meilisearch search params:', searchParams);
    console.log('Full search params object:', JSON.stringify(searchParams, null, 2));
    
    const response = await api.get(`/indexes/${uid}/search`, {
      params: searchParams
    });
    
    // Meilisearch devuelve totalHits, pero mantenemos compatibilidad con total
    const data = response.data;
    console.log('Meilisearch raw response:', data);
    return {
      hits: data.hits || [],
      totalHits: data.totalHits || 0,
      total: data.totalHits || 0 // Para compatibilidad
    };
  },

  // Obtener un documento específico
  async getDocument(uid: string, documentId: string): Promise<Document> {
    const response = await api.get(`/indexes/${uid}/documents/${documentId}`);
    return response.data;
  },

  // Crear o actualizar documentos (usa POST con array)
  async addDocuments(uid: string, documents: Document[]): Promise<any> {
    const response = await api.post(`/indexes/${uid}/documents`, documents);
    return response.data;
  },

  // Actualizar un documento específico (reemplazar completamente)
  async updateDocument(uid: string, documentId: string, document: Document): Promise<any> {
    const response = await api.put(`/indexes/${uid}/documents/${documentId}`, document);
    return response.data;
  },

  // Eliminar un documento
  async deleteDocument(uid: string, documentId: string): Promise<any> {
    const response = await api.delete(`/indexes/${uid}/documents/${documentId}`);
    return response.data;
  },

  // Eliminar varios documentos
  async deleteDocuments(uid: string, documentIds: string[]): Promise<any> {
    const response = await api.post(`/indexes/${uid}/documents/delete-batch`, documentIds);
    return response.data;
  },

  // Actualizar configuración de un índice
  async updateIndexSettings(uid: string, settings: Partial<IndexSettings>): Promise<any> {
    const response = await api.patch(`/indexes/${uid}/settings`, settings);
    return response.data;
  },

  // Actualizar embedders de un índice
  async updateEmbedders(uid: string, embedders: Record<string, any>): Promise<any> {
    const response = await api.patch(`/indexes/${uid}/settings/embedders`, embedders);
    return response.data;
  },

  // Obtener estado de una task
  async getTask(uid: number): Promise<any> {
    const response = await api.get(`/tasks/${uid}`);
    return response.data;
  },

  // Crear un nuevo índice
  async createIndex(uid: string, primaryKey?: string): Promise<any> {
    const body: any = { uid };
    if (primaryKey) {
      body.primaryKey = primaryKey;
    }
    const response = await api.post('/indexes', body);
    return response.data;
  },

  // Actualizar un índice (cambiar primaryKey)
  async updateIndex(uid: string, primaryKey?: string): Promise<any> {
    const body: any = {};
    if (primaryKey) {
      body.primaryKey = primaryKey;
    }
    const response = await api.patch(`/indexes/${uid}`, body);
    return response.data;
  },

  // Eliminar un índice
  async deleteIndex(uid: string): Promise<any> {
    const response = await api.delete(`/indexes/${uid}`);
    return response.data;
  }
};

