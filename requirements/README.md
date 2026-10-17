# PharmaTrack - Quick Setup & Requirements

This folder contains automated setup scripts and instructions so anyone can install all dependencies and run PharmaTrack immediately.

## Prerequisites
- **Node.js**: Version 20.x LTS or higher installed (`node -v`)
- **npm**: Version 9.x or higher (`npm -v`)

---

## 1-Click Quick Setup

### Windows
Double-click `requirements\setup.bat` or run in terminal:
```cmd
requirements\setup.bat
```

### macOS / Linux
Open terminal in the project root and run:
```bash
chmod +x requirements/setup.sh
./requirements/setup.sh
```

---

## Manual Step-by-Step Setup

1. **Install all dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `.env.local` if not already present:
   ```bash
   cp .env.example .env.local
   ```
   Ensure your Supabase project keys are set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL`

3. **Database Setup:**
   Run the SQL migrations in order in the Supabase SQL Editor:
   1. `supabase/migrations/001_schema.sql`
   2. `supabase/migrations/002_functions.sql`
   3. `supabase/migrations/003_views.sql`
   4. `supabase/migrations/004_security.sql`

4. **Seed Initial Database:**
   ```bash
   npm run seed
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Commands
- `npm run dev` - Launch Next.js local development server (port 3000)
- `npm run build` - Create optimized production build
- `npm run start` - Start production server after build
- `npm run typecheck` - Run TypeScript compiler checks (`tsc --noEmit`)
- `npm run lint` - Run ESLint checks
- `npm run test` - Execute unit tests with Vitest
- `npm run seed` - Run the database seed script to populate users and inventory
