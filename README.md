# DormMatch

ระบบบริหารจัดการหอพัก Marketplace พร้อม AI วิเคราะห์ข้อมูล

Multi-tenant dormitory management platform with AI-powered daily insights.

## Tech Stack

- **Frontend:** Next.js 14 + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL via Supabase
- **AI:** Groq API (Llama 3.3 70B)
- **Hosting:** Vercel (frontend) + Render (backend)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/dormmatch.git
cd dormmatch
```

### 2. Set up the database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Paste the contents of `database/schema.sql` and run

### 3. Set up the backend

```bash
cd backend
cp .env.example .env
# Fill in your Supabase and Groq keys in .env
npm install
npm run dev
```

### 4. Set up the frontend

```bash
cd frontend
cp .env.example .env.local
# Fill in your API URL and Supabase keys
npm install
npm run dev
```

### 5. Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@demo.com | demo123456 |
| Tenant | tenant@demo.com | demo123456 |
| Admin | admin@demo.com | demo123456 |

## Project Structure

```
dormmatch/
├── backend/
│   └── src/
│       ├── modules/       ← domain-separated business logic
│       │   ├── auth/
│       │   ├── buildings/
│       │   ├── rooms/
│       │   ├── billing/
│       │   ├── maintenance/
│       │   └── ...
│       ├── middleware/     ← auth guard, error handler
│       ├── lib/            ← supabase client, groq client
│       └── app.ts          ← Express entry point
├── frontend/               ← Next.js 14 app
├── database/
│   └── schema.sql          ← paste into Supabase SQL Editor
└── README.md
```

## License

MIT
