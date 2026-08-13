module.exports = {
  apps: [
    {
      name: "makazicloud-api",
      cwd: "/home/bidan/makazicloud",
      script: "apps/api/dist/src/main.js",
      interpreter: "node",
      instances: process.env.API_INSTANCES || 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: "4100",
        APP_BASE_URL: "https://makazicloud.com",
        WEB_ORIGIN: "https://makazicloud.com",
        WEB_ALLOWED_HOSTS: "https://www.makazicloud.com",
        API_BODY_LIMIT: "1mb",
        API_DASHBOARD_CACHE_TTL_MS:
          process.env.API_DASHBOARD_CACHE_TTL_MS || "30000",
        API_PRIVATE_DATA_CACHE_TTL_MS:
          process.env.API_PRIVATE_DATA_CACHE_TTL_MS || "15000",
        API_PUBLIC_LISTINGS_CACHE_TTL_MS:
          process.env.API_PUBLIC_LISTINGS_CACHE_TTL_MS || "300000",
        API_MEMORY_CACHE_MAX_ENTRIES:
          process.env.API_MEMORY_CACHE_MAX_ENTRIES || "250",
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM:
          process.env.EMAIL_FROM ||
          "MakaziCloud <noreply@support.makazicloud.com>",
        MPESA_CONFIG_SECRET: process.env.MPESA_CONFIG_SECRET,
        SMS_CONFIG_SECRET: process.env.SMS_CONFIG_SECRET,
        TECHCHRAST_SMS_URL: process.env.TECHCHRAST_SMS_URL,
        TECHCHRAST_SMS_BALANCE_URL: process.env.TECHCHRAST_SMS_BALANCE_URL,
        TECHCHRAST_SMS_CLIENT_ID: process.env.TECHCHRAST_SMS_CLIENT_ID,
        TECHCHRAST_SMS_TOKEN: process.env.TECHCHRAST_SMS_TOKEN,
      },
    },
    {
      name: "makazicloud-web",
      cwd: "/home/bidan/makazicloud/apps/web",
      script: "node_modules/.bin/react-router-serve",
      args: "./build/server/index.js",
      instances: process.env.WEB_INSTANCES || 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: "3100",
        VITE_API_BASE_URL: "https://makazicloud.com/api",
        VITE_SITE_URL: "https://makazicloud.com",
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM:
          process.env.EMAIL_FROM ||
          "MakaziCloud <noreply@support.makazicloud.com>",
      },
    },
  ],
};
