# SprintMind: System Architecture Document

| Field | Value |
|---|---|
| **Product** | SprintMind |
| **Version** | 1.0 |
| **Document type** | System Architecture |
| **Related docs** | PRD, UI Design, Project Workflow |

---

## 1. Purpose

This document describes how SprintMind is built: its layers, components, data model, APIs, security, AI integration, and deployment. It is the technical reference for developers.

---

## 2. Architecture Overview

SprintMind uses a **three-tier architecture** with an external AI service:

1. **Presentation tier:** React single-page app
2. **Application tier:** Django + Django REST Framework (REST API)
3. **Data tier:** Neon PostgreSQL
4. **External service:** Groq API (called only from the backend)

### 2.1 High-Level Diagram

```mermaid
flowchart LR
    U[User Browser] -->|HTTPS| FE[React Frontend]
    FE -->|REST JSON + JWT| BE[Django REST API]
    BE -->|SQL via ORM| DB[(Neon PostgreSQL)]
    BE -->|HTTPS| AI[Groq API]
```

### 2.2 Text Diagram

```
+-------------------+        +------------------------+        +--------------------+
|  React Frontend   | <----> |  Django REST Backend   | <----> |  Neon PostgreSQL   |
|  (SPA, browser)   |  JSON  |  - Auth (JWT)          |  SQL   |  (cloud database)  |
|                   |  HTTPS |  - Business logic      |        +--------------------+
+-------------------+        |  - Permissions         |
                             |  - AI service layer    |        +--------------------+
                             |                        | -----> |     Groq API       |
                             +------------------------+ HTTPS  |  (LLM inference)   |
                                                               +--------------------+
```

**Key rule:** The browser never talks to Groq or to the database directly. The Groq API key lives only on the server.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, React Router | UI and routing |
| State / data fetching | React Query (TanStack Query) | Server state caching |
| HTTP client | Axios | API calls with JWT interceptor |
| Drag and drop | `@hello-pangea/dnd` | Kanban board |
| Styling | Plain CSS (or Tailwind) | Simple, clean UI |
| Charts | Recharts | Dashboard charts |
| Backend | Python 3.11+, Django 5, Django REST Framework | API and business logic |
| Auth | `djangorestframework-simplejwt` | JWT tokens |
| CORS | `django-cors-headers` | Allow the frontend origin |
| DB driver | `psycopg` (v3) | PostgreSQL connection |
| Config | `python-dotenv` / `django-environ` | Environment variables |
| API docs | `drf-spectacular` | OpenAPI / Swagger |
| Database | Neon PostgreSQL | Hosted relational DB |
| AI | Groq API (via `groq` Python SDK or HTTPS) | LLM features |
| Server | Gunicorn + WhiteNoise | Production serving |

---

## 4. Frontend Architecture

### 4.1 Structure
```
frontend/
├── src/
│   ├── api/              # axios instance + API functions
│   ├── components/       # reusable UI (Button, Modal, Card, Table...)
│   ├── features/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── backlog/
│   │   ├── sprints/
│   │   ├── board/
│   │   ├── issues/
│   │   ├── dashboard/
│   │   └── ai/
│   ├── hooks/            # useAuth, useProject, etc.
│   ├── layouts/          # AppLayout (sidebar + topbar)
│   ├── pages/            # route-level pages
│   ├── routes/           # route config + ProtectedRoute
│   ├── styles/
│   └── main.jsx
└── package.json
```

### 4.2 Routes
| Path | Page | Access |
|---|---|---|
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/` | Dashboard (selected project) | Logged in |
| `/projects` | Project list | Logged in |
| `/projects/:id/backlog` | Backlog | Member |
| `/projects/:id/board` | Kanban board | Member |
| `/projects/:id/sprints` | Sprint list and management | Member |
| `/projects/:id/issues/:key` | Issue detail | Member |
| `/projects/:id/reports` | Reports | Member |
| `/team` | Members and roles | Admin |
| `/profile` | Profile | Logged in |

### 4.3 Frontend Responsibilities
- Render UI, handle forms, validate basic input
- Store the JWT access token in memory and the refresh token in an `httpOnly` cookie (preferred) or `localStorage` (simple option)
- Attach `Authorization: Bearer <token>` to every request
- Refresh the token automatically on `401`
- Hide actions the user's role cannot use (the server still enforces permissions)
- Show AI results in a review panel and call save endpoints only after user approval

---

## 5. Backend Architecture

### 5.1 Django Project Structure
```
backend/
├── manage.py
├── sprintmind/              # project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── accounts/            # User, auth, profile
│   ├── workspaces/          # Workspace, WorkspaceMember, roles
│   ├── projects/            # Project
│   ├── issues/              # Issue, Comment, ActivityLog
│   ├── sprints/             # Sprint, sprint actions
│   ├── reports/             # dashboard/report queries
│   └── ai_assistant/        # Groq client, prompts, endpoints
├── common/
│   ├── permissions.py       # role-based permission classes
│   ├── pagination.py
│   └── exceptions.py
├── requirements.txt
└── .env
```

### 5.2 Layering Inside Each App
```
View (APIView / ViewSet)  ->  Serializer (validation)  ->  Service (business rules)  ->  Model (ORM)
```
- **Views:** thin; handle request/response and permissions
- **Serializers:** validate and shape data
- **Services:** business rules (e.g., start sprint, complete sprint, generate issue key)
- **Models:** database mapping

### 5.3 Permission Classes
| Class | Rule |
|---|---|
| `IsWorkspaceMember` | User belongs to the workspace |
| `IsWorkspaceAdmin` | Role is Admin |
| `CanManageProject` | Role is Admin or Project Manager |
| `CanEditIssues` | Role is Admin, PM, or Developer |
| `ReadOnlyForViewer` | Viewer may use safe (GET) methods only |

Every queryset is filtered by the user's workspace membership so users never see other workspaces' data.

---

## 6. Data Architecture

### 6.1 ER Diagram

```mermaid
erDiagram
    USER ||--o{ WORKSPACE_MEMBER : has
    WORKSPACE ||--o{ WORKSPACE_MEMBER : has
    WORKSPACE ||--o{ PROJECT : contains
    PROJECT ||--o{ SPRINT : has
    PROJECT ||--o{ ISSUE : has
    SPRINT ||--o{ ISSUE : includes
    ISSUE ||--o{ ISSUE : parent_of
    ISSUE ||--o{ COMMENT : has
    ISSUE ||--o{ ACTIVITY_LOG : logs
    USER ||--o{ ISSUE : assigned
    USER ||--o{ COMMENT : writes
    USER ||--o{ AI_REQUEST_LOG : makes
```

### 6.2 Table Definitions

**users**
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| name | VARCHAR(120) | |
| email | VARCHAR(254) | unique |
| password | VARCHAR(128) | hashed |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

**workspaces**
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| name | VARCHAR(120) | |
| owner_id | FK users | |
| created_at | TIMESTAMPTZ | |

**workspace_members**
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| workspace_id | FK workspaces | |
| user_id | FK users | |
| role | VARCHAR(20) | `admin`, `manager`, `developer`, `viewer` |
| joined_at | TIMESTAMPTZ | |
| | | unique (workspace_id, user_id) |

**projects**
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| workspace_id | FK workspaces | |
| name | VARCHAR(120) | |
| key | VARCHAR(10) | unique per workspace, e.g. `SM` |
| description | TEXT | |
| methodology | VARCHAR(10) | `scrum` or `kanban` |
| issue_counter | INTEGER | used to build issue keys |
| is_archived | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

**sprints**
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| project_id | FK projects | |
| name | VARCHAR(120) | |
| goal | TEXT | |
| start_date | DATE | |
| end_date | DATE | |
| status | VARCHAR(12) | `planned`, `active`, `completed` |
| summary | TEXT | optional, saved AI summary after approval |
| | | partial unique index: one `active` sprint per project |

**issues**
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| project_id | FK projects | |
| number | INTEGER | per-project sequence |
| type | VARCHAR(10) | `epic`, `story`, `task`, `bug` |
| title | VARCHAR(255) | |
| description | TEXT | |
| acceptance_criteria | TEXT | for stories |
| status | VARCHAR(12) | `todo`, `in_progress`, `in_review`, `done` |
| priority | VARCHAR(10) | `low`, `medium`, `high`, `critical` |
| story_points | SMALLINT | nullable |
| assignee_id | FK users | nullable |
| reporter_id | FK users | |
| parent_id | FK issues | nullable (epic -> story -> task/bug) |
| sprint_id | FK sprints | nullable (null = backlog) |
| rank | NUMERIC | ordering in backlog and columns |
| due_date | DATE | nullable |
| created_at / updated_at | TIMESTAMPTZ | |
| | | unique (project_id, number) |

Issue key displayed as `<project.key>-<number>`, for example `SM-12`.

**comments**
| Column | Type |
|---|---|
| id | BIGSERIAL PK |
| issue_id | FK issues |
| author_id | FK users |
| body | TEXT |
| created_at | TIMESTAMPTZ |

**activity_logs**
| Column | Type |
|---|---|
| id | BIGSERIAL PK |
| issue_id | FK issues |
| actor_id | FK users |
| action | VARCHAR(50) |
| detail | JSONB |
| created_at | TIMESTAMPTZ |

**ai_request_logs**
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| user_id | FK users | |
| feature | VARCHAR(30) | `stories`, `tasks`, `criteria`, `bug`, `sprint_summary` |
| status | VARCHAR(10) | `success`, `error`, `timeout` |
| latency_ms | INTEGER | |
| created_at | TIMESTAMPTZ | |

Prompts and outputs are not stored by default, only metadata, to limit sensitive data retention.

### 6.3 Indexes
| Table | Index | Reason |
|---|---|---|
| issues | (project_id, status) | board and dashboard queries |
| issues | (project_id, sprint_id) | sprint and backlog lists |
| issues | (assignee_id) | "my tasks" |
| issues | (project_id, due_date) | overdue query |
| workspace_members | (user_id) | membership lookups |

### 6.4 Derived Metrics (computed from DB)
| Metric | Calculation |
|---|---|
| Completion % | `done issues / total issues` (or points) in scope |
| Overdue issues | `due_date < today AND status != done` |
| Sprint progress | sum of points where `status = done` / sum of all points in sprint |
| Remaining points | total points minus done points |

---

## 7. REST API Design

**Base URL:** `/api/v1/`
**Format:** JSON. **Auth:** `Authorization: Bearer <access_token>`.

### 7.1 Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register/` | Create account |
| POST | `/auth/login/` | Get access and refresh tokens |
| POST | `/auth/token/refresh/` | Refresh access token |
| POST | `/auth/logout/` | Blacklist refresh token |
| GET / PATCH | `/auth/me/` | View / update profile |
| POST | `/auth/change-password/` | Change password |

### 7.2 Workspaces and Members
| Method | Endpoint | Description |
|---|---|---|
| GET / POST | `/workspaces/` | List mine / create |
| GET / PATCH | `/workspaces/{id}/` | Details / update |
| GET | `/workspaces/{id}/members/` | List members |
| POST | `/workspaces/{id}/members/` | Add / invite member |
| PATCH / DELETE | `/workspaces/{id}/members/{user_id}/` | Change role / remove |

### 7.3 Projects
| Method | Endpoint | Description |
|---|---|---|
| GET / POST | `/projects/` | List / create |
| GET / PATCH | `/projects/{id}/` | Details / update |
| POST | `/projects/{id}/archive/` | Archive |

### 7.4 Issues
| Method | Endpoint | Description |
|---|---|---|
| GET / POST | `/projects/{id}/issues/` | List (filters) / create |
| GET / PATCH / DELETE | `/issues/{id}/` | Detail / update / delete |
| PATCH | `/issues/{id}/move/` | Change status and rank (board drag) |
| PATCH | `/issues/{id}/assign/` | Assign user |
| GET / POST | `/issues/{id}/comments/` | List / add comments |
| GET | `/issues/{id}/activity/` | Activity history |
| POST | `/projects/{id}/issues/bulk-create/` | Save accepted AI drafts |

**List filters:** `?type=&status=&priority=&assignee=&sprint=&epic=&q=`

### 7.5 Backlog and Sprints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects/{id}/backlog/` | Issues with no sprint, ordered by rank |
| PATCH | `/projects/{id}/backlog/reorder/` | Save new order |
| GET / POST | `/projects/{id}/sprints/` | List / create |
| GET / PATCH | `/sprints/{id}/` | Details / update |
| POST | `/sprints/{id}/issues/` | Add issues to sprint |
| DELETE | `/sprints/{id}/issues/{issue_id}/` | Remove from sprint |
| POST | `/sprints/{id}/start/` | Start sprint |
| POST | `/sprints/{id}/complete/` | Complete sprint (body: where to send unfinished issues) |

### 7.6 Board and Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects/{id}/board/` | Columns with issues (active sprint or all, by methodology) |
| GET | `/projects/{id}/dashboard/` | Status counts, completion %, overdue, sprint progress |
| GET | `/sprints/{id}/report/` | Sprint metrics |

### 7.7 AI Assistant
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/stories/` | Requirements text -> draft stories |
| POST | `/ai/tasks/` | Story -> suggested tasks |
| POST | `/ai/criteria/` | Story -> acceptance criteria |
| POST | `/ai/bug-analysis/` | Bug text -> analysis |
| POST | `/ai/sprint-summary/` | Sprint id -> summary draft |

AI endpoints **only return drafts**. Saving happens through the normal issue endpoints, after user approval.

### 7.8 Sample Request and Response

`POST /api/v1/ai/stories/`
```json
{
  "project_id": 3,
  "requirements": "Users should be able to reset their password by email."
}
```
Response `200`:
```json
{
  "drafts": [
    {
      "title": "Request password reset email",
      "description": "As a user, I want to request a reset link so that I can regain access.",
      "acceptance_criteria": ["Email is sent for registered addresses", "Link expires after 1 hour"],
      "story_points": 3
    }
  ],
  "disclaimer": "AI-generated draft. Review before saving."
}
```

### 7.9 Error Format
```json
{ "error": { "code": "permission_denied", "message": "You do not have access to this action." } }
```
| HTTP | Meaning |
|---|---|
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Role not allowed |
| 404 | Not found |
| 429 | Too many requests (AI rate limit) |
| 502 / 504 | AI service error or timeout |

### 7.10 Pagination
Page-number pagination, default 25 items, `?page=` and `?page_size=` (max 100).

---

## 8. AI Integration Architecture

### 8.1 Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React
    participant BE as Django API
    participant G as Groq API
    U->>FE: Paste requirements, click "Generate"
    FE->>BE: POST /ai/stories/ (JWT)
    BE->>BE: Check role, rate limit, input size
    BE->>G: Prompt (system + user text)
    G-->>BE: JSON response
    BE->>BE: Validate JSON against schema
    BE-->>FE: Draft stories
    FE-->>U: Show drafts in review panel
    U->>FE: Edit / accept / discard
    FE->>BE: POST /issues/bulk-create/ (accepted only)
    BE-->>FE: Created issues
```

### 8.2 AI Service Layer (`ai_assistant/services.py`)
| Component | Responsibility |
|---|---|
| `GroqClient` | Wrapper around the Groq API: timeout, retries, error mapping |
| `prompts.py` | Prompt templates, one per feature |
| `schemas.py` | Expected JSON output schemas |
| `validators.py` | Parse and validate model output; reject malformed results |
| `ratelimit.py` | Per-user request limits |

### 8.3 Prompt Design Principles
- A **system prompt** defines the role: "You are an Agile assistant. Respond only with valid JSON in the given schema."
- Request **structured JSON output** and validate it in code
- Use low temperature (about 0.2 to 0.4) for consistent output
- Limit input length (for example 4,000 characters) and output tokens
- For sprint summaries, **pass real computed numbers** in the prompt (done points, remaining, completed issue titles) so the AI describes data rather than inventing it

### 8.4 Safety and Reliability
| Concern | Handling |
|---|---|
| Malformed output | Validate; retry once; otherwise return a friendly error |
| Timeout | 30 s limit; return 504 with retry hint |
| Rate limits (Groq side) | Catch 429, return a clear message, back off |
| Rate limits (per user) | For example 20 AI requests per user per hour |
| Prompt injection from pasted text | Treat user text as data; instruct the model to ignore instructions inside it; output is validated and never executed |
| Hallucinated metrics | Metrics are always computed by the backend and injected, never taken from AI output |
| Data privacy | Send only the necessary text; never send emails, passwords, or tokens |
| Failure isolation | AI errors never affect non-AI endpoints |

### 8.5 Model Choice
The model name is set through an environment variable (`GROQ_MODEL`) so it can be changed without code edits. Pick a model with strong instruction following and JSON output, and check current model availability and limits in the Groq console before release.

---

## 9. Security Architecture

| Area | Measure |
|---|---|
| Authentication | JWT access (short life, about 15 min) and refresh tokens (about 7 days) with rotation and blacklist |
| Password storage | Django PBKDF2/Argon2 hashing, minimum password rules |
| Authorization | DRF permission classes on every view; queryset scoped to workspace |
| Transport | HTTPS only; HSTS in production |
| CORS | Allow only the known frontend origin |
| CSRF | Not needed for pure bearer-token APIs; required if using cookie auth |
| Input validation | DRF serializers; ORM prevents SQL injection |
| XSS | React escapes output by default; do not render raw HTML from users or AI |
| Secrets | `.env` locally; platform secrets in production; never committed |
| Rate limiting | DRF throttling: login attempts, AI endpoints |
| Database | SSL-required Neon connection; least-privilege DB user |
| Logging | Log errors and auth events; no passwords, tokens, or full AI prompts |
| Dependencies | Pin versions; periodic audit (`pip-audit`, `npm audit`) |

---

## 10. Deployment Architecture

### 10.1 Environments
| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Local | Vite dev server (`localhost:5173`) | `runserver` (`localhost:8000`) | Neon dev branch |
| Production | Static hosting (Vercel / Netlify) | Render / Railway / similar | Neon main branch |

Neon supports database **branching**, so use a separate branch for development and testing.

### 10.2 Deployment Diagram
```
                 +----------------------+
 Browser  --->   |  Static Host (CDN)   |   React build
                 +----------+-----------+
                            | API calls (HTTPS)
                 +----------v-----------+
                 |  App Host            |   Django + Gunicorn
                 +----+-------------+---+
                      |             |
            +---------v--+     +----v--------+
            |   Neon     |     |  Groq API   |
            | PostgreSQL |     |             |
            +------------+     +-------------+
```

### 10.3 Environment Variables

**Backend `.env`**
```
SECRET_KEY=change-me
DEBUG=False
ALLOWED_HOSTS=api.example.com
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
CORS_ALLOWED_ORIGINS=https://app.example.com
GROQ_API_KEY=your-key
GROQ_MODEL=your-chosen-model
AI_TIMEOUT_SECONDS=30
AI_RATE_LIMIT_PER_HOUR=20
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=7
```

**Frontend `.env`**
```
VITE_API_BASE_URL=https://api.example.com/api/v1
```

### 10.4 Operations
- Run `python manage.py migrate` on each deploy
- Use connection pooling (Neon pooled connection string) because serverless databases limit connections
- Handle Neon cold start by retrying the first connection
- Daily backups through Neon's point-in-time restore
- Health check endpoint: `GET /api/v1/health/`

---

## 11. Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| API style | REST | Simple, matches DRF |
| Auth | JWT | Works well with SPA |
| AI calls from | Backend only | Protect API key, enforce limits, validate output |
| AI output | Drafts, validated JSON | Safe and predictable |
| Metrics | Computed in SQL/ORM | Accurate and auditable |
| Issue ordering | Numeric `rank` | Cheap reordering by midpoint values |
| Issue keys | Per-project counter with row lock | Avoid duplicate keys under concurrency |
| UI state | React Query | Less custom state code |
| DB | Neon PostgreSQL | Managed, scalable, branching |

---

## 12. Error Handling and Logging

| Layer | Strategy |
|---|---|
| Frontend | Global error boundary; toast messages; retry buttons on AI failures |
| API | Central DRF exception handler returning the standard error format |
| AI | Separate exception types: `AITimeout`, `AIRateLimited`, `AIInvalidOutput`, `AIUnavailable` |
| Logs | Structured logs with request ID; errors to a monitoring tool (for example Sentry, optional) |

---

## 13. Testing Strategy (Architecture View)

| Level | Tools | Focus |
|---|---|---|
| Backend unit | `pytest`, `pytest-django` | Services, permissions, metrics |
| API tests | DRF `APIClient` | Each endpoint x each role |
| AI tests | Mocked Groq client | Valid, malformed, timeout, and rate-limited responses |
| Frontend | Vitest + React Testing Library | Components and forms |
| End-to-end | Playwright (optional) | Login, create issue, drag card, start sprint |

---

## 14. Performance Considerations

- Select related fields (`select_related`, `prefetch_related`) to avoid N+1 queries
- Paginate all list endpoints
- Use the indexes in Section 6.3
- Cache dashboard queries for a short time if needed
- Keep AI calls out of the request path of other features
- Keep board payloads small: only fields shown on cards

---

## 15. Future Extensions

- WebSockets for live board updates
- Email notifications
- GitHub integration
- Background jobs (Celery or similar) for long AI tasks
- Audit exports and CSV import/export
