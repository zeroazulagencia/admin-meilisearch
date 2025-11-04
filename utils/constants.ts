export const MEILISEARCH_CONFIG = {
  url: process.env.MEILISEARCH_URL || 'https://server-search.zeroazul.com/',
  apiKey: process.env.MEILISEARCH_API_KEY || ''
};

export const FIELD_TYPES = {
  STRING: 'string',
  HTML: 'html',
  ARRAY: 'array',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  OBJECT: 'object'
};


