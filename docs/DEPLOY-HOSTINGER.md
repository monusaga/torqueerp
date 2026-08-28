# Deploying to Hostinger

Two ways to deploy: **automatic** (GitHub Actions, recommended — set up once,
then every push deploys itself) and **manual** (one command on the server).

---

## A. One-time manual deploy (fastest right now)

SSH into the server (or use hPanel's browser terminal) and paste:

```bash
cd /var/www/torqueerp/app && \
sed -i '/^GOOGLE_CLIENT_ID=/d;/^FIREBASE_PROJECT_ID=/d' backend/.env && \
printf 'GOOGLE_CLIENT_ID=699520506591-11l0r0mh2csfitm9n1rfugitc18t57r0.apps.googleusercontent.com\nFIREBASE_PROJECT_ID=torqueerp-e4915\n' >> backend/.env && \
git pull && \
cd backend && npm ci && npx prisma generate && npm run build && \
pm2 restart torqueerp-backend --update-env && \
cd ../web && npm ci && npm run build && \
echo "=== BACKEND RESTARTED + WEB BUILT ==="
```

Then find where the site is served from and publish the web build:

```bash
find /home /var/www -name "index-*.js" -path "*assets*" 2>/dev/null | head -3
# take the parent of the assets/ folder, e.g. /home/USER/public_html
cp -r /var/www/torqueerp/app/web/dist/. <WEB_ROOT>/
```

Verify (from anywhere):

```bash
# 401 = Google auth configured correctly; 503 = env vars still missing
curl -s -X POST https://erp.monusagar.in/api/v1/auth/google \
  -H "Content-Type: application/json" -d '{"credential":"probe.invalid"}'
```

---

## B. Automatic deploy with GitHub Actions (recommended)

`.github/workflows/deploy.yml` deploys on every push to `main` (and can be run
by hand from the Actions tab). It never contains any secret — everything comes
from GitHub repository secrets that only you can see.

### Add the secrets once

GitHub repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**. Add these seven:

| Secret | Value | Example |
|---|---|---|
| `SSH_HOST` | server hostname or IP | `123.45.67.89` |
| `SSH_USER` | SSH username | `root` |
| `SSH_KEY` | **private** SSH key (full text, including the BEGIN/END lines) | see below |
| `SSH_PORT` | SSH port (optional, defaults to 22) | `22` |
| `APP_DIR` | repo path on the server | `/var/www/torqueerp/app` |
| `WEB_ROOT` | folder the domain serves | `/home/USER/public_html` |
| `PM2_APP_NAME` | pm2 process name | `torqueerp-backend` |
| `SITE_URL` | public site URL | `https://erp.monusagar.in` |

### Creating the SSH key (run on your own machine, not the server)

```bash
ssh-keygen -t ed25519 -f hostinger_deploy -N ""
```

- Put the contents of **`hostinger_deploy.pub`** into the server's
  `~/.ssh/authorized_keys` (hPanel → Advanced → SSH Access also accepts it).
- Paste the contents of **`hostinger_deploy`** (the private key) into the
  `SSH_KEY` GitHub secret. Never commit it or share it in chat.

### Deploying

- Push to `main` — deployment runs automatically, **or**
- GitHub → **Actions** → *Deploy to Hostinger* → **Run workflow**

The final step prints the live Google-auth config status and the served bundle
name, so each run tells you whether the deployment actually took effect.

---

## Environment variables on the server

`backend/.env` on the server must contain (see `backend/.env.example`):

```
NODE_ENV=production
PORT=4100
DATABASE_URL=mysql://...          # Hostinger MySQL
JWT_SECRET=...                    # long random string
GOOGLE_CLIENT_ID=...              # OAuth Web client id
FIREBASE_PROJECT_ID=...           # Firebase project id
CORS_ORIGIN=https://erp.monusagar.in
TRUST_PROXY=1                     # behind nginx
```

After editing `.env`, always restart with `pm2 restart <app> --update-env`.

## Google Cloud Console

The web origin must be authorized once, or the Google popup refuses to open:

Console → APIs & Services → **Credentials** → your **Web client** →
**Authorized JavaScript origins** → add `https://erp.monusagar.in` → Save.
