# MakaziCloud Migration Plan

This repository now keeps the existing Next.js app as the migration source and adds the target stack beside it.

## Target Stack

- `apps/web`: React Router SSR, React 19, TanStack Query, TanStack Table, Tailwind CSS v4, shadcn-style UI primitives, react-hook-form, Zod.
- `apps/api`: NestJS, PostgreSQL, Prisma.
- Root npm workspaces coordinate both apps.

## Styling Baseline

The inherited global UI styling lives in `apps/web/app/app.css`:

- `--font-sans`: Inter
- `--font-display`: Inter Tight
- `--font-mono`: system monospace stack
- `--color-background`, `--color-foreground`, `--color-brand`, `--color-line`

Inputs, textareas, selects, buttons, headings, and body text inherit these tokens globally.

## Migration Order

1. Keep the current `app/` Next.js code as the reference implementation.
2. Move public routes into `apps/web/app/routes`.
3. Move API route logic from `app/api/*` into NestJS controllers and services under `apps/api/src`.
4. Move Supabase data access into Prisma repositories/services.
5. Replace `react-data-table-component` tables with TanStack Table.
6. Replace manual form state and Ant Design forms with shadcn-style components, react-hook-form, and Zod.
7. Replace NextAuth/Supabase session handling with NestJS-backed auth.

## Useful Commands

```bash
npm install
npm run dev
npm run dev:api
npm run dev:all
npm run build
npm run build:api
```

The old Next app can still be started with:

```bash
npm run next:dev
```
