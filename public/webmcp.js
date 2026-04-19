// WebMCP Tools for admin-meilisearch
// Exposes site tools to AI agents via navigator.modelContext

const WEBMCPSUPPORT = typeof navigator !== 'undefined' && navigator.modelContext;

if (WEBMCPSUPPORT) {
  const tools = [
    {
      name: 'get_wp_clients',
      description: 'Get WordPress users (non-admin) from Biury with metadata',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 100 },
          offset: { type: 'number', default: 0 },
          email: { type: 'string', description: 'Filter by email (contains)' },
          search: { type: 'string', description: 'Search in login, email, or display name' }
        }
      }
    },
    {
      name: 'get_zoho_contacts',
      description: 'Get Contacts from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 100 },
          offset: { type: 'number', default: 0 },
          email: { type: 'string', description: 'Filter by email' },
          phone: { type: 'string', description: 'Filter by phone' }
        }
      }
    },
    {
      name: 'get_zoho_invoices',
      description: 'Get Invoices from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
          contact_id: { type: 'string', description: 'Filter by contact ID' },
          invoice_number: { type: 'string', description: 'Filter by invoice number' }
        }
      }
    },
    {
      name: 'get_zoho_products',
      description: 'Get Products catalog from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
          category: { type: 'string', description: 'Filter by category' }
        }
      }
    },
    {
      name: 'get_zoho_shipping_history',
      description: 'Get shipping address change history from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Zoho contact ID (required)' }
        },
        required: ['contact_id']
      }
    },
    {
      name: 'get_zoho_cancelaciones',
      description: 'Get subscription cancellations from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
          contact_id: { type: 'string', description: 'Filter by contact ID' },
          status: { type: 'string', description: 'Filter by status (Pausada, Cancelada, Activa)' }
        }
      }
    },
    {
      name: 'get_zoho_cajas_adicionales',
      description: 'Get additional boxes from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    },
    {
      name: 'get_treli_payment',
      description: 'Get payment details from Treli by payment ID',
      inputSchema: {
        type: 'object',
        properties: {
          payment_id: { type: 'string', description: 'Payment ID (required)' }
        },
        required: ['payment_id']
      }
    },
    {
      name: 'get_treli_collections',
      description: 'Get approved collections/payments from Treli by date',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 100 },
          start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          cursor: { type: 'string', description: 'Pagination cursor' }
        }
      }
    },
    {
      name: 'get_module13_config',
      description: 'Get Module 13 configuration',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'set_module13_config',
      description: 'Set Module 13 configuration',
      inputSchema: {
        type: 'object',
        properties: {
          api_token: { type: 'string', description: 'API token for authentication' },
          zoho_client_id: { type: 'string', description: 'Zoho OAuth client ID' },
          zoho_client_secret: { type: 'string', description: 'Zoho OAuth client secret' },
          zoho_refresh_token: { type: 'string', description: 'Zoho OAuth refresh token' },
          treli_token: { type: 'string', description: 'Treli Basic auth token' },
          treli_api_key: { type: 'string', description: 'Treli API key (sk_live_...)' }
        }
      }
    }
  ];

  navigator.modelContext.provideContext({
    name: 'admin-meilisearch',
    version: '1.0.0',
    tools: tools.reduce((acc, tool) => {
      acc[tool.name] = {
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (params) => {
          const baseUrl = 'https://workers.zeroazul.com';
          let url = `${baseUrl}/api/custom-module13`;
          
          // Map tool names to API paths
          const pathMap = {
            get_wp_clients: '/biury/clientes',
            get_zoho_contacts: '/zoho/contacts',
            get_zoho_invoices: '/zoho/invoices',
            get_zoho_products: '/zoho/products',
            get_zoho_shipping_history: '/zoho/contact',
            get_zoho_cancelaciones: '/zoho/cancelaciones',
            get_zoho_cajas_adicionales: '/zoho/cajas-adicionales',
            get_treli_payment: '/treli/payment',
            get_treli_collections: '/treli/cobros',
            get_module13_config: '/config',
            set_module13_config: '/config'
          };
          
          const path = pathMap[tool.name];
          if (!path) return { error: 'Unknown tool' };
          
          // Build URL with params
          const searchParams = new URLSearchParams();
          for (const [key, value] of Object.entries(params || {})) {
            if (value !== undefined && value !== '') {
              searchParams.append(key, String(value));
            }
          }
          
          const fullUrl = `${url}${path}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
          
          try {
            const response = await fetch(fullUrl, {
              method: path.includes('config') && Object.keys(params || {}).length > 0 ? 'POST' : 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            return await response.json();
          } catch (error) {
            return { error: error.message };
          }
        }
      };
      return acc;
    }, {})
  });
  
  console.log('[WebMCP] Tools registered:', tools.map(t => t.name).join(', '));
}