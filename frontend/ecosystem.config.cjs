module.exports = {
  apps: [
    {
      name: 'super-agent-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/home/user/webapp/super-agent-platform/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
