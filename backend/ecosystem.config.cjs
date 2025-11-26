module.exports = {
  apps: [
    {
      name: 'super-agent-backend',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000 --reload',
      interpreter: 'python3',
      cwd: '/home/user/webapp/super-agent-platform/backend',
      env: {
        PYTHONUNBUFFERED: '1'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
