// WebMCP Tools for admin-meilisearch
// Exposes site tools to AI agents via navigator.modelContext
// https://webmachinelearning.github.io/webmcp/

(function() {
  console.log('[WebMCP] Checking for navigator.modelContext...');
  
  // Check if WebMCP is supported
  if (typeof navigator === 'undefined' || !navigator.modelContext) {
    console.log('[WebMCP] navigator.modelContext not available');
    return;
  }
  
  console.log('[WebMCP] navigator.modelContext available, registering tools...');
  const tools = [
    {
      name: 'get_wp_clients',
      description: 'Get WordPress users (non-admin) from Biury with metadata',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          offset: { type: 'number' },
          email: { type: 'string' },
          search: { type: 'string' }
        }
      }
    },
    {
      name: 'get_zoho_contacts',
      description: 'Get Contacts from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          offset: { type: 'number' },
          email: { type: 'string' },
          phone: { type: 'string' }
        }
      }
    },
    {
      name: 'get_zoho_invoices',
      description: 'Get Invoices from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          offset: { type: 'number' },
          contact_id: { type: 'string' },
          invoice_number: { type: 'string' }
        }
      }
    },
    {
      name: 'get_zoho_products',
      description: 'Get Products catalog from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          offset: { type: 'number' },
          category: { type: 'string' }
        }
      }
    },
    {
      name: 'get_zoho_shipping_history',
      description: 'Get shipping address change history from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          contact_id: { type: 'string' }
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
          limit: { type: 'number' },
          offset: { type: 'number' },
          contact_id: { type: 'string' },
          status: { type: 'string' }
        }
      }
    },
    {
      name: 'get_zoho_cajas_adicionales',
      description: 'Get additional boxes from Zoho CRM',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          offset: { type: 'number' }
        }
      }
    },
    {
      name: 'get_treli_payment',
      description: 'Get payment details from Treli by payment ID',
      inputSchema: {
        type: 'object',
        properties: {
          payment_id: { type: 'string' }
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
          limit: { type: 'number' },
          start_date: { type: 'string' },
          end_date: { type: 'string' },
          cursor: { type: 'string' }
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
          api_token: { type: 'string' },
          zoho_client_id: { type: 'string' },
          zoho_client_secret: { type: 'string' },
          zoho_refresh_token: { type: 'string' },
          treli_token: { type: 'string' },
          treli_api_key: { type: 'string' }
        }
      }
    }
  ];

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

  // Build tools with execute functions
  const toolsWithExecute = tools.map(tool => ({
    ...tool,
    execute: async (params) => {
      const baseUrl = 'https://workers.zeroazul.com';
      const url = `${baseUrl}/api/custom-module13`;
      const path = pathMap[tool.name];
      if (!path) return { error: 'Unknown tool' };

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
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    }
  }));

  // Register tools using WebMCP API (tools as array, not object)
  navigator.modelContext.provideContext({
    name: 'admin-meilisearch',
    version: '1.0.0',
    tools: toolsWithExecute
  });
  
  console.log('[WebMCP] Tools registered:', tools.map(t => t.name).join(', '));
})();