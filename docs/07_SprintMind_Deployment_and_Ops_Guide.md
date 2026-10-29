# SprintMind: Deployment & Operations Guide

| Field | Value |
|---|---|
| **Product** | SprintMind |
| **Version** | 1.0 |
| **Document type** | Infrastructure, Deployment & Operations Guide |
| **Target Cloud** | Frontend: Vercel / Netlify \| Backend: Render / Railway \| Database: Neon PostgreSQL |
| **Related docs** | [02_SprintMind_System_Architecture.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/02_SprintMind_System_Architecture.md), [05_SprintMind_API_Specification.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/05_SprintMind_API_Specification.md) |

---

## 1. Architecture & Infrastructure Overview

SprintMind is engineered for cloud-native deployment with complete separation between the presentation, application, and persistence tiers.

```
+--------------------------+          +--------------------------+
|  Frontend (CDN / Edge)   |          |    Backend (PaaS)        |
|  Vercel / Netlify        |  HTTPS   |    Render / Railway      |
|  - React 18 Single Page  | -------> |    - Django 5 + Gunicorn |
|  - Static Assets Cache   |   REST   |    - WhiteNoise Static   |
+--------------------------+          +-------------+------------+
                                                    |
                                      +-------------+------------+
                                      |                          |
                                      v                          v
                         +------------------------+  +------------------------+
                         | Neon PostgreSQL Cloud  |  |       Groq API         |
                         | - PgBouncer Pooling    |  | - LLM Inference Engine |
                         | - Serverless Branching |  +------------------------+
                         +------------------------+
```

---

## 2. Database Provisioning: Neon PostgreSQL

### 2.1 Branching Strategy
Neon supports zero-copy branch isolation. Use branches to decouple development from production:
- **`main`**: Production database only. Point-in-time restore enabled.
- **`staging`**: Pre-release verification branch.
- **`dev`**: Local developer sandbox.

### 2.2 Connection Pooling & Connection Strings
Serverless architectures open and close connections rapidly. Neon provides built-in PgBouncer connection pooling.

- **Application Connection (Pooled)**:
  Used for standard application traffic in `settings.py`.
  ```
  postgresql://[user]:[password]@[endpoint]-pooler.[region].neon.tech/sprintmind?sslmode=require
  ```
- **Migration Connection (Direct / Unpooled)**:
  Migrations requiring DDL statements and session locks must use the unpooled port (`5432` without `-pooler`).
  ```
  postgresql://[user]:[password]@[endpoint].[region].neon.tech/sprintmind?sslmode=require
  ```

### 2.3 Handling Neon Cold Starts
Serverless compute endpoints can scale to zero when idle. To prevent 500 errors during cold boots:
- Configure Django database options in `settings.py`:
  ```python
  DATABASES = {
      'default': dj_database_url.config(
          default=os.getenv('DATABASE_URL'),
          conn_max_age=600,
          conn_health_checks=True,
      )
  }
  ```

---

## 3. Backend Deployment (Render / Railway)

### 3.1 Production Stack Components
- **WSGI Server**: `gunicorn` with 3 to 4 worker processes.
- **Static Assets**: `whitenoise` with compression and unique cache hashing.
- **Process Manager**: Render web service or Railway container.

### 3.2 Build & Start Commands

- **Build Command**:
  ```bash
  pip install --upgrade pip
  pip install -r requirements.txt
  python manage.py collectstatic --no-input
  python manage.py migrate --no-input
  ```

- **Start Command**:
  ```bash
  gunicorn sprintmind.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 60
  ```

### 3.3 Backend Environment Variables Matrix
Set these in your hosting provider's dashboard (never commit these into Git):

| Variable | Sample Value | Description |
|---|---|---|
| `DEBUG` | `False` | Must always be False in production |
| `SECRET_KEY` | *(64-char crypto string)* | Django cryptographic signing key |
| `ALLOWED_HOSTS` | `api.sprintmind.com,*.onrender.com` | Allowed incoming Host headers |
| `DATABASE_URL` | `postgresql://...@...neon.tech/sprintmind?sslmode=require` | Neon pooled connection string |
| `CORS_ALLOWED_ORIGINS` | `https://app.sprintmind.com` | Allowed frontend origin |
| `GROQ_API_KEY` | `gsk_...` | Production Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Configurable Groq model |
| `AI_TIMEOUT_SECONDS` | `30` | Timeout threshold before returning 504 |
| `AI_RATE_LIMIT_PER_HOUR` | `20` | Max AI requests per user per hour |
| `JWT_ACCESS_MINUTES` | `15` | Access token lifespan |
| `JWT_REFRESH_DAYS` | `7` | Refresh token lifespan |

---

## 4. Frontend Deployment (Vercel / Netlify)

### 4.1 Build Configuration
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: `18.x` or `20.x`

### 4.2 SPA Client-Side Routing Configuration
Because React Router handles navigation client-side, the server must route all requests to `index.html`.

- **For Vercel (`vercel.json`)**:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```

- **For Netlify (`public/_redirects`)**:
  ```
  /*    /index.html   200
  ```

### 4.3 Frontend Environment Variables
| Variable | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.sprintmind.com/api/v1` | Public backend API URL |

---

## 5. Security & Production Hardening

1. **Strict Transport Security (HSTS)**:
   Add to Django `settings.py` for production:
   ```python
   SECURE_SSL_REDIRECT = True
   SESSION_COOKIE_SECURE = True
   CSRF_COOKIE_SECURE = True
   SECURE_HSTS_SECONDS = 31536000
   SECURE_HSTS_INCLUDE_SUBDOMAINS = True
   SECURE_HSTS_PRELOAD = True
   ```
2. **CORS Restrictions**:
   `CORS_ALLOW_ALL_ORIGINS = False`. Only whitelist your production frontend domain.
3. **Groq API Protection**:
   - The Groq key is never injected into frontend builds.
   - Per-user throttling prevents accidental quota exhaustion.
   - Input payloads sanitized to a maximum of 4,000 characters.

---

## 6. Health Checks & Monitoring

### 6.1 Health Check Endpoint
Uptime monitors (BetterStack, UptimeRobot, or Pingdom) should ping every 60 seconds:
- **URL**: `https://api.sprintmind.com/api/v1/health/`
- **Expected Status**: `200 OK`
- Checks database query responsiveness and returns:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "version": "1.0.0"
  }
  ```

### 6.2 Error Tracking
Integrate **Sentry** (optional) in both frontend and backend for automatic crash reporting and tracing.

---

## 7. Disaster Recovery & Rollback Runbook

### 7.1 Database Backup & Recovery
Neon automatically maintains point-in-time recovery (PITR) logs for up to 7 days (or 30 days on paid tiers).
- To restore to a previous state:
  1. Open Neon Console ➔ Project ➔ Backups / Branches.
  2. Create a new branch pointing to the desired timestamp before corruption occurred.
  3. Update `DATABASE_URL` in the backend service to point to the restored branch.

### 7.2 Application Rollback
- **Frontend**: Instant rollback to previous deployment in Vercel/Netlify dashboard with 1 click.
- **Backend**: In Render/Railway, redeploy the previous successful commit or container image.
