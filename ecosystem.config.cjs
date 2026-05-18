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
        VITE_API_BASE_URL: "http://161.97.75.132:4100/api",
      },
    },
  ],
};
