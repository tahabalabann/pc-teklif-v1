module.exports = {
  apps: [
    {
      name: "pc-teklif-api",
      script: "server/index.js",
      cwd: "/var/www/pc-teklif-v1",
      env: {
        NODE_ENV: "production",
        PORT: "8787",
      },
    },
  ],
};
