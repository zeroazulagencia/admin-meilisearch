module.exports = {
  apps: [{
    name: 'admin-meilisearch',
    script: 'node_modules/.bin/next',
    args: 'start -H 127.0.0.1 -p 8988',
    cwd: process.cwd(),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8988,
      HOST: '127.0.0.1'
    }
  }]
};
