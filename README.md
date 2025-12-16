# Autono PWA

Autono is a premium, mobile-first service booking PWA built with React, Vite, Tailwind CSS, and Supabase.

## Features

- **Mobile First Design**: Swipeable, touch-friendly UI.
- **PWA Ready**: Offline support, installable, service worker caching.
- **Realtime**: Chat and Notifications powered by Supabase Realtime.
- **Optimistic UI**: Instant feedback updates.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Backend**: Supabase (Auth, Postgres, Storage, Realtime)
- **State**: React Context + Local State (scalable to Zustand/TanStack Query)
- **Icons**: Lucide React

## Setup

1. **Clone & Install**
   ```bash
   git clone <repo>
   cd autono
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in your Supabase credentials.
   ```bash
   cp .env.example .env
   ```

3. **Supabase Setup**
   - Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor.
   - Run `supabase/seed.sql` to populate categories.
   - Enable Storage buckets: `avatars`, `task_photos`, `portfolio`.

4. **Run Locally**
   ```bash
   npm run dev
   ```

## Building for Production

```bash
npm run build
npm run preview
```

## Testing

```bash
# Run E2E tests (requires Playwright setup)
npx playwright test
```

## Security

- Row Level Security (RLS) is enabled on all tables.
- Public access is restricted by policies defined in `schema.sql`.

## License

MIT
