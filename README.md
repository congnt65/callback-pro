# CallbackPro

A real-time webhook inspector and debugger. Generate unique endpoints, capture incoming HTTP requests, inspect full request details, and configure custom responses — all in one place.

## Features

- **Instant Endpoints** — Generate a unique webhook URL in one click, no signup required
- **Real-time Inspection** — See incoming requests instantly via Supabase real-time subscriptions
- **Full Request Details** — Inspect method, headers, query params, body, IP, and timestamp
- **Custom Responses** — Configure status code, headers, content-type, and body per endpoint
- **Request History** — View up to 500 requests per endpoint, mark as read or delete individually
- **Optimized Performance** — Webhook handler defers DB writes until after the response is sent

## Tech Stack

- [Next.js 15](https://nextjs.org/) — Full-stack React framework (App Router)
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [Supabase](https://supabase.com/) — PostgreSQL database + real-time subscriptions
- [Tailwind CSS 4](https://tailwindcss.com/) — Styling

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project

### 1. Clone the repository

```bash
git clone https://github.com/your-username/callback-pro.git
cd callback-pro
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

In your Supabase project, open the **SQL Editor** and run the contents of [`lib/schema.sql`](lib/schema.sql).

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project under **Project Settings → API**.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Reference

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/endpoint` | Create or retrieve a webhook endpoint |
| `GET` | `/api/endpoint/[id]` | Get endpoint metadata |
| `GET` | `/api/endpoint/[id]/response` | Get custom response config |
| `PUT` | `/api/endpoint/[id]/response` | Update custom response config |
| `*` | `/api/hook/[id]` | Webhook receiver (all HTTP methods) |
| `GET` | `/api/requests/[id]` | List all requests for an endpoint |
| `DELETE` | `/api/requests/[id]` | Clear all requests for an endpoint |
| `PATCH` | `/api/requests/[id]/[requestId]` | Mark a request as read |
| `DELETE` | `/api/requests/[id]/[requestId]` | Delete a single request |

> Webhook endpoints are limited to **500 requests** each. Subsequent requests return `429 Too Many Requests`.

## Project Structure

```
app/
  page.tsx              # Main UI (client component)
  layout.tsx
  api/
    endpoint/           # Endpoint management routes
    hook/[id]/          # Webhook receiver
    requests/           # Request history routes
components/
  EndpointHeader.tsx    # Endpoint URL + request count progress bar
  WebhookList.tsx       # Request list with real-time updates
  WebhookDetail.tsx     # Request detail viewer (body / headers / query)
  ResponseConfig.tsx    # Custom response configuration panel
lib/
  schema.sql            # Database schema
  supabase.ts           # Supabase client
  types.ts              # Shared TypeScript types
```

## Deployment

The easiest way to deploy is with [Vercel](https://vercel.com/). Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables in the Vercel project settings, then deploy.

## License

MIT
