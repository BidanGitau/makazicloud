
# MakaziCloud

Rental management application. MakaziCloud is a digital platform that helps landlords, tenants, and property managers handle rent payments, maintenance requests, tenant onboarding, and financial reporting all in one place, making property management simple, efficient, and transparent.

This project uses a React Router SSR web app backed by a NestJS API and local PostgreSQL.

## Features

* **Tenant Management:** Onboard tenants, manage profiles, and track tenancy status.
* **Rent Collection:** Automated payment tracking, reminders, and receipts.
* **Maintenance Requests:** Submit, track, and manage repair and service requests.
* **Financial Reporting:** Generate statements, track expenses, and monitor profitability.
* **Property Overview:** Dashboard with occupancy rates, arrears, and unit status.
* **Digital Lease Management:** Sign and store tenancy agreements electronically.
* **Notifications & Reminders:** Alerts for rent due dates, maintenance updates, and notices.
* **Role-based Access:** Separate access for landlords, managers, and tenants.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the web app.

Start the API in another terminal when working locally:

```bash
npm run dev:api
```

## Learn More

To learn more about the main framework pieces:

* [React Router](https://reactrouter.com/) - routing and SSR framework.
* [NestJS](https://nestjs.com/) - backend API framework.
* [Prisma](https://www.prisma.io/) - database ORM.

## Deploy

Build both apps before deployment:

```bash
npm run build
npm run build:api
```
