# SprintMind: AI-Powered Agile Project Management System

SprintMind is a modern, lightweight, web-based Agile project management system designed for software engineering teams. It brings together **Scrum** (backlog management, sprint planning, and velocity tracking) and **Kanban** (visual status board with drag-and-drop workflows) into a unified, distraction-free workspace. It integrates **Groq AI assistance** to eliminate repetitive planning work while ensuring all project data and metrics remain strictly grounded in reality.

---

## 🚀 Key Features

- **Dual Methodology Support**: Run Scrum sprints or continuous Kanban flow within the same platform.
- **Hierarchical Issue Tracking**: Full Epic ➔ Story ➔ Task / Bug relationship modeling with priority, points, status, assignees, and due dates.
- **Interactive Kanban Board**: Drag-and-drop status transitions across four workflow stages (`To Do`, `In Progress`, `In Review`, `Done`).
- **AI Planning Assistant (Groq API)**:
  - Generate user stories from natural language requirements.
  - Break stories down into actionable sub-tasks.
  - Suggest testable acceptance criteria.
  - Analyze and clarify bug reports.
  - Draft sprint closure retrospectives and summaries.
  - *Strict human-in-the-loop rule*: AI outputs are always reviewable drafts; nothing is saved without approval.
- **Data-Driven Dashboard**: Real-time project completion %, overdue items, and sprint burndown/progress computed directly from PostgreSQL database records.
- **Multi-Tenant Workspaces & RBAC**: Role-based access control with four permission tiers: **Admin**, **Project Manager**, **Developer**, and **Viewer**.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 18, React Router, Vite | Fast, responsive single-page application |
| **State & Data Fetching** | TanStack Query (React Query) | Server-state caching and synchronization |
| **HTTP Client** | Axios | REST API client with JWT auto-refresh interceptors |
| **Drag & Drop** | `@hello-pangea/dnd` | Smooth Kanban board and backlog reordering |
| **Charts** | Recharts | Interactive dashboard metrics and progress visualizations |
| **Backend** | Python 3.11+, Django 5, DRF | Robust REST API with modular architecture |
| **Authentication** | `djangorestframework-simplejwt` | Secure JWT Access & Refresh token rotation |
| **Database** | Neon PostgreSQL (Cloud) | Serverless PostgreSQL with SSL connection pooling |
| **AI Engine** | Groq API | High-speed LLM inference with structured JSON output |

---

## 📁 Repository Structure

```
SprintMind/
├── docs/                                  # Complete project documentation suite
│   ├── 01_SprintMind_PRD.md               # Product Requirements Document
│   ├── 02_SprintMind_System_Architecture.md # Technical Architecture & Data Model
│   ├── 03_SprintMind_UI_Design.md         # UI/UX Specifications & Wireframes
│   ├── 04_SprintMind_Project_Workflow.md  # User Journeys & Development Plan
│   ├── 05_SprintMind_API_Specification.md # REST API Endpoints & Schemas
│   ├── 06_SprintMind_Test_Plan.md         # QA Matrix, RBAC & Mock AI Test Suite
│   ├── 07_SprintMind_Deployment_and_Ops_Guide.md # Neon DB, Hosting & Env Setup
│   └── 08_SprintMind_User_Guide.md        # Comprehensive End-User Manual
├── backend/                               # Django REST Framework application
│   ├── apps/                              # Modular Django apps (accounts, projects, issues, etc.)
│   ├── common/                            # Permissions, pagination, exception handlers
│   ├── sprintmind/                        # Django project configuration
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/                              # React 18 Vite application
│   ├── src/                               # Components, features, hooks, pages
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## ⚙️ Quickstart & Local Setup

### Prerequisites
- **Node.js** v18+ and `npm`
- **Python** 3.11+ and `pip`
- **Neon PostgreSQL** account (or local PostgreSQL instance)
- **Groq API Key** ([Groq Console](https://console.groq.com/))

---

### 1. Backend Setup (Django + DRF)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your `.env` values (see [Environment Variables](#-environment-variables) below).
5. Run migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the Django development server:
   ```bash
   python manage.py runserver 8000
   ```
   Backend will be accessible at: `http://localhost:8000`

---

### 2. Frontend Setup (React + Vite)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   Frontend will be accessible at: `http://localhost:5173`

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
```env
DEBUG=True
SECRET_KEY=your-django-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Neon PostgreSQL connection string (with SSL mode required)
DATABASE_URL=postgresql://user:password@ep-sample-pooler.region.neon.tech/sprintmind?sslmode=require

# CORS configuration
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Groq API configuration
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
AI_TIMEOUT_SECONDS=30
AI_RATE_LIMIT_PER_HOUR=20

# JWT Token Lifespans
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=7
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 📚 Documentation Index

| Document | Description |
|---|---|
| [01_SprintMind_PRD.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/01_SprintMind_PRD.md) | Problem statement, goals, scope, personas, and feature specifications. |
| [02_SprintMind_System_Architecture.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/02_SprintMind_System_Architecture.md) | Three-tier architecture, ER schema, permissions, and security design. |
| [03_SprintMind_UI_Design.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/03_SprintMind_UI_Design.md) | Screen layouts, color tokens, shared components, and responsive behavior. |
| [04_SprintMind_Project_Workflow.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/04_SprintMind_Project_Workflow.md) | User journeys, issue lifecycle, sprint rules, and 10-week development plan. |
| [05_SprintMind_API_Specification.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/05_SprintMind_API_Specification.md) | Exhaustive REST API reference with request/response schemas. |
| [06_SprintMind_Test_Plan.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/06_SprintMind_Test_Plan.md) | QA strategy, RBAC authorization matrix tests, and Groq mock tests. |
| [07_SprintMind_Deployment_and_Ops_Guide.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/07_SprintMind_Deployment_and_Ops_Guide.md) | Production hosting (Render/Vercel), Neon pooling, and maintenance. |
| [08_SprintMind_User_Guide.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/08_SprintMind_User_Guide.md) | End-user handbook for team members, Scrum Masters, and Admins. |
| [09_SprintMind_Implementation_Plan.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/09_SprintMind_Implementation_Plan.md) | Phase-by-phase engineering roadmap with milestones, tasks, and exit criteria. |

---

## 🛡️ License

This project is developed under the MIT License.
