# Khatawali Records

Khatawali is a mobile-first credit/debit ledger app built with React, Supabase, and Capacitor Android.
It supports Google login, person-wise ledgers, category-wise separation for the same person, PDF/Excel export,
and Android-ready flows like contact import and biometric lock.

## What The App Does

### 1) Login and Session
- Google OAuth login through Supabase Auth.
- Android callback handling via deep links and a hosted bridge callback page.
- Protected routes and session restoration.

### 2) Dashboard Ledger
- Search by person name, phone, description, and display category.
- Date range and year/month filtering.
- Person cards with:
  - totals (credit/debit)
  - balance
  - last transaction timestamp
  - quick actions (edit/delete/call)
- Bottom total summary and Add Person action.

### 3) Add Person Flow
- Add Person modal supports manual entry plus in-app contact helper.
- Contact helper opens a modal contact list (inside Khatawali), not a navigation flow.
- After selecting a contact, Name and Mobile Number auto-fill and user continues entering amount/category/note.

### 4) Category-Separated Ledgers For Same Person
- Same person can be tracked in multiple categories independently.
- Example:
  - Uttam - khat
  - Uttam - society
- Each category entry maintains separate transaction history and balance.
- Person ledger route supports category context:
  - /person/:personName/:personCategory

### 5) Person Ledger Screen
- Chat-style transaction cards.
- Independent person-category ledger view.
- Receive/Give quick actions.
- Transfer flow between people.
- Call and WhatsApp actions in toolbar.
- Per-person PDF export.

### 6) Settings and Configuration
- Profile and business details (name/address/phone/logo/QR/stamp).
- Message customization.
- Item/category management.
- Bank holidays, help/support, recycle bin.
- Finger lock behavior:
  - disabled by default
  - works only after enabling in Settings and Profile.

### 7) Developer Support Popup
- A developer support popup appears on dashboard login session.
- User can close it and continue normally.
- It reappears on the next fresh login session.

---

## Tech Stack
- React 18 + Vite
- React Router 6
- Bootstrap 5 + Bootstrap Icons
- Supabase (Auth + Postgres + RLS)
- jsPDF + jspdf-autotable
- XLSX + PapaParse
- Capacitor Android
- Capacitor plugins:
  - @capacitor/app
  - @capacitor/browser
  - @capacitor/preferences
  - @capacitor-community/contacts
  - @aparajita/capacitor-biometric-auth

---

## Environment Variables

Create .env with:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key

Optional (only if you host callback bridge on a different URL):

VITE_MOBILE_AUTH_BRIDGE_URL=https://your-domain/mobile-auth-callback.html

---

## Run Locally

1. Install dependencies

```bash
npm install
```

2. Start dev server

```bash
npm run dev
```

3. Build production bundle

```bash
npm run build
```

---

## Database Setup (Supabase)

Run the following SQL in Supabase SQL editor:

```sql
create extension if not exists "uuid-ossp";

create table if not exists public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique default auth.uid(),
  name text not null,
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

Note:
- UI category and metadata (entry type, phone, receipt) are stored in description metadata wrapper.
- This is how one person can appear separately by category in UI.

---

## OAuth Setup (Web + Android)

### Supabase Auth URL Configuration

Set Site URL:
- https://khatawali-records.vercel.app

Add Redirect URLs:
- https://khatawali-records.vercel.app
- https://khatawali-records.vercel.app/dashboard
- https://khatawali-records.vercel.app/mobile-auth-callback.html
- khatawali://login-callback
- com.khatawali.app://auth/callback
- com.khatawali.app://login-callback

### Google Cloud OAuth Client

Authorized JavaScript origins:
- https://peshciqkftfsggcueshi.supabase.co
- https://khatawali-records.vercel.app

Authorized redirect URIs:
- https://peshciqkftfsggcueshi.supabase.co/auth/v1/callback

### Android Deep Links

Defined in Android manifest for callback handling:
- khatawali://login-callback
- com.khatawali.app://auth/callback
- com.khatawali.app://login-callback

---

## Android Build Flow

From project root:

```bash
npm run build
npx cap sync android
```

Then in Android Studio:
1. Open android project.
2. Use Gradle JDK 21.
3. Sync Gradle.
4. Clean and Rebuild.
5. Install fresh APK.

Contacts integration needs permissions already declared in manifest:
- android.permission.READ_CONTACTS
- android.permission.WRITE_CONTACTS

---

## Project Structure (Important Files)

- src/App.jsx
  Main route map, including category-aware person ledger route.

- src/pages/Dashboard.jsx
  Dashboard, Add Person flow, in-app contact picker, grouping by name+category, developer support popup.

- src/pages/PersonLedger.jsx
  Category-specific person ledger view, transfer flow, entry actions, export.

- src/providers/AuthProvider.jsx
  Auth session lifecycle, mobile OAuth callback listener, biometric gating.

- src/services/authService.js
  Google OAuth start/complete logic and Android browser callback handling.

- src/services/contactService.js
  Device contacts permission checks, in-app contacts listing.

- src/services/biometricService.js
  Finger lock availability and preference handling (default off until enabled).

- src/styles/theme.css
  Mobile-first visual system and modal/layout styling.

- public/mobile-auth-callback.html
  OAuth bridge page that redirects authenticated users back into app deep link.

---

## Notes For Future Developers

- Category separation in UI depends on displayCategory metadata, not only raw SQL category.
- If person/category behavior changes, update both dashboard grouping and person ledger routing/filtering.
- After any web changes intended for APK, always run build and cap sync before Android Studio rebuild.
- Keep OAuth URLs consistent across Supabase, Google Cloud, and Android manifest deep links.
