# CallbackPro

A real-time webhook inspector and debugger. Generate unique endpoints, capture incoming HTTP requests, inspect full request details, configure custom responses, simulate delays, and export data — all in one place.

## Features

- **Instant Endpoints** — Generate a unique webhook URL in one click, no signup required
- **Live Inspection** — See incoming requests refresh automatically via polling
- **NEW Badge** — Freshly arrived requests flash green for 2 seconds so you never miss them
- **Full Request Details** — Inspect method, path, headers, query params, body, IP, and timestamp
- **Duration Tracking** — Server-side processing time (ms) stamped on every request via middleware
- **Custom Responses** — Configure status code, headers, content-type, and body per endpoint
- **Response Delay** — Simulate slow APIs by setting a delay (0–30,000 ms) before the response is sent
- **Try It Out** — Built-in HTTP tester: choose method, edit body, and fire a real request directly from the UI
- **Request History** — View up to 500 requests per endpoint, mark as read or delete individually
- **CSV Export** — Export requests with a column picker; headers and JSON body fields expand into individual columns
- **Generate New Endpoint** — Create a fresh endpoint at any time with one click
- **In-process Cache** — Endpoint config is cached in memory for near-zero latency on warm instances
- **Vercel Header Filtering** — Internal `x-vercel-*` headers are stripped before saving
- **Optimized Performance** — Webhook handler defers DB writes until after the response is sent using Next.js `after()`

## Tech Stack

- [Next.js 16](https://nextjs.org/) — Full-stack React framework (App Router)
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [Supabase](https://supabase.com/) / PostgreSQL / MongoDB — selectable persistence providers behind a shared data layer
- [Tailwind CSS 4](https://tailwindcss.com/) — Styling

## Getting Started

### Prerequisites

- Node.js 18+
- Node.js can reach your selected database provider

### 1. Clone the repository

```bash
git clone https://github.com/your-username/callback-pro.git
cd callback-pro
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Set up the database

If you use **Supabase** or **PostgreSQL**, run the contents of [`lib/schema.sql`](lib/schema.sql) against your database.

If you have an existing SQL install, also run the migration statements at the bottom of that file:

```sql
ALTER TABLE requests ADD COLUMN IF NOT EXISTS duration_ms integer;
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS custom_response_delay_ms integer DEFAULT 0;
```

If you use **MongoDB**, the app creates documents in the configured database automatically.

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Supabase
DATABASE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

```env
# PostgreSQL
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://user:password@host:5432/database
```

```env
# MongoDB
DATABASE_PROVIDER=mongodb
MONGODB_URL=mongodb://user:password@host:27017/?replicaSet=rs0
MONGODB_DB_NAME=callback-pro
```

You can find the Supabase values under **Project Settings → API**. For PostgreSQL and MongoDB, use the direct connection string from your provider.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Reference

| Method   | Route                            | Description                           |
| -------- | -------------------------------- | ------------------------------------- |
| `POST`   | `/api/endpoint`                  | Create or retrieve a webhook endpoint |
| `GET`    | `/api/endpoint/[id]`             | Get endpoint metadata                 |
| `GET`    | `/api/endpoint/[id]/response`    | Get custom response config            |
| `PUT`    | `/api/endpoint/[id]/response`    | Update custom response config         |
| `*`      | `/api/hook/[id]`                 | Webhook receiver (all HTTP methods)   |
| `GET`    | `/api/requests/[id]`             | List all requests for an endpoint     |
| `DELETE` | `/api/requests/[id]`             | Clear all requests for an endpoint    |
| `PATCH`  | `/api/requests/[id]/[requestId]` | Mark a request as read                |
| `DELETE` | `/api/requests/[id]/[requestId]` | Delete a single request               |

> Webhook endpoints are limited to **500 requests** each. Subsequent requests return `429 Too Many Requests`.

## Project Structure

```
app/
  page.tsx                      # Main UI (client component)
  layout.tsx
  api/
    endpoint/                   # Endpoint management routes
    hook/[id]/                  # Webhook receiver (all methods)
    requests/                   # Request history routes
components/
  EndpointHeader.tsx            # Endpoint URL bar + request count progress + New button
  WebhookList.tsx               # Request list with real-time NEW badge and CSV export
  WebhookDetail.tsx             # Request detail viewer (body / headers / query / duration)
  ResponseConfig.tsx            # Custom response configuration (status, headers, body, delay)
  TryItOut.tsx                  # Built-in HTTP tester
lib/
  schema.sql                    # Database schema + migration statements
  data/                         # Runtime-selectable data providers
  supabase.ts                   # Lazy Supabase client bootstrap
  types.ts                      # Shared TypeScript types
  endpoint-cache.ts             # In-process endpoint config cache
middleware.ts                   # Stamps X-Request-Start on hook requests for accurate duration
```

## Deployment

The easiest way to deploy is with [Vercel](https://vercel.com/). Add the environment variables for your selected provider in the project settings:

| Variable                        | Description                          |
| ------------------------------- | ------------------------------------ |
| `DATABASE_PROVIDER`             | `supabase`, `postgres`, or `mongodb` |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key                    |
| `DATABASE_URL`                  | PostgreSQL connection string         |
| `MONGODB_URL`                   | MongoDB connection string            |
| `MONGODB_DB_NAME`               | Optional MongoDB database name       |

Then push to your connected repository and Vercel will deploy automatically.

## License

MIT
