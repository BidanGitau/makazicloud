const browserGlobals = {
  AbortController: "readonly",
  alert: "readonly",
  Blob: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  File: "readonly",
  FormData: "readonly",
  Headers: "readonly",
  localStorage: "readonly",
  location: "readonly",
  navigator: "readonly",
  Request: "readonly",
  Response: "readonly",
  sessionStorage: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  window: "readonly",
};

const nodeGlobals = {
  Buffer: "readonly",
  global: "readonly",
  process: "readonly",
};

export default [
  {
    ignores: [
      "node_modules/**",
      "apps/api/dist/**",
      "apps/web/build/**",
      "apps/web/.react-router/**",
      "apps/web/.vite/**",
      "apps/web/public/build/**",
      "dist/**",
      "build/**",
      "coverage/**",
    ],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
];
