# DeskFolio

Online Notes Locker + Class Links & History + Verified Educator Leaderboard (MERN).

## Structure

```
DeskFolio/
├── package.json            # root scripts: install:all, dev (runs both apps), build, test
├── client/                 # React + Vite + Tailwind v4 → Vercel
│   ├── .env.example
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── api/            # axios instance + JWT interceptor, per-resource API calls
│       ├── context/        # AuthContext
│       ├── routes/         # ProtectedRoute, RoleGuard
│       ├── hooks/
│       ├── utils/
│       ├── components/
│       │   ├── layout/     # Navbar, DashboardShell
│       │   ├── ui/         # Button, Card, Modal, StarRating, EmptyState
│       │   ├── locker/     # FolderList, NoteEditor (markdown), NoteViewer, UploadForm
│       │   └── leaderboard/
│       └── pages/
│           ├── auth/       # Login, Register
│           ├── public/     # Landing, Leaderboard, EducatorProfile (/e/:slug)
│           └── dashboard/  # EducatorDashboard, StudentDashboard, SpaceView, QuickRevision
└── server/                 # Express 5 (ES modules) + Mongoose → Render
    ├── .env.example
    ├── src/
    │   ├── server.js       # boot: connect DB, listen
    │   ├── app.js          # express app: helmet, cors, rate limit, routes, error handler
    │   ├── config/         # env (zod-validated), db, cloudinary
    │   ├── models/         # User, EducatorProfile, Space, Enrollment, LockerItem, ClassSession, EducatorRating
    │   ├── middleware/     # verifyJWT, requireRole, validate, upload (multer), errorHandler
    │   ├── validators/     # zod schemas per route
    │   ├── controllers/    # auth, space, locker, session, rating, leaderboard
    │   ├── routes/         # mounted under /api/v1
    │   ├── services/       # ranking (Bayesian), access (enrollment/visibility checks), storage
    │   └── utils/          # ApiError, joinCode, slug
    └── tests/              # vitest + supertest + mongodb-memory-server
```

## Deploying

One free Render web service (API + web app on one URL) + free MongoDB Atlas: see [DEPLOYMENT.md](DEPLOYMENT.md).
Config: [`render.yaml`](render.yaml). (Vercel for the frontend is an optional alternative: [`client/vercel.json`](client/vercel.json).)

## Try it without any accounts (demo mode)

```
npm run install:all
npm run demo        # API on :5000 with an in-memory MongoDB + seed data, web on :5173
```

Demo logins (educator and student) are listed at the top of `server/scripts/seed.js`.
Demo data is wiped when the API stops. File uploads need Cloudinary keys in `server/.env`.

## Getting started

```
npm run install:all
cp server/.env.example server/.env   # fill in MongoDB Atlas + Cloudinary + JWT_SECRET
cp client/.env.example client/.env
npm run dev                           # API on :5000, web on :5173
```
