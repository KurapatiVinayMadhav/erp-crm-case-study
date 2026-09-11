# Submission Guide — Nirvana Ops (Mini ERP + CRM)

Everything below satisfies the case-study deliverables: GitHub repo, live
backend API URL, live frontend URL, test credentials, Postman collection,
architecture explanation, known limitations, and the screen recording.

> Fill in the live URLs as you deploy. Nothing here needs a credit card — all
> services have working free tiers.

---

## 1. GitHub repo (public)

1. At https://github.com/new create an **empty** public repo named e.g.
   `erp-crm-case-study` (do NOT tick "Add a README", ".gitignore" or "license" —
   add nothing, so pushing here is clean).
2. Copy the HTTPS URL: `https://github.com/<user>/<repo>.git`
3. Push from this machine:

```bash
git remote add origin https://github.com/<user>/<repo>.git
git branch -M main
git push -u origin main
```

Expected result: 4 commits (scaffold / backend / frontend / containerization) on GitHub.

---

## 2. Database — Neon (free serverless Postgres)

1. Sign up at https://neon.tech (GitHub login is fastest).
2. **Create a project** → name `erp-crm` → any region → default settings.
3. Copy the **connection string** from the dashboard. Use the **password (non-pooled)** string first, e.g.
   `postgresql://neondb_owner:xxxx@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
   (If the pooled one ends with `-pooler`, keep the normal one for seeding.)
4. Keep this string — you'll paste it twice (Render + one local seed command).

---

## 3. Backend — Render (free web service)

1. Sign up at https://render.com → **New** → **Web Service** → connect GitHub
   and select the `erp-crm-case-study` repo.
2. Settings:
   - **Root directory:** `backend`
   - **Environment:** `Node`
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm run start`
   - **Instance type / plan:** Free (free services sleep after 15 min idle —
     fine for a demo, just re-open the URL and wait ~30 s).
3. **Environment variables** (Environment tab):
   - `DATABASE_URL` = the Neon string from step 2
   - `JWT_SECRET` = any long random string (e.g. from a password manager)
   - `JWT_EXPIRES_IN` = `7d`
   - `CORS_ORIGIN` = your Vercel URL from section 4 (comma separated if more)
4. Deploy. Copy the service URL, e.g. `https://erp-crm-api.onrender.com`.
5. **Seed once** (run locally, targets Neon — do this after the service deploys):

```bash
cd backend
$env:DATABASE_URL="postgresql://<neon-string>"
npx prisma migrate deploy
npx prisma db seed
```

> The migrations/seed only touch the Neon DB you pointed at; your local DB is
> untouched.

6. Sanity check the live API:

```bash
curl https://erp-crm-api.onrender.com/health
curl -X POST https://erp-crm-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nirvana.in","password":"demo@12345"}'
```

---

## 4. Frontend — Vercel (free)

1. Sign up at https://vercel.com → **Add New → Project** → import
   `erp-crm-case-study`.
2. Project settings:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. **Environment variable** (in the project settings → Environment Variables):
   `VITE_API_URL` = `https://erp-crm-api.onrender.com` (section 3, no trailing slash)
4. Deploy. Copy the preview/production URL, e.g. `https://erp-crm-case-study.vercel.app`.
5. Update Render's `CORS_ORIGIN` to include this URL (section 3.3) and **redeploy
   the backend** (Render redeploys when you edit env vars).
6. Open the app, log in with any demo account, do a full pass (draft → confirm →
   cancel). The login is to the live API.

---

## 5. Final link checklist (fill in)

| Requirement | Value |
| ----------- | ----- |
| GitHub repo | <https://github.com/\<user\>/\<repo\>> |
| Live frontend URL | <https://…vercel.app> |
| Live backend API URL | <https://…onrender.com> |
| Health check | <https://…onrender.com/health> |
| Test credentials | password `demo@12345`; admin/sales/warehouse/accounts @nirvana.in |
| Postman collection | `postman/erp-crm.postman_collection.json` (+ update baseUrl to the Render URL, import, run folder) |
| README / architecture | `README.md` |
| Screen recording | (upload link below) |

---

## 6. Screen recording (3–4 minutes)

Record **MP4** (OBS Studio is free; a phone recording also works). Suggested order:

1. Intro (10 s): "Nirvana Ops — a mini ERP + CRM for a wholesale distribution
   business. Stack: Node, TypeScript, Express, PostgreSQL, React, Vite."
2. Login as **Admin** — show the four demo accounts from the login card.
3. Dashboard — live KPIs, low-stock alerts.
4. Customers — search/filter, open a customer, add a follow-up note.
5. Products — edit one, note the low-stock badge.
6. Stock ledger — record one IN and one OUT.
7. **Sales challans** (most important): as Sales create a draft → log out →
   as Warehouse confirm it → stock drops → log out →
   as Admin cancel it → stock restores. Also try a quantity above stock and show
   the clean "insufficient stock" error.
8. Show the code briefly (10 s): repo tree + the backend + frontend building.
9. Close with the three URLs on screen (GitHub, frontend, backend).

Upload to YouTube (unlisted) or Google Drive → and paste the **share link**.

---

## 7. Google Form fields

Typical fields — fill with your details and the links from section 5. Fill in
all boxes exactly as in your resume/CV:

- Name, Email, Contact number, Branch, Passing year
- GitHub link (section 5 row 1)
- Live app link (section 5 row 2)
- Documentation / architecture link (`README.md` on GitHub renders directly;
   optionally also the screen recording link if the form has one field for docs)
- Screen recording link (section 6)
- Resume/CV link (host your resume in a public Google Drive folder / LinkedIn)

> Tip: use a single Google Drive folder with the recording + a PDF of this
> README so one folder link can serve "documentation" if the form wants a link.

---

## 8. After deploy — final self-check

```powershell
curl https://<render>.onrender.com/health
curl https://<render>.onrender.com/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{\"email\":\"admin@nirvana.in\",\"password\":\"demo@12345\"}'
# open https://<vercel>.vercel.app → login → draft/confirm/cancel a challan
```

Both links must be **publicly reachable** (do not mark projects "private").
Remember Render free services sleep when idle — always "wake" the API by
visiting `/health` a few seconds before you start the recording.