module.exports = {
  apps: [
    {
      name: 'gaindeuk-backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        MONGODB_URI: 'mongodb://localhost:27017/gaindeuk',
        REDIS_URL: 'redis://localhost:6379',
        SCHEDULER_ENABLED: 'true',
        LOG_LEVEL: 'info'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        MONGODB_URI: process.env.MONGODB_URI,
        REDIS_URL: process.env.REDIS_URL,
        SCHEDULER_ENABLED: 'true',
        LOG_LEVEL: 'warn'
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
