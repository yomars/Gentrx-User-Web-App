module.exports = {
  apps: [
    {
      name: "gentrx-user-web",
      cwd: "/var/www/gentrx-user-web",
      script: "npx",
      args: "serve -s dist -l 4000",
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
