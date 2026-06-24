# FinHealth — Personal Finance Dashboard

> A full-stack personal finance tracker with budgeting, savings goals, loan eligibility simulation, and AI-powered spending insights — built for the Indian market (INR, UPI, credit score 300–900).

---

## 🛠 Tech Stack

| Layer      | Technology                                                          |
|------------|---------------------------------------------------------------------|
| Frontend   | Vanilla JS, HTML5, CSS3, Chart.js 4, Responsive (mobile-first)     |
| Backend    | Node.js 20, Express 4, REST API                                     |
| Database   | MongoDB Atlas (Mongoose ODM)                                        |
| Auth       | JWT (jsonwebtoken), bcryptjs (12 rounds)                            |
| Security   | Helmet, CORS, express-rate-limit v8, input validation               |
| Deployment | Backend → Vercel Serverless · Frontend → Vercel / GitHub Pages      |

---

## 📁 Project Structure

```
finhealth/
├── backend/                  # Express REST API (deployable to Vercel)
│   ├── middleware/
│   │   ├── auth.js           # JWT verification middleware
│   │   └── rateLimiter.js    # Rate limiter (express-rate-limit v8)
│   ├── models/
│   │   ├── User.js           # User schema + bcrypt pre-save hook
│   │   ├── Transaction.js    # Income / expense schema
│   │   ├── Budget.js         # Monthly budget schema
│   │   └── Goal.js           # Savings goals + milestones
│   ├── routes/
│   │   ├── auth.js           # POST /register, /login, GET /me, PATCH /profile
│   │   ├── transactions.js   # CRUD + analytics aggregations
│   │   ├── budgets.js        # CRUD + what-if scenario engine
│   │   ├── loans.js          # EMI + eligibility scoring
│   │   └── goals.js          # Goals CRUD + contributions
│   ├── server.js             # Express app entry point (also Vercel serverless export)
│   ├── .env.example          # Environment variable template
│   └── package.json
│
└── frontend/                 # Static SPA
    ├── public/
    │   ├── index.html        # Single-page shell
    │   ├── css/styles.css    # Full design system (dark/light themes)
    │   └── js/app.js         # All frontend logic
    └── package.json
```

---

## 🚀 Local Development

### Backend

```bash
cd backend
cp .env.example .env        # fill in MONGODB_URI and JWT_SECRET
npm install
npm start                   # runs on http://localhost:5001
```

### Frontend

Open `frontend/public/index.html` directly in a browser **or** serve it:

```bash
cd frontend
npx serve public -p 3000    # runs on http://localhost:3000
```

The frontend auto-detects `localhost` and points to `http://localhost:5001/api`.

---

## ☁️ Deployment (Vercel + GitHub Pages)

### Step 1 — Deploy Backend to Vercel

1. Push the `backend/` folder to a GitHub repo (or the whole monorepo).
2. In Vercel: **New Project → Import → set Root Directory to `backend`**.
3. Framework preset: **Other**.
4. Add these Environment Variables in Vercel dashboard:

   | Variable        | Value                                                        |
   |-----------------|--------------------------------------------------------------|
   | `MONGODB_URI`   | `mongodb+srv://<user>:<pass>@cluster.mongodb.net/finhealth`  |
   | `JWT_SECRET`    | A long random string (32+ chars)                             |
   | `JWT_EXPIRES_IN`| `7d`                                                         |
   | `FRONTEND_URL`  | Your frontend URL e.g. `https://yourusername.github.io`      |
   | `NODE_ENV`      | `production`                                                 |

5. Deploy. Note your backend URL, e.g. `https://finhealth-backend.vercel.app`.

> **vercel.json** needed in `backend/`: Create one with this content:
> ```json
> { "version": 2, "builds": [{ "src": "server.js", "use": "@vercel/node" }], "routes": [{ "src": "/(.*)", "dest": "server.js" }] }
> ```

### Step 2 — Configure Frontend

Open `frontend/public/index.html` and find the commented line near the bottom:

```html
<!-- <script>window.API_BASE = "https://your-backend.vercel.app/api";</script> -->
```

Uncomment it and replace the URL with your actual backend URL:

```html
<script>window.API_BASE = "https://finhealth-backend.vercel.app/api";</script>
```

### Step 3 — Deploy Frontend

**Option A — GitHub Pages:**
1. Push the repo to GitHub.
2. Go to **Settings → Pages → Source: Deploy from branch**.
3. Set branch to `main` (or `gh-pages`) and folder to `/frontend/public`.
4. Your site will be at `https://yourusername.github.io/repo-name/`.

**Option B — Vercel (Static):**
1. New Project → Import → set Root Directory to `frontend/public`.
2. Framework preset: **Other**.
3. No build command needed. Output directory: `.` (the folder itself).

---

## ⚙️ Environment Variables Reference

```env
PORT=5001
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-very-long-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://yourfrontend.vercel.app
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |
| GET | `/api/transactions` | List with filters & pagination |
| POST | `/api/transactions` | Add transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/analytics/summary` | Monthly income/expense/categories |
| GET | `/api/transactions/analytics/heatmap` | Daily spending heatmap |
| GET | `/api/budgets` | Budgets for a month |
| POST | `/api/budgets` | Create/update budget |
| DELETE | `/api/budgets/:id` | Delete budget |
| POST | `/api/budgets/whatif` | What-if scenario simulation |
| POST | `/api/loans/simulate` | Loan EMI + eligibility scoring |
| GET | `/api/goals` | List goals |
| POST | `/api/goals` | Create goal |
| PATCH | `/api/goals/:id/contribute` | Add contribution |
| DELETE | `/api/goals/:id` | Delete goal |
