module.exports = {
  apps: [{
    name: 'admin-meilisearch',
    script: 'npm',
    args: 'run dev',
    cwd: '/Users/admin/Desktop/dev/admin-florida',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 8989
    }
  }]
};

