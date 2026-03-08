# Khatawali — Personal Expense Ledger

React + Vite + Supabase personal expense tracker with PWA/Capacitor support. Features login/registration with Supabase Auth (email verification/OTP), expense CRUD with filters, analytics charts, CSV/Excel import, profile management, and loader animation.

## Stack
- React 18, React Router 6, Bootstrap 5
- Supabase (Auth, Postgres, RLS)
- Chart.js + react-chartjs-2 for analytics
- PapaParse for CSV/Excel import
- Vite build + PWA service worker + manifest
- Capacitor placeholders for Android packaging

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from template:
   ```bash
   cp .env.example .env
   # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

## Supabase Setup
- Tables (run SQL in Supabase):
  ```sql
  create extension if not exists "uuid-ossp";

  create table if not exists public.user_profiles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null unique default auth.uid(),
    name text not null check (char_length(name) between 3 and 50 and name ~ '^[A-Za-z ]+$'),
    email text not null unique,
    created_at timestamptz not null default now(),
    constraint fk_user_profiles_user foreign key (user_id) references auth.users(id) on delete cascade
  );

  create table if not exists public.expenses (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null default auth.uid(),
    biller_name text not null,
    amount numeric(12,2) not null check (amount >= 0),
    category text not null check (category in ('pipeline','khat','society','maintenance')),
    description text,
    date date not null,
    created_at timestamptz not null default now(),
    constraint fk_expenses_user foreign key (user_id) references auth.users(id) on delete cascade
  );

  create index if not exists idx_expenses_user_date on public.expenses (user_id, date);
  create index if not exists idx_expenses_user_biller on public.expenses (user_id, biller_name);

  alter table public.user_profiles enable row level security;
  alter table public.expenses enable row level security;

  create policy "select own profile" on public.user_profiles for select using (auth.uid() = user_id);
  create policy "insert own profile" on public.user_profiles for insert with check (auth.uid() = user_id);
  create policy "update own profile" on public.user_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

  create policy "select own expenses" on public.expenses for select using (auth.uid() = user_id);
  create policy "insert own expenses" on public.expenses for insert with check (auth.uid() = user_id);
  create policy "update own expenses" on public.expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "delete own expenses" on public.expenses for delete using (auth.uid() = user_id);
  ```
- Auth: enable Email OTP for signup and email change; require email confirmation.

## PWA
- Manifest at `public/manifest.webmanifest`; update icons with real PNG assets (192px/512px recommended).
- Simple service worker in `public/service-worker.js` for asset caching.

## Capacitor (Android)
- After `npm run build`, initialize Capacitor:
  ```bash
  npx cap init khatawali com.example.khatawali --web-dir=dist
  npx cap add android
  npx cap copy
  npx cap open android
  ```
- Build APK via Android Studio targeting Android 15 (API 35).

## Project Structure
- `src/App.jsx` routes (Login, Dashboard, Profile) + navbar
- `src/providers/AuthProvider.jsx` session handling
- `src/pages` Login/Dashboard/Profile
- `src/components` loader, ExpenseForm, ExpenseTable, Analytics, ExcelImport
- `src/services` Supabase client + auth/expense services
- `public` manifest, service worker, favicon

## Color Scheme
Primary `#275EFE`, Secondary `#1E40AF`, Background `#F8FAFC`, Accent `#10B981`.

## Notes
- Loader used during auth checks, dashboard fetches, imports, and profile updates.
- Replace placeholder icons in manifest with production assets before release (icons now set to icon-192.png/icon-512.png).
