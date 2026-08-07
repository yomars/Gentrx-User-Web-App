module.exports = {
  apps: [
    {
      name: "gentrx-main",
      cwd: "/var/www/gentrx-user-web-app",
      script: "serve",
      args: "-s dist -l 3000",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
