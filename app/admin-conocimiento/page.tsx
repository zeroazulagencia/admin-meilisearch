'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Index, meilisearchAPI } from '@/utils/meilisearch';
import IndexProperties from '@/components/IndexProperties';
import DocumentList from '@/components/DocumentList';

interface AgentDB {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  photo?: string;
  knowledge?: any;
}

export default function AdminConocimiento() {
  const [agents, setAgents] = useState<AgentDB[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentDB | null>(null);
  const [availableIndexes, setAvailableIndexes] = useState<Index[]>([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<Index | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfText, setPdfText] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfIdPrefix, setPdfIdPrefix] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Estados para los pasos del modal PDF
  const [pdfStep, setPdfStep] = useState<'text' | 'fields' | 'review'>('text');
  const [indexFields, setIndexFields] = useState<string[]>([]);
  const [selectedIdField, setSelectedIdField] = useState<string>('');
  const [selectedTextField, setSelectedTextField] = useState<string>('');
  const [preparedChunks, setPreparedChunks] = useState<Array<{ id: string; text: string; extractedValues?: Record<string, string> }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Array<{
    chunkIndex: number;
    taskUid: number;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
    message: string;
  }>>([]);
  const [requiredFields, setRequiredFields] = useState<Array<{ field: string; value: string }>>([]);
  const [indexSettings, setIndexSettings] = useState<any>(null);
  const [allIndexFields, setAllIndexFields] = useState<Array<{ name: string; type: string; required: boolean }>>([]);
  const [chunkFields, setChunkFields] = useState<Record<number, Record<string, any>>>({});
  const [structuringChunks, setStructuringChunks] = useState(false);
  const [structuringProgress, setStructuringProgress] = useState<Record<number, { status: 'pending' | 'processing' | 'succeeded' | 'failed'; message?: string }>>({});
  
  // Calcular cantidad de chunks basado en el símbolo [separador]
  const calculateChunks = (text: string): number => {
    if (!text || text.trim().length === 0) return 1;
    const separators = (text.match(/\[separador\]/g) || []).length;
    return separators + 1; // Si hay n separadores, hay n+1 chunks
  };

  // Extraer campos requeridos del documentTemplate del embedder
  const extractRequiredFields = (documentTemplate: string): string[] => {
    if (!documentTemplate) return [];
    const matches = documentTemplate.match(/\{\{doc\.(\w+)\}\}/g);
    if (!matches) return [];
    const fields = matches.map(match => match.replace(/\{\{doc\.|\}\}/g, ''));
    // Eliminar duplicados usando Array.from
    return Array.from(new Set(fields));
  };

  // Extraer valor de un campo del texto del PDF usando patrones comunes
  const extractFieldValue = (text: string, fieldName: string): string => {
    const fieldLower = fieldName.toLowerCase();
    
    // Intentar extraer valores comunes del PDF con patrones específicos
    const patterns: Record<string, RegExp[]> = {
      producto: [
        /\d+\.\d+\.\s*PRODUCTO:\s*([^\n]+)/i,
        /PRODUCTO:\s*([^\n]+)/i,
        /producto:\s*([^\n]+)/i
      ],
      categoria: [
        /\d+\.\s*CATEGORIA:\s*([^\n]+)/i,
        /CATEGORIA:\s*([^\n]+)/i,
        /categoria:\s*([^\n]+)/i,
        /Categoría:\s*([^\n]+)/i
      ],
      indicaciones_uso: [
        /\d+\.\d+\.\d+\.\s*INDICACIONES\s+DE\s+USO:\s*([\s\S]*?)(?=\d+\.\d+\.\d+\.|$)/i,
        /\d+\.\d+\.\s*INDICACIONES\s+DE\s+USO:\s*([\s\S]*?)(?=\d+\.\d+\.|$)/i,
        /INDICACIONES\s+DE\s+USO:\s*([\s\S]*?)(?=\d+\.|$)/i,
        /INDICACIONES\s+DE\s+USO:\s*([\s\S]*?)(?=PRESENTACIONES|DESCRIPCION|EDAD|CONDICIONES|NECESIDADES|$)/i
      ],
      edad_momento_vida: [
        /\d+\.\d+\.\d+\.\s*EDAD\s+O\s+MOMENTO\s+DE\s+VIDA:\s*([\s\S]*?)(?=\d+\.\d+\.\d+\.|$)/i,
        /\d+\.\d+\.\s*EDAD\s+O\s+MOMENTO\s+DE\s+VIDA:\s*([\s\S]*?)(?=\d+\.\d+\.|$)/i,
        /EDAD\s+O\s+MOMENTO\s+DE\s+VIDA:\s*([\s\S]*?)(?=\d+\.|$)/i
      ],
      condiciones: [
        /\d+\.\d+\.\d+\.\s*CONDICIONES\s+MEDICAS[^:]*:\s*([\s\S]*?)(?=\d+\.\d+\.\d+\.|$)/i,
        /\d+\.\d+\.\s*CONDICIONES\s+MEDICAS[^:]*:\s*([\s\S]*?)(?=\d+\.\d+\.|$)/i,
        /CONDICIONES\s+MEDICAS[^:]*:\s*([\s\S]*?)(?=\d+\.|$)/i
      ],
      necesidades: [
        /\d+\.\d+\.\d+\.\s*NECESIDADES[^:]*:\s*([\s\S]*?)(?=\d+\.\d+\.\d+\.|$)/i,
        /\d+\.\d+\.\s*NECESIDADES[^:]*:\s*([\s\S]*?)(?=\d+\.\d+\.|$)/i,
        /NECESIDADES[^:]*:\s*([\s\S]*?)(?=\d+\.|$)/i
      ],
      palabras_clave: [
        /\d+\.\d+\.\d+\.\s*ASOCIACIONES\s+O\s+PALABRAS[^:]*:\s*([^\n]+(?:\n[^\d]+)*)/i,
        /\d+\.\d+\.\s*ASOCIACIONES\s+O\s+PALABRAS[^:]*:\s*([^\n]+(?:\n[^\d]+)*)/i,
        /ASOCIACIONES\s+O\s+PALABRAS[^:]*:\s*([^\n]+(?:\n[^\d]+)*)/i
      ],
      textura: [
        /\d+\.\d+\.\d+\.\s*TEXTURA:\s*([^\n]+)/i,
        /\d+\.\d+\.\s*TEXTURA:\s*([^\n]+)/i,
        /TEXTURA:\s*([^\n]+)/i
      ],
      contenido: [
        /\d+\.\d+\.\d+\.\d+\.\s*[^:]+:\s*(\d+\s*ML|\d+\s*unidades)/i,
        /(\d+\s*ML|\d+\s*unidades)/i
      ],
      duracion: [
        /duración[^:]*:\s*([^\n]+)/i,
        /duracion[^:]*:\s*([^\n]+)/i
      ]
    };

    const fieldPatterns = patterns[fieldLower] || [];
    for (const pattern of fieldPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let extracted = match[1].trim();
        // Limpiar el texto extraído (eliminar números de sección al inicio)
        extracted = extracted.replace(/^\d+\.\d*\.\d*\.?\s*/, '').trim();
        if (extracted.length > 0) {
          return extracted;
        }
      }
    }

    // Si no se encuentra con patrones específicos, buscar cualquier línea que contenga el nombre del campo
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes(fieldLower.replace(/_/g, ' ')) || 
          line.toLowerCase().includes(fieldLower.replace(/_/g, '_'))) {
        // Buscar el valor después de los dos puntos
        const match = line.match(/:\s*(.+)/i);
        if (match && match[1]) {
          let value = match[1].trim();
          // Si el valor es corto, podría estar en la misma línea
          if (value.length < 200 && i < lines.length - 1) {
            // Intentar obtener más líneas si el valor parece incompleto
            let nextLines = '';
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              if (lines[j].match(/^\d+\./)) break; // Detener si encontramos una nueva sección numerada
              nextLines += lines[j] + ' ';
            }
            if (nextLines.trim().length > 0) {
              value += ' ' + nextLines.trim();
            }
          }
          return value.trim();
        }
      }
    }

    return '';
  };

  // Cargar campos del índice desde un documento de ejemplo
  const loadIndexFields = async () => {
    if (!selectedIndex) return;
    
    try {
      // Obtener settings del índice para detectar campos requeridos por el embedder
      const settings = await meilisearchAPI.getIndexSettings(selectedIndex.uid);
      setIndexSettings(settings);
      
      // Detectar campos requeridos por el embedder
      const requiredFieldsList: string[] = [];
      if (settings.embedders && Object.keys(settings.embedders).length > 0) {
        const embedder = Object.values(settings.embedders)[0] as any;
        if (embedder.documentTemplate) {
          const fields = extractRequiredFields(embedder.documentTemplate);
          requiredFieldsList.push(...fields);
          console.log('[PDF-UPLOAD] Campos requeridos por embedder:', fields);
        }
      }

      // Obtener un documento de ejemplo para ver la estructura
      const documents = await meilisearchAPI.getDocuments(selectedIndex.uid, 1, 0);
      if (documents.results.length > 0) {
        const sampleDoc = documents.results[0];
        const fields = Object.keys(sampleDoc);
        setIndexFields(fields);
        
        // Analizar tipos de datos de cada campo
        const fieldsWithTypes = fields.map(field => {
          const value = sampleDoc[field];
          let type = 'string';
          if (typeof value === 'number') {
            type = Number.isInteger(value) ? 'integer' : 'number';
          } else if (typeof value === 'boolean') {
            type = 'boolean';
          } else if (Array.isArray(value)) {
            type = 'array';
          } else if (value && typeof value === 'object') {
            type = 'object';
          }
          
          return {
            name: field,
            type,
            required: requiredFieldsList.includes(field)
          };
        });
        setAllIndexFields(fieldsWithTypes);
        console.log('[PDF-UPLOAD] Campos del índice con tipos:', fieldsWithTypes);
        
        // Seleccionar primeros campos por defecto si existen
        if (fields.length > 0) {
          setSelectedIdField(fields[0]);
          if (fields.length > 1) {
            setSelectedTextField(fields[1]);
          } else {
            setSelectedTextField(fields[0]);
          }
        }

        // Configurar campos requeridos con valores extraídos del PDF si está disponible
        if (requiredFieldsList.length > 0 && pdfText) {
          const extractedFields = requiredFieldsList.map(field => ({
            field,
            value: extractFieldValue(pdfText, field)
          }));
          setRequiredFields(extractedFields);
          console.log('[PDF-UPLOAD] Campos requeridos con valores extraídos:', extractedFields);
        } else if (requiredFieldsList.length > 0) {
          // Si no hay texto PDF aún, inicializar con valores vacíos
          setRequiredFields(requiredFieldsList.map(field => ({ field, value: '' })));
        }
      } else {
        // Si no hay documentos, usar campos comunes
        const commonFields = ['id', 'text', 'content', 'title', 'body'];
        setIndexFields(commonFields);
        setSelectedIdField(commonFields[0]);
        setSelectedTextField(commonFields[1] || commonFields[0]);

        // Configurar campos requeridos
        if (requiredFieldsList.length > 0 && pdfText) {
          const extractedFields = requiredFieldsList.map(field => ({
            field,
            value: extractFieldValue(pdfText, field)
          }));
          setRequiredFields(extractedFields);
        } else if (requiredFieldsList.length > 0) {
          setRequiredFields(requiredFieldsList.map(field => ({ field, value: '' })));
        }
      }
    } catch (error) {
      console.error('[PDF-UPLOAD] Error cargando campos del índice:', error);
      // Campos por defecto
      const defaultFields = ['id', 'text', 'content'];
      setIndexFields(defaultFields);
      setSelectedIdField(defaultFields[0]);
      setSelectedTextField(defaultFields[1]);
    }
  };

  // Validar tipo de dato
  const validateFieldType = (value: any, expectedType: string): { valid: boolean; error?: string } => {
    if (value === null || value === undefined || value === '') {
      return { valid: true }; // Valores vacíos son válidos (se pueden requerir después)
    }

    switch (expectedType) {
      case 'integer':
        const intValue = parseInt(String(value), 10);
        if (isNaN(intValue)) {
          return { valid: false, error: `Debe ser un número entero, recibido: "${value}"` };
        }
        return { valid: true };
      case 'number':
        const numValue = parseFloat(String(value));
        if (isNaN(numValue)) {
          return { valid: false, error: `Debe ser un número, recibido: "${value}"` };
        }
        return { valid: true };
      case 'boolean':
        const strValue = String(value).toLowerCase();
        if (strValue !== 'true' && strValue !== 'false' && strValue !== '1' && strValue !== '0') {
          return { valid: false, error: `Debe ser true/false, recibido: "${value}"` };
        }
        return { valid: true };
      case 'array':
        try {
          const parsed = JSON.parse(String(value));
          if (!Array.isArray(parsed)) {
            return { valid: false, error: `Debe ser un array JSON, recibido: "${value}"` };
          }
          return { valid: true };
        } catch {
          return { valid: false, error: `Debe ser un array JSON válido, recibido: "${value}"` };
        }
      case 'object':
        try {
          const parsed = JSON.parse(String(value));
          if (typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { valid: false, error: `Debe ser un objeto JSON, recibido: "${value}"` };
          }
          return { valid: true };
        } catch {
          return { valid: false, error: `Debe ser un objeto JSON válido, recibido: "${value}"` };
        }
      case 'string':
      default:
        return { valid: true };
    }
  };

  // Estructurar chunk con OpenAI
  const structureChunkWithAI = async (chunkText: string, chunkIndex: number): Promise<Record<string, any> | null> => {
    try {
      setStructuringProgress(prev => ({
        ...prev,
        [chunkIndex]: { status: 'processing', message: 'Enviando a OpenAI...' }
      }));

      const response = await fetch('/api/openai/structure-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkText,
          fields: allIndexFields.map(field => ({
            name: field.name,
            type: field.type,
            required: field.required || requiredFields.some(rf => rf.field === field.name)
          }))
        })
      });

      const result = await response.json();

      if (!result.success || !result.structuredData) {
        throw new Error(result.error || 'Error desconocido al estructurar chunk');
      }

      setStructuringProgress(prev => ({
        ...prev,
        [chunkIndex]: { status: 'succeeded', message: 'Estructurado correctamente' }
      }));

      return result.structuredData;
    } catch (error: any) {
      console.error(`[PDF-UPLOAD] Error estructurando chunk ${chunkIndex + 1}:`, error);
      setStructuringProgress(prev => ({
        ...prev,
        [chunkIndex]: { status: 'failed', message: error.message || 'Error al estructurar' }
      }));
      return null;
    }
  };

  // Dividir texto en chunks y generar IDs
  const prepareChunks = async () => {
    if (!pdfText || pdfText.includes('Error:')) return;
    
    // Dividir por [separador]
    const chunks = pdfText.split('[separador]').map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
    
    // Generar IDs para cada chunk
    const chunksWithIds = chunks.map((text, index) => {
      const id = pdfIdPrefix ? `${pdfIdPrefix}${Date.now()}-${index + 1}` : `chunk-${Date.now()}-${index + 1}`;
      return { id, text };
    });
    
    setPreparedChunks(chunksWithIds);
    
    // Inicializar progreso de estructuración
    const initialProgress: Record<number, { status: 'pending' | 'processing' | 'succeeded' | 'failed'; message?: string }> = {};
    chunksWithIds.forEach((_, index) => {
      initialProgress[index] = { status: 'pending' };
    });
    setStructuringProgress(initialProgress);
    
    // Estructurar cada chunk con OpenAI
    setStructuringChunks(true);
    const structuredFields: Record<number, Record<string, any>> = {};
    
    for (let i = 0; i < chunksWithIds.length; i++) {
      const chunk = chunksWithIds[i];
      
      // Inicializar con ID y texto
      structuredFields[i] = {
        [selectedIdField]: chunk.id,
        [selectedTextField]: chunk.text
      };
      
      // Estructurar con OpenAI
      const aiStructured = await structureChunkWithAI(chunk.text, i);
      
      if (aiStructured) {
        // Combinar los campos estructurados por AI con ID y texto
        structuredFields[i] = {
          ...structuredFields[i],
          ...aiStructured
        };
      } else {
        // Si falla, usar extracción manual como fallback
        const extractedValues: Record<string, string> = {};
        requiredFields.forEach(({ field }) => {
          const value = extractFieldValue(chunk.text, field);
          if (value) {
            extractedValues[field] = value;
          }
        });
        
        requiredFields.forEach(({ field, value }) => {
          if (field !== selectedIdField && field !== selectedTextField) {
            const chunkValue = extractedValues[field] || extractFieldValue(chunk.text, field);
            structuredFields[i][field] = chunkValue || value || '';
          }
        });
        
        allIndexFields.forEach(fieldInfo => {
          if (!structuredFields[i].hasOwnProperty(fieldInfo.name)) {
            const extractedValue = extractFieldValue(chunk.text, fieldInfo.name);
            if (extractedValue) {
              structuredFields[i][fieldInfo.name] = extractedValue;
            }
          }
        });
      }
    }
    
    setChunkFields(structuredFields);
    setStructuringChunks(false);
    
    // Actualizar campos requeridos con valores extraídos si están vacíos
    if (requiredFields.length > 0 && chunks.length > 0) {
      const updatedFields = requiredFields.map(({ field, value }) => {
        if (!value) {
          const firstChunkValue = structuredFields[0]?.[field] || extractFieldValue(chunks[0] || '', field);
          return { field, value: firstChunkValue || '' };
        }
        return { field, value };
      });
      setRequiredFields(updatedFields);
    }
  };

  // Subir chunks a Meilisearch uno por uno
  const uploadChunks = async () => {
    if (!selectedIndex || preparedChunks.length === 0) {
      console.error('[PDF-UPLOAD] No hay índice seleccionado o chunks preparados');
      return;
    }

    console.log('[PDF-UPLOAD] Iniciando subida de chunks:', {
      indexUid: selectedIndex.uid,
      chunksCount: preparedChunks.length,
      idField: selectedIdField,
      textField: selectedTextField
    });

    setUploading(true);
    setUploadProgress([]);

    for (let i = 0; i < preparedChunks.length; i++) {
      const chunk = preparedChunks[i];
      console.log(`[PDF-UPLOAD] Procesando chunk ${i + 1}/${preparedChunks.length}:`, chunk);
      
      // Crear documento con todos los campos editados del chunk
      const chunkFieldValues = chunkFields[i] || {
        [selectedIdField]: chunk.id,
        [selectedTextField]: chunk.text
      };
      
      // Construir documento con todos los campos
      const document: any = {};
      
      // Agregar todos los campos que el usuario editó Y todos los campos requeridos por el embedder
      allIndexFields.forEach(fieldInfo => {
        const value = chunkFieldValues[fieldInfo.name];
        const isRequired = fieldInfo.required || requiredFields.some(rf => rf.field === fieldInfo.name);
        
        // Si el campo tiene valor, usarlo
        if (value !== undefined && value !== null && value !== '') {
          // Convertir según el tipo
          if (fieldInfo.type === 'integer') {
            document[fieldInfo.name] = parseInt(String(value), 10);
          } else if (fieldInfo.type === 'number') {
            document[fieldInfo.name] = parseFloat(String(value));
          } else if (fieldInfo.type === 'boolean') {
            document[fieldInfo.name] = String(value).toLowerCase() === 'true' || value === true || value === 1;
          } else if (fieldInfo.type === 'array' || fieldInfo.type === 'object') {
            try {
              document[fieldInfo.name] = typeof value === 'string' ? JSON.parse(value) : value;
            } catch {
              document[fieldInfo.name] = value;
            }
          } else {
            document[fieldInfo.name] = String(value);
          }
        } else if (isRequired) {
          // Si es requerido y está vacío, intentar extraer del texto del chunk
          const extractedValue = extractFieldValue(chunk.text, fieldInfo.name);
          if (extractedValue) {
            document[fieldInfo.name] = extractedValue;
          } else {
            // Si no se puede extraer, usar valor por defecto según tipo
            if (fieldInfo.type === 'integer' || fieldInfo.type === 'number') {
              document[fieldInfo.name] = 0;
            } else if (fieldInfo.type === 'boolean') {
              document[fieldInfo.name] = false;
            } else if (fieldInfo.type === 'array') {
              document[fieldInfo.name] = [];
            } else if (fieldInfo.type === 'object') {
              document[fieldInfo.name] = {};
            } else {
              document[fieldInfo.name] = '';
            }
          }
        } else {
          // Campo opcional con valor vacío - solo incluirlo si tiene valor
          if (value !== undefined && value !== null && value !== '') {
            if (fieldInfo.type === 'integer') {
              document[fieldInfo.name] = parseInt(String(value), 10);
            } else if (fieldInfo.type === 'number') {
              document[fieldInfo.name] = parseFloat(String(value));
            } else if (fieldInfo.type === 'boolean') {
              document[fieldInfo.name] = String(value).toLowerCase() === 'true' || value === true || value === 1;
            } else if (fieldInfo.type === 'array' || fieldInfo.type === 'object') {
              try {
                document[fieldInfo.name] = typeof value === 'string' ? JSON.parse(value) : value;
              } catch {
                document[fieldInfo.name] = value;
              }
            } else {
              document[fieldInfo.name] = String(value);
            }
          }
        }
      });
      
      // IMPORTANTE: Asegurar que todos los campos requeridos por el embedder estén presentes
      requiredFields.forEach(({ field }) => {
        if (!document.hasOwnProperty(field)) {
          // Intentar extraer del texto si aún no está
          const extractedValue = extractFieldValue(chunk.text, field);
          if (extractedValue) {
            document[field] = extractedValue;
          } else {
            // Valor por defecto para campos requeridos
            document[field] = '';
          }
        }
      });

      console.log(`[PDF-UPLOAD] Documento a crear:`, document);

      try {
        // Inicializar progreso
        setUploadProgress(prev => [...prev, {
          chunkIndex: i,
          taskUid: 0,
          status: 'pending',
          message: `Creando documento ${i + 1}/${preparedChunks.length}...`
        }]);

        console.log(`[PDF-UPLOAD] Llamando a addDocuments para chunk ${i + 1}...`);
        // Agregar documento a Meilisearch
        const response = await meilisearchAPI.addDocuments(selectedIndex.uid, [document]);
        console.log(`[PDF-UPLOAD] Respuesta de addDocuments:`, response);
        console.log(`[PDF-UPLOAD] Tipo de respuesta:`, typeof response);
        console.log(`[PDF-UPLOAD] Keys de respuesta:`, Object.keys(response || {}));
        
        // Meilisearch devuelve taskUid directamente o en response.taskUid
        const taskUid = response?.taskUid || (response as any)?.taskUid || response?.uid || 0;
        console.log(`[PDF-UPLOAD] Task UID extraído:`, taskUid);
        
        if (!taskUid || taskUid === 0) {
          console.warn(`[PDF-UPLOAD] No se encontró taskUid en la respuesta para chunk ${i + 1}`);
        }
        
        // Actualizar progreso con task UID
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[i] = {
            chunkIndex: i,
            taskUid: taskUid || 0,
            status: 'processing',
            message: taskUid > 0 ? `Task ${taskUid} generada. Consultando estado...` : 'Documento enviado, esperando confirmación...'
          };
          return updated;
        });

        // Consultar estado de la task cada 3 segundos hasta completar
        if (taskUid > 0) {
          console.log(`[PDF-UPLOAD] Iniciando seguimiento de task ${taskUid} para chunk ${i + 1}`);
          await checkTaskStatus(i, taskUid);
        } else {
          // Si no hay taskUid, esperar un momento y asumir éxito
          console.log(`[PDF-UPLOAD] No hay taskUid, esperando 2 segundos y asumiendo éxito...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          setUploadProgress(prev => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: 'succeeded',
              message: 'Documento creado exitosamente'
            };
            return updated;
          });
        }
      } catch (error: any) {
        console.error(`[PDF-UPLOAD] Error subiendo chunk ${i + 1}:`, error);
        console.error(`[PDF-UPLOAD] Error completo:`, JSON.stringify(error, null, 2));
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            status: 'failed',
            message: `Error: ${error.message || error.response?.data?.message || 'Error desconocido'}`
          };
          return updated;
        });
      }
    }

    console.log('[PDF-UPLOAD] Finalizada subida de todos los chunks');
    setUploading(false);
  };

  // Consultar estado de una task cada 3 segundos
  const checkTaskStatus = (chunkIndex: number, taskUid: number, maxAttempts: number = 60) => {
    console.log(`[PDF-UPLOAD] Iniciando seguimiento de task ${taskUid} para chunk ${chunkIndex}`);
    let attempts = 0;
    let intervalId: NodeJS.Timeout | null = null;
    let isCompleted = false;

    const checkTask = async () => {
      if (isCompleted) {
        console.log(`[PDF-UPLOAD] Task ${taskUid} ya completada, deteniendo intervalo`);
        if (intervalId) clearInterval(intervalId);
        return;
      }

      try {
        attempts++;
        console.log(`[PDF-UPLOAD] Consultando task ${taskUid} (intento ${attempts}/${maxAttempts})...`);
        
        const task = await meilisearchAPI.getTask(taskUid);
        console.log(`[PDF-UPLOAD] Respuesta completa de getTask:`, JSON.stringify(task, null, 2));
        console.log(`[PDF-UPLOAD] Tipo de task:`, typeof task);
        console.log(`[PDF-UPLOAD] Keys de task:`, task ? Object.keys(task) : 'task es null/undefined');
        
        // Meilisearch puede devolver status como 'succeeded', 'failed', 'enqueued', 'processing'
        // También puede estar en task.status, task.state, task.type, o directamente en la respuesta
        const status = task?.status || task?.state || task?.type || (task as any)?.task?.status || 'unknown';
        console.log(`[PDF-UPLOAD] Estado extraído de task ${taskUid}:`, status);
        
        if (status === 'succeeded' || status === 'taskSucceeded' || status === 'documentAdditionOrUpdate') {
          console.log(`[PDF-UPLOAD] ✅ Task ${taskUid} completada exitosamente`);
          isCompleted = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setUploadProgress(prev => {
            const updated = [...prev];
            if (updated[chunkIndex]) {
              updated[chunkIndex] = {
                ...updated[chunkIndex],
                status: 'succeeded',
                message: 'Documento procesado exitosamente'
              };
            }
            return updated;
          });
        } else if (status === 'failed' || status === 'taskFailed') {
          console.error(`[PDF-UPLOAD] ❌ Task ${taskUid} falló`);
          const error = task?.error || task?.errorMessage || (task as any)?.task?.error || 'Error desconocido';
          
          // Extraer mensaje de error de forma más legible
          let errorMessage = 'Error desconocido';
          if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && typeof error === 'object') {
            // Meilisearch devuelve error.message
            errorMessage = error.message || error.errorMessage || JSON.stringify(error);
          }
          
          // Limpiar mensaje de error para que sea más legible
          // Reemplazar saltos de línea y hacer más legible
          errorMessage = errorMessage
            .replace(/\\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          isCompleted = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setUploadProgress(prev => {
            const updated = [...prev];
            if (updated[chunkIndex]) {
              updated[chunkIndex] = {
                ...updated[chunkIndex],
                status: 'failed',
                message: errorMessage
              };
            }
            return updated;
          });
        } else {
          // Actualizar mensaje mientras procesa
          console.log(`[PDF-UPLOAD] ⏳ Task ${taskUid} aún procesando (${status})...`);
          setUploadProgress(prev => {
            const updated = [...prev];
            if (updated[chunkIndex]) {
              updated[chunkIndex] = {
                ...updated[chunkIndex],
                status: 'processing',
                message: `Procesando... (${status}) - intento ${attempts}/${maxAttempts}`
              };
            }
            return updated;
          });
        }

        // Si excede máximo de intentos, detener
        if (attempts >= maxAttempts && !isCompleted) {
          console.warn(`[PDF-UPLOAD] ⚠️ Task ${taskUid} excedió máximo de intentos`);
          isCompleted = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setUploadProgress(prev => {
            const updated = [...prev];
            if (updated[chunkIndex]) {
              updated[chunkIndex] = {
                ...updated[chunkIndex],
                status: 'failed',
                message: 'Tiempo de espera agotado'
              };
            }
            return updated;
          });
        }
      } catch (error: any) {
        console.error(`[PDF-UPLOAD] ❌ Error consultando task ${taskUid}:`, error);
        console.error(`[PDF-UPLOAD] Error completo:`, JSON.stringify(error, null, 2));
        console.error(`[PDF-UPLOAD] Error response:`, error.response?.data);
        isCompleted = true;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        setUploadProgress(prev => {
          const updated = [...prev];
          if (updated[chunkIndex]) {
            updated[chunkIndex] = {
              ...updated[chunkIndex],
              status: 'failed',
              message: `Error consultando task: ${error.message || error.response?.data?.message || 'Error desconocido'}`
            };
          }
          return updated;
        });
      }
    };

    // Primera consulta inmediata
    checkTask();
    
    // Luego consultar cada 3 segundos
    intervalId = setInterval(() => {
      if (!isCompleted) {
        checkTask();
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    }, 3000);
  };

  // Agregar separador en la posición del cursor
  const addSeparator = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = pdfText;
      
      // Guardar posición de scroll
      const scrollTop = textarea.scrollTop;
      
      // Insertar [separador] en la posición del cursor
      const newText = currentText.slice(0, start) + '[separador]' + currentText.slice(end);
      setPdfText(newText);
      
      // Restaurar posición del cursor y scroll después del separador
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPosition = start + '[separador]'.length;
          textareaRef.current.setSelectionRange(newPosition, newPosition);
          // Restaurar posición de scroll
          textareaRef.current.scrollTop = scrollTop;
        }
      }, 0);
    }
  };

  const loadAgentIndexes = async () => {
    if (!selectedAgent?.knowledge?.indexes) {
      setAvailableIndexes([]);
      setSelectedIndex(null);
      return;
    }

    setLoadingIndexes(true);
    try {
      const allIndexes = await meilisearchAPI.getIndexes();
      const agentIndexes = allIndexes.filter(index => 
        selectedAgent.knowledge?.indexes.includes(index.uid)
      );
      setAvailableIndexes(agentIndexes);
      
      // No seleccionar índice por defecto
      setSelectedIndex(null);
    } catch (error) {
      console.error('Error loading indexes:', error);
    } finally {
      setLoadingIndexes(false);
    }
  };

  // No seleccionar agente por defecto

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (data.ok && data.agents) {
          // Normalizar knowledge para garantizar estructura consistente
          const normalized = data.agents.map((a: any) => {
            let knowledge: any = { indexes: [] };
            try {
              if (a.knowledge) {
                if (typeof a.knowledge === 'string') {
                  knowledge = JSON.parse(a.knowledge);
                } else if (typeof a.knowledge === 'object') {
                  knowledge = a.knowledge;
                }
              }
            } catch (e) {
              console.error(`[ADMIN-CONOCIMIENTO] Error parsing knowledge for agent ${a.id}:`, e);
              knowledge = { indexes: [] };
            }
            if (!knowledge || typeof knowledge !== 'object') knowledge = { indexes: [] };
            if (!Array.isArray(knowledge.indexes)) knowledge.indexes = [];
            return { ...a, knowledge } as AgentDB;
          });
          console.log('[ADMIN-CONOCIMIENTO] Agents loaded:', normalized.length);
          console.log('[ADMIN-CONOCIMIENTO] Sample agent indexes:', normalized.slice(0, 3).map((x: any) => ({ id: x.id, indexes: x.knowledge?.indexes })));
          setAgents(normalized);
        }
      } catch (e) {
        console.error('Error cargando agentes:', e);
      } finally {
        setAgentsLoading(false);
      }
    };
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentIndexes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent]);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Conocimiento</h1>
        
        <div className="space-y-6">
          {/* Selector de Agente */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Agente
            </label>
            <select
              value={selectedAgent?.id || ''}
              onChange={(e) => {
                const agent = agents.find(a => a.id === parseInt(e.target.value));
                setSelectedAgent(agent || null);
                setSelectedIndex(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar agente...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {(() => { try { const k = typeof agent.knowledge === 'string' ? JSON.parse(agent.knowledge) : (agent.knowledge || {}); return k.indexes?.length ? `(${k.indexes.length} índices)` : '(sin índices)'; } catch { return '(sin índices)'; } })()}
                </option>
              ))}
            </select>
            {selectedAgent && (
              <div className="mt-3 flex items-center gap-3">
                {selectedAgent.photo && (
                  <img
                    src={selectedAgent.photo}
                    alt={selectedAgent.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{selectedAgent.name}</p>
                  {selectedAgent.description && (
                    <p className="text-sm text-gray-500">{selectedAgent.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lista de Índices del Agente */}
          {loadingIndexes ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : selectedAgent && availableIndexes.length > 0 ? (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Índice
                </label>
                <select
                  value={selectedIndex?.uid || ''}
                  onChange={(e) => {
                    const index = availableIndexes.find(i => i.uid === e.target.value);
                    setSelectedIndex(index || null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar índice...</option>
                  {availableIndexes.map((index) => (
                    <option key={index.uid} value={index.uid}>
                      {index.uid} {index.name ? `- ${index.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedIndex && (
                <>
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowPdfModal(true);
                          // Si hay progreso, ir directamente al paso de revisión
                          if (uploadProgress.length > 0) {
                            setPdfStep('review');
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        📄 Cargar PDF {uploadProgress.length > 0 && <span className="ml-1 text-xs">({uploadProgress.filter(p => p.status === 'failed').length} errores)</span>}
                      </button>
                    </div>
                  </div>

                  {/* Mostrar progreso FUERA del modal si existe */}
                  {uploadProgress.length > 0 && !showPdfModal && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          📊 Progreso de Subida de PDF
                          {uploading && <span className="ml-2 text-sm text-gray-500 font-normal">(en proceso...)</span>}
                          {!uploading && uploadProgress.every(p => p.status === 'succeeded' || p.status === 'failed') && (
                            <span className="ml-2 text-sm text-gray-500 font-normal">(completado)</span>
                          )}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowPdfModal(true);
                              setPdfStep('review');
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Ver detalles
                          </button>
                          {!uploading && (
                            <button
                              onClick={() => {
                                setUploadProgress([]);
                                setPreparedChunks([]);
                                setPdfStep('text');
                                setPdfText('');
                                setPdfIdPrefix('');
                              }}
                              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                              Limpiar
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-2xl font-bold text-green-700">
                            {uploadProgress.filter(p => p.status === 'succeeded').length}
                          </div>
                          <div className="text-sm text-green-600">Exitosos</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-2xl font-bold text-red-700">
                            {uploadProgress.filter(p => p.status === 'failed').length}
                          </div>
                          <div className="text-sm text-red-600">Errores</div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="text-2xl font-bold text-yellow-700">
                            {uploadProgress.filter(p => p.status === 'processing' || p.status === 'pending').length}
                          </div>
                          <div className="text-sm text-yellow-600">Procesando</div>
                        </div>
                      </div>
                      {uploadProgress.some(p => p.status === 'failed') && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg">
                          <h4 className="text-sm font-semibold text-red-800 mb-2">Errores detectados:</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {uploadProgress
                              .filter(p => p.status === 'failed')
                              .slice(0, 3)
                              .map((progress, idx) => (
                                <div key={idx} className="text-xs text-red-700">
                                  <strong>Chunk {progress.chunkIndex + 1}:</strong> {progress.message.substring(0, 150)}
                                  {progress.message.length > 150 && '...'}
                                </div>
                              ))}
                            {uploadProgress.filter(p => p.status === 'failed').length > 3 && (
                              <div className="text-xs text-red-600 italic">
                                ... y {uploadProgress.filter(p => p.status === 'failed').length - 3} error(es) más
                              </div>
                            )}
                          </div>
                          <div className="mt-3 text-xs text-red-800 bg-red-100 p-2 rounded">
                            <strong>Nota:</strong> El embedder del índice requiere el campo <code className="bg-red-200 px-1 rounded">producto</code>, pero solo se están enviando <code className="bg-red-200 px-1 rounded">{selectedIdField}</code> y <code className="bg-red-200 px-1 rounded">{selectedTextField}</code>. Ajusta el template del embedder o incluye todos los campos requeridos.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <IndexProperties indexUid={selectedIndex.uid} />
                  <DocumentList indexUid={selectedIndex.uid} />
                </>
              )}
            </>
          ) : selectedAgent && availableIndexes.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">
                {selectedAgent?.name} no tiene índices asociados. Configura su conocimiento desde la página de Agentes.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal para Cargar PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Cargar PDF</h2>
              <button
                onClick={() => {
                  // Solo limpiar si NO hay progreso activo o completado
                  if (!uploading && uploadProgress.length === 0) {
                    setShowPdfModal(false);
                    setPdfText('');
                    setPdfIdPrefix('');
                    setPdfStep('text');
                    setIndexFields([]);
                    setSelectedIdField('');
                    setSelectedTextField('');
                    setPreparedChunks([]);
                  } else {
                    // Si hay progreso, solo cerrar modal pero mantener progreso
                    setShowPdfModal(false);
                  }
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar archivo PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  disabled={loadingPdf}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      console.log('[PDF-UPLOAD] No se seleccionó ningún archivo');
                      return;
                    }
                    
                    console.log('[PDF-UPLOAD] Archivo seleccionado:', {
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      lastModified: new Date(file.lastModified).toISOString()
                    });
                    
                    setLoadingPdf(true);
                    setPdfText('');
                    
                    try {
                      console.log('[PDF-UPLOAD] Creando FormData...');
                      const formData = new FormData();
                      formData.append('file', file);
                      console.log('[PDF-UPLOAD] FormData creado, enviando a API...');
                      
                      const response = await fetch('/api/parse-pdf', {
                        method: 'POST',
                        body: formData
                      });
                      
                      console.log('[PDF-UPLOAD] Respuesta recibida:', {
                        status: response.status,
                        statusText: response.statusText,
                        ok: response.ok
                      });
                      
                      const data = await response.json();
                      console.log('[PDF-UPLOAD] Datos parseados (completo):', JSON.stringify(data, null, 2));
                      console.log('[PDF-UPLOAD] Datos parseados (resumen):', {
                        success: data.success,
                        textLength: data.text?.length || 0,
                        pages: data.pages,
                        hasText: !!data.text,
                        error: data.error,
                        debug: data.debug
                      });
                      
                      if (data.success && data.text) {
                        console.log('[PDF-UPLOAD] Éxito: Texto extraído, longitud:', data.text.length);
                        console.log('[PDF-UPLOAD] Primeros 200 caracteres:', data.text.substring(0, 200));
                        setPdfText(data.text);
                      } else {
                        console.error('[PDF-UPLOAD] Error: No se pudo extraer texto');
                        console.error('[PDF-UPLOAD] Datos de error (completo):', JSON.stringify(data, null, 2));
                        console.error('[PDF-UPLOAD] Error message:', data.error);
                        console.error('[PDF-UPLOAD] Debug info:', data.debug);
                        const errorMessage = data.error || 'Error desconocido';
                        setPdfText(`Error: No se pudo extraer texto del PDF. ${errorMessage}`);
                      }
                    } catch (error: any) {
                      console.error('[PDF-UPLOAD] Error al procesar PDF:', error);
                      console.error('[PDF-UPLOAD] Detalles del error (completo):', JSON.stringify({
                        message: error.message,
                        stack: error.stack,
                        name: error.name,
                        toString: error.toString()
                      }, null, 2));
                      setPdfText(`Error al procesar el PDF: ${error.message || 'Error desconocido'}`);
                    } finally {
                      setLoadingPdf(false);
                      console.log('[PDF-UPLOAD] Proceso completado');
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              
              {loadingPdf && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  <p className="ml-3 text-gray-600">Procesando PDF...</p>
                </div>
              )}
              
              
              {pdfText && pdfText.includes('Error:') && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{pdfText}</p>
                </div>
              )}

              {/* Indicador de estructuración con IA */}
              {structuringChunks && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-300 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">
                        Estructurando chunks con OpenAI...
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Procesando {Object.keys(structuringProgress).length} {Object.keys(structuringProgress).length === 1 ? 'chunk' : 'chunks'}...
                      </p>
                      <div className="mt-2 space-y-1">
                        {Object.entries(structuringProgress).map(([index, progress]) => (
                          <div key={index} className="text-xs text-blue-700">
                            Chunk {parseInt(index) + 1}: {progress.status === 'pending' ? '⏱ Pendiente' : 
                                                          progress.status === 'processing' ? '⏳ Procesando...' :
                                                          progress.status === 'succeeded' ? '✓ Completado' :
                                                          '✗ Error'}
                            {progress.message && ` - ${progress.message}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 1: Edición de texto */}
              {pdfStep === 'text' && pdfText && !pdfText.includes('Error:') && (
                <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prefijo del ID para Meilisearch <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pdfIdPrefix}
                      onChange={(e) => setPdfIdPrefix(e.target.value)}
                      placeholder="Ej: pdf-doc-"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Texto Extraído (editable)
                      </label>
                      <button
                        type="button"
                        onClick={addSeparator}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        ➕ Agregar Separador
                      </button>
                    </div>
                    <p className="mb-2 text-xs text-gray-500">
                      Haz clic en el botón &quot;Agregar Separador&quot; para insertar <code className="bg-gray-100 px-1 py-0.5 rounded">[separador]</code> en la posición del cursor. 
                      Cada <code className="bg-gray-100 px-1 py-0.5 rounded">[separador]</code> indica un punto de división entre chunks.
                    </p>
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        value={pdfText}
                        onChange={(e) => setPdfText(e.target.value)}
                        className="w-full h-96 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-mono overflow-auto focus:ring-2 focus:ring-blue-500 focus:border-blue-500 relative z-10"
                        style={{ 
                          position: 'relative',
                          zIndex: 10
                        }}
                      />
                      {/* Vista previa con separadores resaltados - overlay invisible */}
                      <div 
                        className="absolute inset-0 pointer-events-none px-4 py-2 text-sm font-mono whitespace-pre-wrap break-words overflow-auto border border-transparent rounded-lg"
                        style={{ 
                          zIndex: 1,
                          color: 'transparent',
                          userSelect: 'none'
                        }}
                        aria-hidden="true"
                      >
                        {pdfText.split('[separador]').map((part, index, array) => (
                          <React.Fragment key={index}>
                            {part}
                            {index < array.length - 1 && (
                              <span className="bg-blue-500 text-white font-bold px-1 rounded" style={{ color: 'transparent' }}>
                                [separador]
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      {/* Overlay con separadores visibles */}
                      <div 
                        className="absolute inset-0 pointer-events-none px-4 py-2 text-sm font-mono whitespace-pre-wrap break-words overflow-auto border border-transparent rounded-lg"
                        style={{ 
                          zIndex: 2,
                          background: 'transparent'
                        }}
                        aria-hidden="true"
                      >
                        {pdfText.split('[separador]').map((part, index, array) => {
                          // Calcular posición del texto para alinearlo con el textarea
                          const textBefore = array.slice(0, index).join('[separador]') + part;
                          return (
                            <React.Fragment key={index}>
                              <span style={{ visibility: 'hidden' }}>{part}</span>
                              {index < array.length - 1 && (
                                <span className="bg-blue-500 text-white font-bold px-1 rounded" style={{ visibility: 'visible' }}>
                                  [separador]
                                </span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                    {/* Indicador visual de separadores */}
                    <div className="mt-2 text-xs text-gray-500">
                      {pdfText.split('[separador]').length - 1 > 0 && (
                        <p className="text-blue-600">
                          {pdfText.split('[separador]').length - 1} separador(es) detectado(s) - 
                          <span className="bg-blue-500 text-white font-bold px-1 rounded font-mono">[separador]</span> resaltado en azul
                        </p>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      Chunks detectados: <strong>{calculateChunks(pdfText)}</strong> {calculateChunks(pdfText) === 1 ? 'chunk' : 'chunks'} 
                      ({pdfText.match(/\[separador\]/g)?.length || 0} separadores <code className="bg-gray-100 px-1 py-0.5 rounded">[separador]</code>)
                    </p>
                  </div>
                </div>
              )}

              {/* Paso 2: Selección de campos */}
              {pdfStep === 'fields' && (
                <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Seleccionar Campos del Índice
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Elige qué campos del índice <strong>{selectedIndex?.uid}</strong> se usarán para el ID y el texto del chunk.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campo para el ID
                    </label>
                    <select
                      value={selectedIdField}
                      onChange={(e) => setSelectedIdField(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {indexFields.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campo para el Texto del Chunk
                    </label>
                    <select
                      value={selectedTextField}
                      onChange={(e) => setSelectedTextField(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {indexFields.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campos requeridos por el embedder */}
                  {requiredFields.length > 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <h4 className="text-sm font-semibold text-yellow-800 mb-3">
                        ⚠️ Campos Requeridos por el Embedder
                      </h4>
                      <p className="text-xs text-yellow-700 mb-3">
                        El embedder del índice requiere estos campos adicionales. Los valores se extraerán automáticamente del PDF, pero puedes ajustarlos manualmente:
                      </p>
                      <div className="space-y-3">
                        {requiredFields.map((fieldData, idx) => (
                          <div key={idx}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {fieldData.field}
                            </label>
                            <input
                              type="text"
                              value={fieldData.value}
                              onChange={(e) => {
                                const updated = [...requiredFields];
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                setRequiredFields(updated);
                              }}
                              placeholder={`Valor para ${fieldData.field} (se extraerá del PDF si está vacío)`}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {fieldData.value && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Valor configurado: &quot;{fieldData.value}&quot;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

                {/* Paso 3: Verificación final */}
                {pdfStep === 'review' && (
                  <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Verificación Final de Chunks
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Revisa y edita todos los campos de cada chunk antes de enviarlos al índice <strong>{selectedIndex?.uid}</strong>.
                    </p>
                    
                    {/* Mostrar chunks con todos sus campos editables */}
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {preparedChunks.map((chunk, index) => {
                        const progress = uploadProgress.find(p => p.chunkIndex === index);
                        const chunkFieldValues = chunkFields[index] || {
                          [selectedIdField]: chunk.id,
                          [selectedTextField]: chunk.text
                        };
                        
                        return (
                          <div key={index} className={`p-4 border-2 rounded-lg ${
                            progress?.status === 'succeeded' ? 'bg-green-50 border-green-300' :
                            progress?.status === 'failed' ? 'bg-red-50 border-red-300' :
                            progress?.status === 'processing' ? 'bg-yellow-50 border-yellow-300' :
                            progress?.status === 'pending' ? 'bg-blue-50 border-blue-300' :
                            'bg-white border-gray-300'
                          }`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="text-sm font-semibold text-gray-800">
                                    Chunk {index + 1} de {preparedChunks.length}
                                  </p>
                                  {progress && (
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                      progress.status === 'succeeded' ? 'bg-green-500 text-white' :
                                      progress.status === 'failed' ? 'bg-red-500 text-white' :
                                      progress.status === 'processing' ? 'bg-yellow-500 text-white' :
                                      'bg-blue-500 text-white'
                                    }`}>
                                      {progress.status === 'succeeded' ? '✓ Enviado' :
                                       progress.status === 'failed' ? '✗ Error' :
                                       progress.status === 'processing' ? '⏳ Procesando' :
                                       '⏱ Pendiente'}
                                    </span>
                                  )}
                                </div>
                                {progress && progress.taskUid > 0 && (
                                  <p className="text-xs text-gray-600 mb-1">
                                    <strong>Task UID:</strong> {progress.taskUid}
                                  </p>
                                )}
                                {progress && (
                                  <p className={`text-xs mb-2 ${
                                    progress.status === 'failed' ? 'text-red-700 font-medium' :
                                    progress.status === 'succeeded' ? 'text-green-700' :
                                    'text-gray-600'
                                  }`}>
                                    <strong>Estado:</strong> {progress.message}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Campos editables del chunk */}
                            <div className="space-y-3 mt-4 border-t border-gray-200 pt-3">
                              <h4 className="text-xs font-semibold text-gray-700 mb-2">
                                Campos del Documento:
                              </h4>
                              {allIndexFields.map((fieldInfo) => {
                                const fieldValue = chunkFieldValues[fieldInfo.name] || '';
                                const validation = validateFieldType(fieldValue, fieldInfo.type);
                                const isRequired = fieldInfo.required || requiredFields.some(rf => rf.field === fieldInfo.name);
                                
                                return (
                                  <div key={fieldInfo.name} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                        {fieldInfo.name}
                                        {isRequired && (
                                          <span className="text-red-500 font-bold" title="Campo obligatorio">*</span>
                                        )}
                                        <span className="text-gray-400 text-xs font-normal">
                                          ({fieldInfo.type})
                                        </span>
                                      </label>
                                    </div>
                                    {fieldInfo.name === selectedTextField && fieldInfo.type === 'string' ? (
                                      <textarea
                                        value={fieldValue}
                                        onChange={(e) => {
                                          setChunkFields(prev => ({
                                            ...prev,
                                            [index]: {
                                              ...prev[index],
                                              [fieldInfo.name]: e.target.value
                                            }
                                          }));
                                        }}
                                        className={`w-full px-3 py-2 text-xs border rounded-lg ${
                                          !validation.valid ? 'border-red-500 bg-red-50' :
                                          isRequired && !fieldValue ? 'border-yellow-500 bg-yellow-50' :
                                          'border-gray-300 bg-white'
                                        }`}
                                        rows={3}
                                        placeholder={isRequired ? `Campo obligatorio (${fieldInfo.type})` : `Campo opcional (${fieldInfo.type})`}
                                      />
                                    ) : (
                                      <input
                                        type={fieldInfo.type === 'number' || fieldInfo.type === 'integer' ? 'number' : 'text'}
                                        value={fieldValue}
                                        onChange={(e) => {
                                          let value: any = e.target.value;
                                          if (fieldInfo.type === 'number' || fieldInfo.type === 'integer') {
                                            value = e.target.value === '' ? '' : (fieldInfo.type === 'integer' ? parseInt(value, 10) : parseFloat(value));
                                          } else if (fieldInfo.type === 'boolean') {
                                            value = e.target.value === 'true' || e.target.value === '1';
                                          }
                                          
                                          setChunkFields(prev => ({
                                            ...prev,
                                            [index]: {
                                              ...prev[index],
                                              [fieldInfo.name]: value
                                            }
                                          }));
                                        }}
                                        className={`w-full px-3 py-2 text-xs border rounded-lg ${
                                          !validation.valid ? 'border-red-500 bg-red-50' :
                                          isRequired && !fieldValue ? 'border-yellow-500 bg-yellow-50' :
                                          'border-gray-300 bg-white'
                                        }`}
                                        placeholder={isRequired ? `Campo obligatorio (${fieldInfo.type})` : `Campo opcional (${fieldInfo.type})`}
                                      />
                                    )}
                                    {!validation.valid && (
                                      <p className="text-xs text-red-600">
                                        ⚠️ {validation.error}
                                      </p>
                                    )}
                                    {isRequired && !fieldValue && !progress && (
                                      <p className="text-xs text-yellow-600">
                                        ⚠️ Este campo es obligatorio
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {progress && progress.status === 'failed' && (
                              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                                <strong>❌ Error al procesar:</strong>
                                <div className="mt-1 font-mono text-xs bg-red-200 p-2 rounded break-words">
                                  {progress.message}
                                </div>
                              </div>
                            )}
                            {progress && progress.status === 'succeeded' && (
                              <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800">
                                <strong>✓ Éxito:</strong> El documento fue creado correctamente en el índice.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {!uploading && uploadProgress.length === 0 && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Resumen:</strong> Se crearán {preparedChunks.length} {preparedChunks.length === 1 ? 'documento' : 'documentos'} en el índice.
                        </p>
                      </div>
                    )}

                    {/* Resumen del progreso */}
                    {uploadProgress.length > 0 && (
                      <div className={`p-4 border rounded-lg ${
                        uploadProgress.every(p => p.status === 'succeeded') ? 'bg-green-50 border-green-300' :
                        uploadProgress.some(p => p.status === 'failed') ? 'bg-red-50 border-red-300' :
                        'bg-yellow-50 border-yellow-300'
                      }`}>
                        <div className="grid grid-cols-3 gap-3 mb-2">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-700">
                              {uploadProgress.filter(p => p.status === 'succeeded').length}
                            </div>
                            <div className="text-xs text-green-600">Exitosos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-700">
                              {uploadProgress.filter(p => p.status === 'failed').length}
                            </div>
                            <div className="text-xs text-red-600">Errores</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-700">
                              {uploadProgress.filter(p => p.status === 'processing' || p.status === 'pending').length}
                            </div>
                            <div className="text-xs text-yellow-600">Procesando</div>
                          </div>
                        </div>
                        {uploading && (
                          <p className="text-sm text-center text-gray-600 mt-2">
                            ⏳ Subiendo chunks... Por favor espera.
                          </p>
                        )}
                        {!uploading && uploadProgress.every(p => p.status === 'succeeded' || p.status === 'failed') && (
                          <p className="text-sm text-center text-gray-600 mt-2">
                            {uploadProgress.every(p => p.status === 'succeeded') 
                              ? '✅ Todos los chunks se procesaron exitosamente'
                              : '⚠️ Algunos chunks tuvieron errores. Revisa los detalles arriba.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  // Solo limpiar si NO hay progreso activo o completado
                  // Si hay progreso, mantenerlo para referencia
                  if (!uploading && uploadProgress.length === 0) {
                    setShowPdfModal(false);
                    setPdfText('');
                    setPdfIdPrefix('');
                    setPdfStep('text');
                    setIndexFields([]);
                    setSelectedIdField('');
                    setSelectedTextField('');
                    setPreparedChunks([]);
                  } else if (!uploading) {
                    // Si hay progreso pero no está subiendo, solo cerrar modal pero mantener progreso y paso
                    setShowPdfModal(false);
                    // Mantener pdfStep en 'review' para que al reabrir muestre el progreso
                    // Mantener uploadProgress visible para referencia
                  } else {
                    // Si está subiendo, solo cerrar el modal pero mantener todo
                    setShowPdfModal(false);
                  }
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {uploading ? 'Cerrar (subiendo...)' : uploadProgress.length > 0 ? 'Cerrar (ver resultados)' : 'Cerrar'}
              </button>
              {pdfText && !pdfText.includes('Error:') && (
                <div className="flex gap-2">
                  {/* Botón Anterior */}
                  {(pdfStep === 'fields' || pdfStep === 'review') && (
                    <button
                      onClick={() => {
                        if (pdfStep === 'fields') {
                          setPdfStep('text');
                        } else if (pdfStep === 'review') {
                          setPdfStep('fields');
                        }
                      }}
                      disabled={uploading}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                  )}
                  
                  {/* Botón Siguiente/Finalizar */}
                  <button
                    onClick={async () => {
                      if (pdfStep === 'text') {
                        // Validar prefijo del ID
                        if (!pdfIdPrefix || pdfIdPrefix.trim() === '') {
                          alert('El prefijo del ID es obligatorio');
                          return;
                        }
                        // Paso 1: Ir al paso de selección de campos
                        await loadIndexFields();
                        setPdfStep('fields');
                      } else if (pdfStep === 'fields') {
                        // Paso 2: Preparar chunks y mostrar verificación
                        await prepareChunks();
                        setPdfStep('review');
                      } else if (pdfStep === 'review' && !uploading) {
                        // Paso 3: Subir chunks a Meilisearch
                        await uploadChunks();
                      }
                    }}
                    disabled={
                      (pdfStep === 'text' && (!pdfIdPrefix || pdfIdPrefix.trim() === '')) ||
                      (pdfStep === 'fields' && (!selectedIdField || !selectedTextField)) ||
                      uploading ||
                      structuringChunks
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {uploading && (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    )}
                    {structuringChunks && (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    )}
                    {pdfStep === 'text' ? 'Siguiente' : 
                     pdfStep === 'fields' ? 'Siguiente' : 
                     uploading ? 'Subiendo...' : 'Finalizar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


