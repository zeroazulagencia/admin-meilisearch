'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import { CalendarDaysIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface RoadmapItem {
  date: string;
  title: string;
  description: string;
  completed: boolean;
}

export default function Roadmap() {
  // Obtener fecha de hoy en formato legible
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Obtener fecha de ayer en formato legible
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFormatted = yesterday.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Items del roadmap - Hoy y futuros
  const roadmapItems: RoadmapItem[] = [
    {
      date: todayFormatted,
      title: 'Mejoras en generación de PDFs',
      description: 'Implementación de indicador de carga, corrección de división de páginas, mejora del header con logo y corrección de superposición de elementos',
      completed: true,
    },
    {
      date: todayFormatted,
      title: 'Actualización de URL y branding',
      description: 'Cambio de URL a workers.zeroazul.com y mejora del header del PDF con logo DWORKERS',
      completed: true,
    },
    {
      date: yesterdayFormatted,
      title: 'Implementación de selectores de agentes con Headless UI',
      description: 'Actualización de todos los selectores de agentes en el sistema para usar el componente moderno con Headless UI',
      completed: true,
    },
    {
      date: yesterdayFormatted,
      title: 'Resaltado visual de separadores en PDFs',
      description: 'Mejora en la visualización de separadores [separador] en el proceso de carga de PDFs',
      completed: true,
    },
    {
      date: yesterdayFormatted,
      title: 'Agregación de servicios de consumo API',
      description: 'Integración de nuevos dashboards: AWS Lightsail, AWS Billing y RapidAPI',
      completed: true,
    },
    {
      date: yesterdayFormatted,
      title: 'Filtrado mejorado de agentes',
      description: 'Los listados ahora muestran solo agentes identificados según el contexto',
      completed: true,
    },
    {
      date: yesterdayFormatted,
      title: 'Modales de instrucciones con curl',
      description: 'Agregación de botones de código con instrucciones para inserción de datos en Meilisearch',
      completed: true,
    },
    {
      date: 'Pendiente',
      title: 'Sistema de permisos clientes funcional',
      description: 'Implementar y verificar que el sistema de permisos para clientes funcione correctamente',
      completed: false,
    },
    {
      date: 'Pendiente',
      title: 'Sincronizador NIT con Polar',
      description: 'Desarrollar sincronización automática del campo NIT con el sistema Polar',
      completed: false,
    },
    {
      date: todayFormatted,
      title: 'Operaciones WhatsApp',
      description: 'Selector de agente con configuración completa de WhatsApp',
      completed: true,
    },
    {
      date: 'Pendiente',
      title: 'Limpiar mensaje Amavu en amistoso',
      description: 'Mejorar y simplificar los mensajes de Amavu para que sean más amigables',
      completed: false,
    },
    {
      date: 'Pendiente',
      title: 'Simplificar vistas para cliente',
      description: 'Optimizar y simplificar las vistas de la interfaz para mejorar la experiencia del cliente',
      completed: false,
    },
    {
      date: 'Completado',
      title: 'Agregar cargar web en conocimiento',
      description: 'Implementar funcionalidad para cargar contenido web en el módulo de conocimiento',
      completed: true,
    },
    {
      date: 'Pendiente',
      title: 'Mostrar imágenes y archivos en conversaciones',
      description: 'Agregar visualización de imágenes de WhatsApp y web, así como archivos en las conversaciones',
      completed: false,
    },
    {
      date: 'Pendiente',
      title: 'Rango de fecha default en conversaciones',
      description: 'Configurar el rango de fechas por defecto en conversaciones para mostrar este mes hasta hoy',
      completed: false,
    },
    {
      date: 'Pendiente',
      title: 'Conectar Stripe',
      description: 'Integrar y conectar el sistema con Stripe para procesamiento de pagos',
      completed: false,
    },
    {
      date: 'Pendiente',
      title: 'Conectar Alegra',
      description: 'Integrar y conectar el sistema con Alegra para gestión contable',
      completed: false,
    },
    {
      date: 'Pendiente',
      title: 'Crear espacio de documentación del asistente',
      description: 'Desarrollar un espacio dedicado para documentar el asistente y sus funcionalidades',
      completed: false,
    },
    {
      date: 'Pendiente',
      title: 'Crear espacio de documentación de developers',
      description: 'Desarrollar un espacio dedicado para documentación técnica dirigida a desarrolladores',
      completed: false,
    },
  ];

  return (
    <ProtectedLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Roadmap</h1>
        <p className="text-gray-600">
          Seguimiento de mejoras y funcionalidades implementadas
        </p>
      </div>

      {/* Feed de Timeline */}
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {roadmapItems.map((item, itemIdx) => (
            <li key={itemIdx}>
              <div className="relative pb-8">
                {itemIdx !== roadmapItems.length - 1 ? (
                  <span
                    className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex items-start space-x-3">
                  <div className="relative">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white ${
                        item.completed ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    >
                      {item.completed ? (
                        <CheckCircleIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      ) : (
                        <CalendarDaysIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="text-sm">
                        <span className={`font-medium ${item.completed ? 'text-green-600' : 'text-gray-600'}`}>
                          {item.date}
                        </span>
                      </div>
                      <p className={`mt-0.5 text-lg font-semibold ${item.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                        {item.title}
                      </p>
                    </div>
                    <div className={`mt-2 text-sm ${item.completed ? 'text-gray-600' : 'text-gray-400'}`}>
                      <p>{item.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </ProtectedLayout>
  );
}

