module.exports = {
  apps: [{
    name: 'admin-meilisearch',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: process.cwd(),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8989
    }
  }]
};

