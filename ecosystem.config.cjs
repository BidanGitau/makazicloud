module.exports = {
  apps: [
    {
      name: "makazicloud-api",
      cwd: "/home/bidan/makazicloud",
      script: "apps/api/dist/src/main.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "4100",
        APP_BASE_URL: "https://makazicloud.com",
        WEB_ORIGIN: "https://makazicloud.com",
        WEB_ALLOWED_HOSTS: "https://www.makazicloud.com",
        API_BODY_LIMIT: "1mb",
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM:
          process.env.EMAIL_FROM || "MakaziCloud <noreply@contact.makazicloud.com>",
      },
    },
    {
      name: "makazicloud-web",
      cwd: "/home/bidan/makazicloud/apps/web",
      script: "node_modules/.bin/react-router-serve",
      args: "./build/server/index.js",
      env: {
        NODE_ENV: "production",
        PORT: "3100",
        VITE_API_BASE_URL: "https://makazicloud.com/api",
        VITE_SITE_URL: "https://makazicloud.com",
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM:
          process.env.EMAIL_FROM || "MakaziCloud <noreply@contact.makazicloud.com>",
      },
    },
  ],
};
