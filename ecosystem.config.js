/**
 * Flow Balance - PM2 Ecosystem Configuration
 * 生产环境进程管理配置
 */

module.exports = {
  apps: [
    {
      name: 'flow-balance',
      script: 'server.js',
      cwd: './',
      instances: 'max', // 使用所有 CPU 核心
      exec_mode: 'cluster',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1,
      },

      // 生产环境变量
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1,
      },

      // 开发环境变量
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1,
      },

      // 自动重启配置
      watch: false, // 生产环境不建议开启文件监听
      ignore_watch: ['node_modules', '.next', 'logs', '*.log', '.git', 'data'],

      // 内存和 CPU 限制
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,

      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 进程配置
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // 健康检查
      health_check_grace_period: 3000,

      // 自动重启条件
      restart_delay: 4000,
      autorestart: true,

      // 集群配置
      instance_var: 'INSTANCE_ID',

      // 源码映射支持
      source_map_support: true,

      // 进程标题
      name: 'flow-balance-app',

      // 用户和组
      // user: 'www-data',
      // group: 'www-data',

      // 工作目录
      cwd: process.cwd(),

      // 启动脚本参数
      args: [],

      // Node.js 参数
      node_args: ['--max-old-space-size=1024', '--optimize-for-size'],

      // 环境变量文件
      env_file: '.env',

      // 错误处理
      crash_restart_delay: 1000,

      // 监控配置
      pmx: true,
      automation: false,

      // 实例配置
      increment_var: 'PORT',

      // 优雅关闭
      kill_retry_time: 100,

      // 时区设置
      time: true,

      // 日志轮转
      log_type: 'json',

      // 进程间通信
      disable_logs: false,

      // 性能监控
      monitoring: false,

      // 自定义指标
      custom_metrics: {
        'HTTP requests/sec': {
          unit: 'req/sec',
          historic: true,
        },
        'Memory usage': {
          unit: 'MB',
          historic: true,
        },
      },
    },
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/flow-balance.git',
      path: '/var/www/flow-balance',
      'pre-deploy-local': '',
      'post-deploy':
        'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: 'StrictHostKeyChecking=no',
    },

    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/flow-balance.git',
      path: '/var/www/flow-balance-staging',
      'post-deploy':
        'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env staging',
      ssh_options: 'StrictHostKeyChecking=no',
    },
  },
}
