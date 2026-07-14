module.exports = {
  apps: [
    {
      name: 'digi-office-backend',
      script: 'src/server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      },
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '300M'
    }
  ]
};