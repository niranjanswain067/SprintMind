# SprintMind: End-User Guide & Operating Manual

| Field | Value |
|---|---|
| **Product** | SprintMind: AI-Powered Agile Project Management System |
| **Version** | 1.0 |
| **Document type** | User Guide & Operational Handbook |
| **Audience** | Product Owners, Scrum Masters, Developers, Workspace Admins |
| **Related docs** | [01_SprintMind_PRD.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/01_SprintMind_PRD.md), [03_SprintMind_UI_Design.md](file:///c:/Users/Asus/Desktop/SprintMind/docs/03_SprintMind_UI_Design.md) |

---

## 1. Welcome to SprintMind

SprintMind is designed to keep your development team aligned, organized, and focused on shipping quality software. By combining Scrum and Kanban with intelligent AI drafting tools, SprintMind eliminates planning fatigue while keeping you in full control of your project data.

---

## 2. Getting Started

### 2.1 Registration & Login
1. Navigate to the SprintMind URL.
2. If you are new, click **Register**, fill in your full name, email, and password.
3. Log in with your email and password. Your session will remain securely active via JWT authentication.

### 2.2 Workspaces & Multi-Tenancy
- When you first register, you are prompted to create a **Workspace** (e.g. `Acme Software`).
- As the creator of the workspace, you are assigned the **Admin** role.
- You can belong to multiple workspaces and switch between them using the top-bar workspace switcher.

### 2.3 User Roles & What You Can Do
SprintMind includes 4 predefined roles:
- **Admin**: Manages workspace members, invites teammates, assigns roles, and configures projects.
- **Project Manager / Scrum Master**: Creates projects, manages sprints, organizes the backlog, and reviews metrics.
- **Developer**: Creates and updates issues, drags cards on the board, adds comments, and uses AI drafting tools.
- **Viewer**: Read-only stakeholder who can view dashboards, boards, and reports without editing data.

---

## 3. Projects: Scrum vs. Kanban

### 3.1 Creating a New Project
1. Go to the **Projects** page in the left sidebar.
2. Click **+ New Project**.
3. Choose:
   - **Name**: e.g. `Mobile App`
   - **Key**: A 2-4 letter uppercase prefix (e.g. `MA`). All issues will be prefixed with this key (e.g. `MA-1`, `MA-2`).
   - **Methodology**:
     - **Scrum**: Organizes work into time-boxed sprints with dedicated backlog planning.
     - **Kanban**: Continuous delivery board showing all active issues across columns.

---

## 4. Backlog & Issue Management

### 4.1 Issue Types & Hierarchy
SprintMind organizes work into a clear 3-tier hierarchy:
```
🟣 Epic (Broad strategic initiative)
 └── 🟢 Story (Deliverable user requirement)
      ├── 🔵 Task (Technical work item)
      └── 🔴 Bug (Defect or malfunction)
```

### 4.2 Creating an Issue
1. In the **Backlog** or **Board**, click **+ Create Issue**.
2. Select the issue type, enter a clear title and description.
3. Optionally set:
   - **Story Points**: Effort estimation (e.g., 1, 2, 3, 5, 8).
   - **Priority**: `Low`, `Medium`, `High`, or `Critical`.
   - **Assignee**: Select a team member.
   - **Due Date**: Date by which the issue should be completed.
4. Click **Create**. The issue receives the next sequential ID automatically.

### 4.3 Backlog Prioritization
- Open **Backlog** to view all issues not yet assigned to an active sprint.
- Drag any row up or down to reorder priorities. Items at the top represent the highest priority.

---

## 5. Running Sprints (Scrum Projects)

### 5.1 Planning a Sprint
1. In the Backlog view, click **+ New Sprint**.
2. Set a **Sprint Name** (e.g., `Sprint 1 - Authentication`), **Goal**, and start/end dates.
3. Drag prioritized stories from the **Backlog** section into the new **Sprint** container.
4. Review total planned story points to make sure commitment is realistic.

### 5.2 Starting a Sprint
- Click **Start Sprint**.
- *Rule*: Only **one** sprint may be active at any given time per project. If a sprint is already active, you must complete it before starting a new one.

### 5.3 Completing a Sprint
1. When your sprint reaches its end date, click **Complete Sprint**.
2. A dialog displays the number of completed vs. unfinished issues.
3. Select where to move unfinished work:
   - **Move to Backlog** (Default)
   - **Move to Next Planned Sprint**
4. Click **Complete**. Completed issues remain locked to the completed sprint for accurate reporting.

---

## 6. Using the Interactive Kanban Board

1. Click **Board** in the sidebar.
2. You will see four workflow columns:
   - **To Do**: Work ready to be started.
   - **In Progress**: Active work currently underway.
   - **In Review**: Work undergoing peer code review or QA.
   - **Done**: Fully completed and verified work.
3. **Move Issues**: Simply drag a card from one column to another. The board updates immediately.
4. **Card Information**: Each card displays the issue key (e.g., `SM-5`), title, assignee avatar, priority badge, and story points.
5. **Filters**: Use the top-bar filter to view only issues assigned to you.

---

## 7. AI Assistant Features (Powered by Groq)

SprintMind's AI assistant uses fast LLM inference to eliminate boilerplate planning.

> **Crucial Rule**: The AI **never** modifies or creates issues without your consent. All AI responses appear in a review panel labeled `✨ AI draft`. You can edit, accept, or discard suggestions.

### 7.1 Generate User Stories from Requirements
1. In the Backlog, click **✨ AI: Create stories**.
2. Paste raw requirements, meeting notes, or feature briefs into the text area.
3. Click **Generate drafts**.
4. The AI will output drafted stories with titles, descriptions, and story point estimates.
5. Review each draft, check the ones you want, and click **Add selected to backlog**.

### 7.2 Suggest Sub-Tasks for a Story
1. Open any Story modal.
2. Under the **Sub-tasks** section, click **✨ Suggest tasks**.
3. Select the tasks that make sense and click **Add selected**.

### 7.3 Suggest Acceptance Criteria
1. When viewing or creating a Story, click **✨ Suggest criteria**.
2. The AI provides clear, testable bullet points.
3. Click **Apply to issue** to populate the Acceptance Criteria field.

### 7.4 Analyze Bug Reports
1. Open any Bug issue.
2. Click **✨ Analyze bug**.
3. The AI suggests a clearer, technical summary, recommends a severity rating, and lists missing triage details (e.g. browser versions, steps to reproduce).

### 7.5 AI Sprint Summary
1. Upon completing a sprint, click **✨ Generate AI summary**.
2. The AI processes actual database counts (completed issues, points, carry-over items) and drafts release notes.
3. Edit the text as needed and click **Save summary**.

---

## 8. Dashboard & Metrics

Click **Dashboard** to see instant, live project health indicators:
- **Total Issues & Completed Issues**: Overall project progress.
- **Active Sprint Progress Bar**: Real-time points done vs. total committed.
- **Overdue Issues**: Any issue where `due date < today` and status is not `Done`.
- **Issues by Status**: Visual breakdown across `To Do`, `In Progress`, `In Review`, and `Done`.

All metrics are calculated directly from PostgreSQL records, guaranteeing 100% accuracy.

---

## 9. FAQs & Troubleshooting

### Why is the "Start Sprint" button disabled?
SprintMind enforces Scrum best practices: only one sprint can be active at a time. Complete the currently active sprint before starting a new one.

### What happens if the AI fails or takes too long?
If your network experiences latency or the AI service hits rate limits, a friendly message will appear with a **Try again** button. The rest of SprintMind continues to operate smoothly; your issues, board, and backlog are never blocked by AI downtime.

### How do I invite a coworker to my project?
Workspace Admins can navigate to **Team** in the sidebar, click **+ Invite member**, enter their email, and assign their role.
