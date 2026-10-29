# SprintMind: Product Requirements Document (PRD)

| Field | Value |
|---|---|
| **Product** | SprintMind: AI-Powered Agile Project Management System |
| **Version** | 1.0 |
| **Status** | Draft for development |
| **Document type** | Product Requirements Document |

---

## 1. Overview

### 1.1 Product Summary
SprintMind is a web-based Agile project management system for software teams. It supports **Scrum** (backlog, sprints) and **Kanban** (board with columns) in one workspace. It adds **AI assistance** (via the Groq API) to reduce repetitive planning work, such as drafting user stories, breaking work into tasks, and summarizing sprints.

### 1.2 Vision
Give small software teams one simple place to plan, track, and deliver work, with AI that speeds up planning but never replaces human decisions or real project data.

### 1.3 Tech Stack (fixed)
| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Django + Django REST Framework |
| Database | Neon PostgreSQL (cloud) |
| AI | Groq API |

---

## 2. Problem Statement

Small development teams face these problems:

1. Planning tools are heavy, complex, or expensive.
2. Writing user stories, acceptance criteria, and task breakdowns is repetitive and time-consuming.
3. Bug reports are often vague and hard to triage.
4. Sprint progress is hard to see at a glance, and summaries are written by hand.
5. Teams juggle several tools for backlog, board, and reports.

**SprintMind's answer:** one lightweight tool with the essential Agile features plus AI-assisted drafting, where all numbers come from real data.

---

## 3. Goals and Non-Goals

### 3.1 Goals
| ID | Goal |
|---|---|
| G1 | Provide a central workspace for projects, backlog, sprints, and issues |
| G2 | Support both Scrum and Kanban workflows |
| G3 | Provide role-based access for team members |
| G4 | Provide a dashboard with accurate, data-driven progress metrics |
| G5 | Provide AI assistance for planning tasks, always subject to human review |
| G6 | Keep the interface simple and quick to learn |

### 3.2 Non-Goals (Version 1)
- Time tracking and billing
- Third-party integrations (GitHub, Slack, Jira import)
- Real-time collaborative editing
- Native mobile apps
- Custom workflow builders and advanced automation
- AI that changes project data without user approval

---

## 4. Target Users and Roles

### 4.1 Personas
| Persona | Description | Main needs |
|---|---|---|
| **Project Manager / Scrum Master** | Plans sprints and monitors delivery | Backlog control, sprint planning, reports |
| **Developer** | Works on assigned tasks and bugs | Clear task list, easy status updates |
| **Product Owner** | Owns requirements and priorities | Create stories, prioritize backlog |
| **Admin** | Manages the workspace | User and role management |

### 4.2 Role Permissions
| Action | Admin | Project Manager | Developer | Viewer |
|---|:---:|:---:|:---:|:---:|
| Manage workspace and members | ✅ | ❌ | ❌ | ❌ |
| Create / edit / delete projects | ✅ | ✅ | ❌ | ❌ |
| Create and edit issues | ✅ | ✅ | ✅ | ❌ |
| Delete issues | ✅ | ✅ | ❌ | ❌ |
| Create / start / complete sprints | ✅ | ✅ | ❌ | ❌ |
| Move cards on board | ✅ | ✅ | ✅ | ❌ |
| Use AI assistant | ✅ | ✅ | ✅ | ❌ |
| View dashboard and reports | ✅ | ✅ | ✅ | ✅ |

---

## 5. Scope and Features

### 5.1 Feature Summary
| # | Module | Priority |
|---|---|---|
| 1 | Authentication and user accounts | Must |
| 2 | Workspaces and members | Must |
| 3 | Projects | Must |
| 4 | Issues: epics, stories, tasks, bugs | Must |
| 5 | Product backlog | Must |
| 6 | Sprint management | Must |
| 7 | Kanban board | Must |
| 8 | Dashboard and reports | Must |
| 9 | AI assistant | Must |
| 10 | Comments and activity log | Should |
| 11 | Search and filters | Should |
| 12 | Notifications (in-app) | Could |

---

## 6. Functional Requirements

### 6.1 Authentication and Accounts (AUTH)
| ID | Requirement | Priority |
|---|---|---|
| AUTH-1 | Users can register with name, email, and password | Must |
| AUTH-2 | Users can log in and log out securely | Must |
| AUTH-3 | Sessions are maintained using token-based authentication (JWT) | Must |
| AUTH-4 | Users can view and edit their profile | Should |
| AUTH-5 | Users can change their password | Should |

### 6.2 Workspaces and Members (WS)
| ID | Requirement | Priority |
|---|---|---|
| WS-1 | A user can create a workspace and becomes its Admin | Must |
| WS-2 | Admin can invite members by email and assign a role | Must |
| WS-3 | Admin can change a member's role or remove a member | Must |
| WS-4 | A user can belong to multiple workspaces | Should |

### 6.3 Projects (PRJ)
| ID | Requirement | Priority |
|---|---|---|
| PRJ-1 | Create a project with name, key (e.g., `SM`), description, and methodology (Scrum or Kanban) | Must |
| PRJ-2 | Edit and archive a project | Must |
| PRJ-3 | Assign members to a project | Must |
| PRJ-4 | Issues get automatic keys such as `SM-1`, `SM-2` | Must |

### 6.4 Issues (ISS)
Issue types: **Epic, Story, Task, Bug**.

| ID | Requirement | Priority |
|---|---|---|
| ISS-1 | Create an issue with type, title, description, priority, assignee, and estimate (story points) | Must |
| ISS-2 | Link stories to an epic and tasks/bugs to a story | Must |
| ISS-3 | Issue statuses: `To Do`, `In Progress`, `In Review`, `Done` | Must |
| ISS-4 | Priorities: `Low`, `Medium`, `High`, `Critical` | Must |
| ISS-5 | Edit, reassign, and delete issues (subject to role) | Must |
| ISS-6 | Add acceptance criteria to stories | Must |
| ISS-7 | Add due dates | Should |
| ISS-8 | Add comments to an issue | Should |
| ISS-9 | View an activity history for each issue | Could |

### 6.5 Product Backlog (BKL)
| ID | Requirement | Priority |
|---|---|---|
| BKL-1 | Show all issues not assigned to a sprint in a prioritized list | Must |
| BKL-2 | Reorder backlog items | Must |
| BKL-3 | Move issues between backlog and a sprint | Must |
| BKL-4 | Filter by type, priority, assignee, and epic | Should |

### 6.6 Sprint Management (SPR)
| ID | Requirement | Priority |
|---|---|---|
| SPR-1 | Create a sprint with name, goal, start date, and end date | Must |
| SPR-2 | Add issues to a sprint from the backlog | Must |
| SPR-3 | Start a sprint (only one active sprint per project) | Must |
| SPR-4 | Complete a sprint; unfinished issues go back to the backlog or to the next sprint | Must |
| SPR-5 | Show sprint progress: total, done, remaining points | Must |
| SPR-6 | Show a sprint summary on completion | Should |

### 6.7 Kanban Board (KAN)
| ID | Requirement | Priority |
|---|---|---|
| KAN-1 | Show columns for each status with issue cards | Must |
| KAN-2 | Drag a card to another column to change its status | Must |
| KAN-3 | Cards show key, title, assignee, priority, and type | Must |
| KAN-4 | For Scrum projects, the board shows the active sprint only | Must |
| KAN-5 | For Kanban projects, the board shows all non-archived issues | Must |
| KAN-6 | Filter the board by assignee | Should |

### 6.8 Dashboard and Reports (DSH)
| ID | Requirement | Priority |
|---|---|---|
| DSH-1 | Show total issues by status | Must |
| DSH-2 | Show task completion percentage | Must |
| DSH-3 | Show a list of overdue issues | Must |
| DSH-4 | Show active sprint progress | Must |
| DSH-5 | Show issues by assignee | Should |
| DSH-6 | Show a simple burndown chart | Could |

All metrics are **calculated from database records**, never from AI output.

### 6.9 AI Assistant (AI)
| ID | Requirement | Priority |
|---|---|---|
| AI-1 | **Requirements to stories:** user pastes requirements text, AI returns draft user stories with titles and descriptions | Must |
| AI-2 | **Task breakdown:** for a story, AI suggests tasks | Must |
| AI-3 | **Acceptance criteria:** for a story, AI suggests acceptance criteria | Must |
| AI-4 | **Bug analysis:** for a bug description, AI suggests a clearer summary, possible severity, and missing information to ask for | Should |
| AI-5 | **Sprint summary:** for a completed sprint, AI writes a short summary from real sprint data | Should |
| AI-6 | All AI output is shown as a **draft**; the user can edit, accept, or discard each suggestion | Must |
| AI-7 | Nothing is saved to the project until the user accepts it | Must |
| AI-8 | If the AI service fails, the app shows a clear message and everything else keeps working | Must |

### 6.10 Search and Filters (SRC)
| ID | Requirement | Priority |
|---|---|---|
| SRC-1 | Search issues by key or title | Should |
| SRC-2 | Filter issue lists by status, type, priority, and assignee | Should |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Pages load in under 3 seconds on normal connections; API responses under 500 ms for standard requests (excluding AI) |
| **AI latency** | AI requests show a loading state; time out after 30 seconds with a retry option |
| **Security** | Passwords hashed; JWT authentication; HTTPS; role checks enforced on the server; API keys kept in environment variables, never sent to the browser |
| **Reliability** | AI or network failure must not break core features |
| **Usability** | A new user can create a project and an issue within 5 minutes without help |
| **Compatibility** | Latest versions of Chrome, Edge, Firefox, and Safari; responsive down to tablet width |
| **Scalability** | Designed for teams up to about 50 users and 100,000 issues in V1 |
| **Maintainability** | Clear code structure, consistent naming, API documentation |
| **Data integrity** | Foreign keys and constraints in PostgreSQL; soft delete for projects |
| **Privacy** | Only the minimum text needed is sent to the AI service; users are told AI features send text to a third-party API |

---

## 8. Key User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-1 | New user | register and log in | I can access my workspace |
| US-2 | Admin | invite team members and set roles | the right people have the right access |
| US-3 | Project Manager | create a project | my team has a place to work |
| US-4 | Product Owner | paste requirements and get draft stories | I save time writing them |
| US-5 | Product Owner | prioritize the backlog | the team works on what matters |
| US-6 | Project Manager | plan and start a sprint | the team has a clear goal and scope |
| US-7 | Developer | see my assigned tasks | I know what to work on |
| US-8 | Developer | drag a card across the board | I can update status quickly |
| US-9 | Developer | get suggested tasks for a story | I can plan work faster |
| US-10 | Project Manager | view a dashboard | I can see progress and overdue items |
| US-11 | Project Manager | get an AI-written sprint summary | I save time on reporting |
| US-12 | Viewer | see project status | I stay informed without editing |

---

## 9. Core Data Entities (Summary)

| Entity | Key fields |
|---|---|
| User | id, name, email, password_hash |
| Workspace | id, name, owner |
| WorkspaceMember | workspace, user, role |
| Project | id, workspace, name, key, description, methodology, is_archived |
| Issue | id, project, key, type, title, description, status, priority, assignee, reporter, story_points, parent, sprint, due_date, rank |
| Sprint | id, project, name, goal, start_date, end_date, status |
| Comment | id, issue, author, body, created_at |
| ActivityLog | id, issue, actor, action, created_at |
| AIRequestLog | id, user, feature, status, created_at |

Full schema is in the System Architecture document.

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Time to create first project and issue | Under 5 minutes |
| Time saved on story drafting (user-reported) | At least 30% |
| AI suggestions accepted (edited or as-is) | At least 40% |
| Core feature uptime | 99% or higher |
| Critical bugs at release | 0 |
| User satisfaction (simple survey) | 4 out of 5 or higher |

---

## 11. Assumptions and Constraints

**Assumptions**
- Users have a modern browser and internet access.
- Teams are small (up to about 50 people).
- A valid Groq API key is available.
- Neon free or low-tier plan is enough for V1.

**Constraints**
- Fixed tech stack: React, Django REST Framework, Neon PostgreSQL, Groq.
- AI features depend on Groq availability and rate limits.
- Simple UI is a deliberate decision, with no complex customization.

---

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI produces wrong or irrelevant output | Medium | Drafts only; user review required; clear "AI draft" label |
| Groq API downtime or rate limits | Medium | Timeouts, retry, graceful error message, per-user rate limiting |
| Sensitive data sent to the AI | Medium | Send only the needed text; show a notice; never send credentials |
| Neon cold starts or connection limits | Low | Connection pooling; retry logic |
| Scope creep | Medium | Keep a strict V1 scope; log extras in a future backlog |
| Permission bugs | High | Server-side role checks; tests for each role |

---

## 13. Release Plan

| Phase | Content |
|---|---|
| **MVP (V1.0)** | Auth, workspace, projects, issues, backlog, sprints, Kanban board, dashboard, AI story/task/criteria drafting |
| **V1.1** | Comments, activity log, bug analysis, sprint summary, search and filters |
| **V1.2** | In-app notifications, burndown chart, CSV export |
| **Future** | Integrations, mobile app, time tracking, custom workflows |

---

## 14. Open Questions

1. Should registration be open, or invite-only?
2. Should Kanban projects support WIP limits in V1?
3. Which Groq model will be the default, and what are its limits for the chosen plan?
4. Is email delivery (invites, password reset) needed in V1, or are invite links enough?
5. Should Viewers be allowed to comment?

---

## 15. Acceptance Criteria for V1

- All **Must** requirements in Section 6 are implemented and tested.
- Each role can perform only its permitted actions.
- Dashboard numbers match database records exactly.
- AI output is never saved without user approval.
- App remains fully usable when the AI service is unavailable.
- No critical or high-severity open bugs.
