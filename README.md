This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local Database Setup

Life Manager stores its data in MySQL (8.0.16 or newer, for `CHECK` constraint support) via Drizzle ORM.

1. Install and start a local MySQL server.
2. Create an empty database and a user with access to it (choose your own names and password), for example:

   ```sql
   CREATE DATABASE life_manager CHARACTER SET utf8mb4;
   ```

3. Copy the template and fill in your own values. `.env.local` is git-ignored; never commit real credentials:

   ```bash
   cp .env.example .env.local
   ```

   ```
   DATABASE_URL=mysql://<user>:<password>@localhost:3306/<database>
   ```

4. Apply the migrations:

   ```bash
   npm run db:migrate
   ```

Other scripts: `npm run db:generate` creates a new migration after editing `db/schema.ts`; `npm run db:studio` opens Drizzle Studio.

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication

The app requires an account. After `npm run db:migrate` and `npm run dev`, open http://localhost:3000, choose **Create account**, and register with a name, email and a password of 8–72 bytes (UTF-8). You are then signed in and land on `/profile`; **Log out** ends the session. Sessions last 30 days.

Run the unit tests (authentication, calendar dates, task validation, recurrence) with `npm test`.

The database-backed task tests (`db/`, `app/**/actions.test.ts`) are skipped unless `TEST_DATABASE_URL` points at a migrated MySQL database, for example `TEST_DATABASE_URL="$DATABASE_URL" npm test`. They create users with unique `@example.test` emails and delete them afterwards, but use a disposable database rather than one holding data you care about.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
