# SprintMind: REST API Specification

| Field | Value |
|---|---|
| **Product** | SprintMind |
| **Version** | 1.0 |
| **Document type** | REST API Specification |
| **Base URL** | `/api/v1` |
| **Authentication** | Bearer Token (`Authorization: Bearer <access_token>`) |
| **Related docs** | [01_SprintMind_PRD.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/01_SprintMind_PRD.md), [02_SprintMind_System_Architecture.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/02_SprintMind_System_Architecture.md) |

---

## 1. Overview & Conventions

All endpoints strictly consume and return standard JSON.

### 1.1 Headers
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <jwt_access_token>
```
*(Public endpoints such as `/auth/login/` and `/auth/register/` do not require the `Authorization` header).*

### 1.2 Standard Response Structure

#### Success Response (Single Object)
```json
{
  "status": "success",
  "data": { ... }
}
```

#### Success Response (Paginated List)
Pagination is page-number based. Default page size is 25 (configurable up to 100 via `?page_size=`).
```json
{
  "count": 48,
  "next": "/api/v1/projects/1/issues/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

#### Error Response Format
All errors return a consistent envelope:
```json
{
  "error": {
    "code": "permission_denied",
    "message": "You do not have access to perform this action.",
    "details": {}
  }
}
```

| HTTP Code | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `validation_error` | Missing required fields or invalid data types. |
| `401 Unauthorized` | `authentication_failed` | Token missing, invalid, or expired. |
| `403 Forbidden` | `permission_denied` | User role lacks permission for the requested action. |
| `404 Not Found` | `not_found` | Resource does not exist or user lacks workspace access. |
| `429 Too Many Requests` | `rate_limited` | Exceeded API or AI rate limit thresholds. |
| `502 Bad Gateway` | `ai_upstream_error` | Upstream Groq API returned an error. |
| `504 Gateway Timeout` | `ai_timeout` | AI processing exceeded the 30-second timeout threshold. |

---

## 2. Authentication & Accounts

### 2.1 Register
- **Endpoint**: `POST /auth/register/`
- **Access**: Public
- **Request Body**:
```json
{
  "name": "Asha K.",
  "email": "asha@example.com",
  "password": "SecurePassword123!"
}
```
- **Response `201 Created`**:
```json
{
  "user": {
    "id": 1,
    "name": "Asha K.",
    "email": "asha@example.com",
    "created_at": "2026-10-26T10:00:00Z"
  },
  "tokens": {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
}
```

### 2.2 Login
- **Endpoint**: `POST /auth/login/`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "asha@example.com",
  "password": "SecurePassword123!"
}
```
- **Response `200 OK`**:
```json
{
  "user": {
    "id": 1,
    "name": "Asha K.",
    "email": "asha@example.com"
  },
  "tokens": {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
}
```

### 2.3 Token Refresh
- **Endpoint**: `POST /auth/token/refresh/`
- **Access**: Public (Requires valid refresh token)
- **Request Body**:
```json
{
  "refresh": "eyJhbGciOi..."
}
```
- **Response `200 OK`**:
```json
{
  "access": "eyJhbGciOi..."
}
```

### 2.4 Logout
- **Endpoint**: `POST /auth/logout/`
- **Access**: Logged in
- **Request Body**:
```json
{
  "refresh": "eyJhbGciOi..."
}
```
- **Response `200 OK`**:
```json
{
  "message": "Successfully logged out. Refresh token has been blacklisted."
}
```

### 2.5 Profile Management
- **`GET /auth/me/`**: Get current user details and workspace memberships.
- **`PATCH /auth/me/`**: Update user profile name.
- **`POST /auth/change-password/`**:
```json
{
  "old_password": "OldPassword123!",
  "new_password": "NewSecurePassword456!"
}
```

---

## 3. Workspaces & Members

### 3.1 Workspaces
- **`GET /workspaces/`**: List workspaces current user belongs to.
- **`POST /workspaces/`**: Create new workspace (creator automatically becomes `admin`).
```json
{
  "name": "Engineering Workspace"
}
```
- **`GET /workspaces/{id}/`**: Workspace detail.
- **`PATCH /workspaces/{id}/`**: Update workspace name (Admin only).

### 3.2 Members & Roles
- **`GET /workspaces/{id}/members/`**: List all members with their roles.
- **`POST /workspaces/{id}/members/`**: Invite/Add member.
```json
{
  "email": "ravi@example.com",
  "role": "manager"
}
```
*(Valid roles: `admin`, `manager`, `developer`, `viewer`)*
- **`PATCH /workspaces/{id}/members/{user_id}/`**: Change member role (Admin only).
```json
{
  "role": "developer"
}
```
- **`DELETE /workspaces/{id}/members/{user_id}/`**: Remove member from workspace (Admin only).

---

## 4. Projects

### 4.1 Project Endpoints
- **`GET /projects/`**: List projects belonging to the active workspace.
  - Query parameters: `?is_archived=false`
- **`POST /projects/`**: Create project (Admin or Project Manager).
```json
{
  "workspace_id": 1,
  "name": "SprintMind Core",
  "key": "SM",
  "description": "Core platform development",
  "methodology": "scrum"
}
```
*(Methodology values: `scrum`, `kanban`)*
- **`GET /projects/{id}/`**: Retrieve project details.
- **`PATCH /projects/{id}/`**: Edit project name, description.
- **`POST /projects/{id}/archive/`**: Soft-archive project.

---

## 5. Issues

### 5.1 Issue Endpoints
- **`GET /projects/{id}/issues/`**: List issues with filters.
  - Filters: `?type=story&status=in_progress&priority=high&assignee=1&sprint=3&epic=1&q=login`
- **`POST /projects/{id}/issues/`**: Create issue.
```json
{
  "type": "story",
  "title": "User password reset via email",
  "description": "As a user, I want to reset my password using an email token.",
  "acceptance_criteria": "- Token expires in 1 hour\n- Rate limited to 3 per hour",
  "priority": "high",
  "story_points": 3,
  "assignee_id": 2,
  "parent_id": 1,
  "sprint_id": null,
  "due_date": "2026-11-05"
}
```
*(Issue types: `epic`, `story`, `task`, `bug`)*
*(Priorities: `low`, `medium`, `high`, `critical`)*
*(Statuses: `todo`, `in_progress`, `in_review`, `done`)*

- **`GET /issues/{id}/`**: Get full issue details (including comments and linked child tasks).
- **`PATCH /issues/{id}/`**: Partial update (title, description, points, due_date, status, etc.).
- **`DELETE /issues/{id}/`**: Delete issue (Admin or Project Manager only).

### 5.2 Board Drag & Status Move
- **`PATCH /issues/{id}/move/`**: Optimistic Kanban board drag update.
```json
{
  "status": "in_review",
  "rank": 1050.5
}
```

### 5.3 Comments & Activity
- **`GET /issues/{id}/comments/`**: List comments on an issue.
- **`POST /issues/{id}/comments/`**: Post a comment.
```json
{
  "body": "Backend endpoint is ready for integration."
}
```
- **`GET /issues/{id}/activity/`**: Audit log showing all changes, timestamps, and actors.

### 5.4 Bulk Create (Accepting AI Drafts)
- **`POST /projects/{id}/issues/bulk-create/`**: Persists approved AI suggestions.
```json
{
  "issues": [
    {
      "type": "story",
      "title": "Password reset token generation",
      "description": "Generate cryptographically secure one-time tokens.",
      "acceptance_criteria": "- 32 byte entropy",
      "story_points": 2,
      "parent_id": 1
    },
    {
      "type": "story",
      "title": "Email template for reset link",
      "description": "Send styled HTML email with dynamic reset link.",
      "story_points": 1,
      "parent_id": 1
    }
  ]
}
```

---

## 6. Backlog & Sprints

### 6.1 Backlog
- **`GET /projects/{id}/backlog/`**: Returns all unassigned issues (`sprint_id = null`), ordered by `rank ASC`.
- **`PATCH /projects/{id}/backlog/reorder/`**: Save new rank ordering for backlog items.
```json
{
  "issue_id": 14,
  "prev_issue_id": 12,
  "next_issue_id": 15
}
```

### 6.2 Sprints
- **`GET /projects/{id}/sprints/`**: List sprints for a project.
- **`POST /projects/{id}/sprints/`**: Create new sprint (Admin or Project Manager).
```json
{
  "name": "Sprint 4",
  "goal": "Deliver password reset and profile view",
  "start_date": "2026-11-01",
  "end_date": "2026-11-14"
}
```
- **`GET /sprints/{id}/`**: Sprint detail.
- **`POST /sprints/{id}/issues/`**: Assign issues to sprint (`{ "issue_ids": [12, 14, 15] }`).
- **`DELETE /sprints/{id}/issues/{issue_id}/`**: Move issue back to backlog.
- **`POST /sprints/{id}/start/`**: Start sprint.
  - *Validation*: Returns `400` if another sprint is currently `active`.
- **`POST /sprints/{id}/complete/`**: Complete sprint.
```json
{
  "unfinished_issues_destination": "backlog"
}
```
*(Destination options: `backlog` or specific `sprint_id`)*

---

## 7. Board & Reports

### 7.1 Kanban Board
- **`GET /projects/{id}/board/`**:
  - For **Scrum**: Returns issues in the currently active sprint grouped by column (`todo`, `in_progress`, `in_review`, `done`).
  - For **Kanban**: Returns all active non-archived project issues grouped by column.

### 7.2 Project Dashboard
- **`GET /projects/{id}/dashboard/`**:
```json
{
  "metrics": {
    "total_issues": 48,
    "in_progress": 12,
    "done": 20,
    "overdue": 3,
    "completion_percentage": 41.6
  },
  "active_sprint": {
    "id": 3,
    "name": "Sprint 3",
    "goal": "Finish login and board",
    "start_date": "2026-10-15",
    "end_date": "2026-10-29",
    "total_points": 34,
    "done_points": 18,
    "progress_percentage": 52.9
  },
  "issues_by_status": {
    "todo": 16,
    "in_progress": 12,
    "in_review": 0,
    "done": 20
  },
  "overdue_issues": [
    {
      "key": "SM-12",
      "title": "Fix login bug",
      "due_date": "2026-10-20",
      "assignee_initials": "AK"
    }
  ]
}
```

---

## 8. AI Assistant Endpoints

AI endpoints strictly return **drafts**. They never write to the database.

### 8.1 Requirements to User Stories
- **Endpoint**: `POST /ai/stories/`
- **Request Body**:
```json
{
  "project_id": 1,
  "requirements": "Allow users to invite teammates by entering their email address and assigning a role (Admin, Manager, Developer, Viewer). An invitation email should be sent with an accept link."
}
```
- **Response `200 OK`**:
```json
{
  "drafts": [
    {
      "title": "Invite team member by email",
      "description": "As an Admin, I want to invite team members by email with a role so that they can collaborate on projects.",
      "acceptance_criteria": [
        "Email field validates valid email format",
        "Role dropdown includes Admin, Manager, Developer, Viewer",
        "Unique invite token generated with 48h expiration"
      ],
      "story_points": 3
    },
    {
      "title": "Accept workspace invitation link",
      "description": "As an invited user, I want to click an invite link so that I can automatically join the workspace.",
      "acceptance_criteria": [
        "Unregistered user is directed to register and joins",
        "Registered user joins after login",
        "Expired tokens display helpful error"
      ],
      "story_points": 2
    }
  ],
  "disclaimer": "✨ AI-generated draft. Review, edit, or discard before saving."
}
```

### 8.2 Task Breakdown
- **Endpoint**: `POST /ai/tasks/`
- **Request Body**:
```json
{
  "story_id": 5
}
```
- **Response `200 OK`**:
```json
{
  "tasks": [
    {
      "title": "Create InviteToken database model and migration",
      "estimated_points": 1
    },
    {
      "title": "Implement POST /workspaces/{id}/members/ endpoint",
      "estimated_points": 2
    },
    {
      "title": "Build InviteMemberModal frontend component",
      "estimated_points": 2
    }
  ]
}
```

### 8.3 Acceptance Criteria Generator
- **Endpoint**: `POST /ai/criteria/`
- **Request Body**:
```json
{
  "title": "User password reset via email",
  "description": "As a user, I want to reset my password using an email token."
}
```
- **Response `200 OK`**:
```json
{
  "criteria": [
    "Reset link contains secure cryptographic token",
    "Link expires after 60 minutes",
    "Token is invalidated immediately upon successful password change",
    "Rate limited to maximum 3 requests per hour per email"
  ]
}
```

### 8.4 Bug Analysis
- **Endpoint**: `POST /ai/bug-analysis/`
- **Request Body**:
```json
{
  "title": "Logout fails",
  "description": "When I click logout and refresh it sometimes keeps me logged in"
}
```
- **Response `200 OK`**:
```json
{
  "enhanced_summary": "JWT refresh token remains valid in browser cache after logout on page reload",
  "suggested_severity": "high",
  "missing_information": [
    "Browser and version",
    "Was the refresh token blacklisted on the backend?",
    "Does localStorage or cookie retain the access token?"
  ]
}
```

### 8.5 Sprint Summary Generator
- **Endpoint**: `POST /ai/sprint-summary/`
- **Request Body**:
```json
{
  "sprint_id": 3
}
```
- **Response `200 OK`**:
```json
{
  "summary_draft": "Sprint 3 successfully completed 18 of 22 planned issues, achieving a velocity of 30 story points (88% of commitment). Delivered core authentication, JWT token refresh, and the Kanban board. 4 issues were carried over to the product backlog for Sprint 4.",
  "metrics": {
    "completed_issues": 18,
    "incomplete_issues": 4,
    "completed_points": 30,
    "total_points": 34
  }
}
```

---

## 9. System Health Check

- **Endpoint**: `GET /health/`
- **Access**: Public
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0",
  "timestamp": "2026-10-26T14:00:00Z"
}
```
