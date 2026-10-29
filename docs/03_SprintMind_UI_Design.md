# SprintMind: UI Design Document

| Field | Value |
|---|---|
| **Product** | SprintMind |
| **Version** | 1.0 |
| **Document type** | UI Design (simple, low-complexity) |
| **Related docs** | PRD, System Architecture, Project Workflow |

---

## 1. Design Philosophy

The interface is deliberately **simple**. A new user should understand every screen without training.

| Principle | What it means |
|---|---|
| **Simple** | One main purpose per screen; few controls |
| **Consistent** | Same layout, buttons, and colors everywhere |
| **Clear** | Plain labels, no jargon beyond standard Agile terms |
| **Fast** | Common actions (create issue, change status) take 1 to 2 clicks |
| **Honest AI** | AI output is always labeled "AI draft" and needs approval |
| **Minimal** | No animations, themes, or customization in V1 |

---

## 2. Layout

Every logged-in page uses the same layout: a **left sidebar** and a **top bar** around a **content area**.

```
+--------------------------------------------------------------+
| TOP BAR:  [Project ▼]            [🔍 Search]        [User ▼] |
+------------+-------------------------------------------------+
| SIDEBAR    |                                                 |
|            |   PAGE TITLE                    [Primary Button]|
| Dashboard  |   ---------------------------------------------|
| Backlog    |                                                 |
| Sprints    |                                                 |
| Board      |              CONTENT AREA                       |
| Reports    |                                                 |
| ---------- |                                                 |
| Projects   |                                                 |
| Team       |                                                 |
+------------+-------------------------------------------------+
```

### Navigation Map
```
Login / Register
      |
      v
 Dashboard  <---->  Backlog  <---->  Sprints  <---->  Board  <---->  Reports
      |                 |                                  |
      +--> Projects     +--> Issue Detail (modal/page) <---+
      +--> Team (Admin)
      +--> Profile
```

---

## 3. Visual Style

### 3.1 Colors
| Use | Color | Hex |
|---|---|---|
| Primary (buttons, links, active menu) | Blue | `#2563EB` |
| Primary hover | Dark blue | `#1D4ED8` |
| Background | Light gray | `#F8FAFC` |
| Surface (cards, panels) | White | `#FFFFFF` |
| Border | Gray | `#E2E8F0` |
| Text | Dark slate | `#0F172A` |
| Muted text | Slate | `#64748B` |
| Success / Done | Green | `#16A34A` |
| Warning / In Review | Amber | `#D97706` |
| Danger / Critical / Overdue | Red | `#DC2626` |
| AI accent (labels and panels) | Purple | `#7C3AED` |

### 3.2 Typography
| Element | Style |
|---|---|
| Font | System font stack (`Inter`, `Segoe UI`, `Arial`, sans-serif) |
| Page title | 24 px, semibold |
| Section title | 18 px, semibold |
| Body | 14 px, regular |
| Small / labels | 12 px |

### 3.3 Spacing and Shape
- Spacing scale: 4, 8, 16, 24, 32 px
- Corner radius: 6 px
- Borders: 1 px solid gray; very light shadow on cards only

### 3.4 Status and Type Badges
| Status | Badge |
|---|---|
| To Do | Gray |
| In Progress | Blue |
| In Review | Amber |
| Done | Green |

| Issue type | Label |
|---|---|
| Epic | 🟣 Epic |
| Story | 🟢 Story |
| Task | 🔵 Task |
| Bug | 🔴 Bug |

| Priority | Label |
|---|---|
| Low | ⬇ Low |
| Medium | ➖ Medium |
| High | ⬆ High |
| Critical | 🔺 Critical |

---

## 4. Shared Components

| Component | Description |
|---|---|
| **Button** | Primary (blue), Secondary (white with border), Danger (red) |
| **Input / Textarea / Select** | Label above, error text below in red |
| **Card** | White box with border; used for issues and dashboard stats |
| **Badge** | Small colored pill for status, type, priority |
| **Avatar** | Circle with user initials |
| **Modal** | Centered dialog for create/edit forms and issue detail |
| **Table** | Simple rows for backlog and members |
| **Toast** | Small message at top right: success, error |
| **Empty state** | Short text plus one button, such as "No issues yet. Create issue" |
| **Loading** | Simple text "Loading..." or a small spinner |
| **AI Draft label** | Purple badge "✨ AI draft" on every AI suggestion |

---

## 5. Screens

### 5.1 Login and Register

```
+--------------------------------------+
|            SprintMind                |
|     Plan sprints. Ship faster.       |
|                                      |
|  Email     [____________________]    |
|  Password  [____________________]    |
|                                      |
|  [          Log in            ]      |
|                                      |
|  No account? Register                |
+--------------------------------------+
```
- Register adds a **Name** field and a **Confirm password** field.
- Errors show under the field.

---

### 5.2 Dashboard

```
Dashboard                                      Project: SprintMind ▼
-------------------------------------------------------------------
+-----------+ +-----------+ +-----------+ +-----------+
| Total     | | In        | | Done      | | Overdue   |
| Issues    | | Progress  | |           | |           |
|    48     | |    12     | |    20     | |     3     |
+-----------+ +-----------+ +-----------+ +-----------+

Active Sprint: Sprint 3  (Mar 1 – Mar 14)
Goal: Finish login and board
[██████████░░░░░░░░░░]  18 / 34 points  (53%)

+-----------------------------+  +------------------------------+
| Issues by Status            |  | Overdue Issues               |
| To Do         ████████  16  |  | SM-12  Fix login bug   Mar 2 |
| In Progress   ████      12  |  | SM-18  Write tests     Mar 3 |
| In Review     ██         0  |  | SM-21  Update docs     Mar 5 |
| Done          ██████    20  |  +------------------------------+
+-----------------------------+
```
- Four number cards, one sprint progress bar, one status chart, one overdue list.
- All numbers come from the database.
- Clicking a card or overdue row opens the filtered list or issue.

---

### 5.3 Projects

```
Projects                                          [+ New Project]
-------------------------------------------------------------------
+------------------------+  +------------------------+
| SprintMind (SM)        |  | Website Redesign (WR)  |
| Scrum                  |  | Kanban                 |
| 48 issues · 5 members  |  | 20 issues · 3 members  |
| [Open]                 |  | [Open]                 |
+------------------------+  +------------------------+
```

**New Project dialog**
```
+-----------------------------------+
| New Project                       |
| Name         [________________]   |
| Key          [____]  (e.g. SM)    |
| Description  [________________]   |
| Method       (•) Scrum ( ) Kanban |
|                                   |
|            [Cancel] [Create]      |
+-----------------------------------+
```

---

### 5.4 Backlog

```
Backlog                      [✨ AI: Create stories]  [+ Create Issue]
-------------------------------------------------------------------
[Search...]  Type ▼  Priority ▼  Assignee ▼

▼ Sprint 3 (active)  · 34 pts                      [Complete sprint]
 ------------------------------------------------------------------
 🟢 SM-5   User login                  High    AK   5   In Progress
 🔵 SM-6   Login form UI               Medium  RS   2   To Do
 🔴 SM-9   Logout fails on refresh     High    AK   3   In Review

▼ Sprint 4 (planned) · 0 pts                         [Start sprint]
 ------------------------------------------------------------------
 (Empty: drag issues here)

▼ Backlog · 14 issues
 ------------------------------------------------------------------
 🟢 SM-14  Password reset              Medium  --   3   To Do   [→ Sprint]
 🟢 SM-15  Profile page                Low     --   2   To Do   [→ Sprint]
 🟣 SM-1   Epic: User accounts         High    --   --  To Do
```
- Rows can be dragged to reorder or moved between sections.
- A simple **"→ Sprint"** dropdown is the non-drag option.
- Click a row to open the Issue Detail.

**Create Issue dialog**
```
+-------------------------------------------+
| Create Issue                              |
| Type      [Story ▼]                       |
| Title     [___________________________]   |
| Description  [______________________]     |
|              [______________________]     |
| Priority  [Medium ▼]   Points [3]         |
| Assignee  [Unassigned ▼]                  |
| Epic      [None ▼]     Due date [____]    |
|                                           |
| [✨ Suggest acceptance criteria]          |
|                                           |
|                     [Cancel] [Create]     |
+-------------------------------------------+
```

---

### 5.5 Sprints

```
Sprints                                           [+ New Sprint]
-------------------------------------------------------------------
Sprint 3   ACTIVE      Mar 1 – Mar 14      18/34 pts   [Open board]
Sprint 4   PLANNED     Mar 15 – Mar 28      0/0 pts    [Start] [Edit]
Sprint 2   COMPLETED   Feb 15 – Feb 28     30/30 pts   [View summary]
Sprint 1   COMPLETED   Feb 1 – Feb 14      22/28 pts   [View summary]
```

**New Sprint dialog:** Name, Goal, Start date, End date.

**Complete Sprint dialog**
```
+--------------------------------------------+
| Complete Sprint 3                          |
| 18 issues done · 4 not finished            |
|                                            |
| Move unfinished issues to:                 |
| (•) Backlog   ( ) Sprint 4                 |
|                                            |
|                    [Cancel] [Complete]     |
+--------------------------------------------+
```

**Sprint Summary (after completion)**
```
Sprint 3 Summary
-----------------------------------------
Completed: 18 issues · 30 points
Not finished: 4 issues
Velocity: 30 pts

[✨ Generate AI summary]
 ┌───────────────────────────────────────┐
 │ ✨ AI draft                           │
 │ Sprint 3 delivered login and the      │
 │ board. Four items moved to backlog... │
 │ [Edit]  [Save summary]  [Discard]     │
 └───────────────────────────────────────┘
```
The AI text is written from computed numbers and must be saved by the user.

---

### 5.6 Kanban Board

```
Board: Sprint 3                                   Assignee ▼
-------------------------------------------------------------------
 TO DO (4)          IN PROGRESS (3)     IN REVIEW (1)     DONE (6)
+--------------+   +--------------+    +--------------+  +--------------+
| SM-6         |   | SM-5         |    | SM-9         |  | SM-2         |
| Login form   |   | User login   |    | Logout fix   |  | Setup repo   |
| 🔵 ⬆ 2  [RS] |   | 🟢 ⬆ 5  [AK] |    | 🔴 ⬆ 3  [AK] |  | 🔵 ➖ 1 [RS] |
+--------------+   +--------------+    +--------------+  +--------------+
+--------------+   +--------------+
| SM-7         |   | SM-8         |
| Header       |   | API auth     |
| 🔵 ➖ 1  [--] |   | 🔵 ⬆ 3  [MK] |
+--------------+   +--------------+
```
- **Drag a card** to another column to change its status.
- Each card shows: key, title, type icon, priority, points, assignee initials.
- Click a card to open Issue Detail.
- Four fixed columns; no custom columns in V1.
- On mobile or tablet, a status dropdown on the card is the fallback for dragging.

---

### 5.7 Issue Detail (modal or page)

```
+-------------------------------------------------------------------+
| 🟢 SM-5   User login                                      [✕]     |
|-------------------------------------------------------------------|
| LEFT (main)                         | RIGHT (details)             |
|                                     |                             |
| Description                         | Status    [In Progress ▼]   |
| As a user, I want to log in so that | Assignee  [AK ▼]            |
| I can access my workspace.          | Priority  [High ▼]          |
|                                     | Points    [5]               |
| Acceptance criteria                 | Sprint    Sprint 3          |
| • Valid login opens dashboard       | Epic      User accounts     |
| • Wrong password shows an error     | Due date  Mar 10            |
| [✨ Suggest criteria]               | Reporter  RS                |
|                                     |                             |
| Sub-tasks            [+ Add]        | [Delete issue]              |
| ☑ SM-6 Login form UI                |                             |
| ☐ SM-8 API auth                     |                             |
| [✨ Suggest tasks]                  |                             |
|                                     |                             |
| Comments                            |                             |
| RS: Please add rate limiting.       |                             |
| [Write a comment...]      [Send]    |                             |
+-------------------------------------------------------------------+
```
- For **bugs**, an extra button: **[✨ Analyze bug]**.
- Fields save when changed (no big Save button) or with a simple Save button; choose one and keep it consistent.
- Viewers see everything read-only.

---

### 5.8 AI Assistant Panels

All AI features use the **same review pattern**: Generate → Review drafts → Accept or Discard.

#### A. Requirements to Stories

```
+-----------------------------------------------------------------+
| ✨ Create stories from requirements                       [✕]   |
|-----------------------------------------------------------------|
| Paste your requirements:                                        |
| [_______________________________________________________]      |
| [_______________________________________________________]      |
|                                       [Generate drafts]         |
|-----------------------------------------------------------------|
| ✨ AI drafts. Please review before adding.                      |
|                                                                 |
| ☑ Request password reset email                    3 pts  [Edit] |
|    As a user, I want to request a reset link...                 |
| ☑ Set a new password from the link                2 pts  [Edit] |
|    As a user, I want to set a new password...                   |
| ☐ Send confirmation after reset                   1 pt   [Edit] |
|                                                                 |
|                      [Discard all]  [Add selected to backlog]   |
+-----------------------------------------------------------------+
```

#### B. Task Suggestions, Acceptance Criteria, Bug Analysis
Shown inside the Issue Detail as a small purple-outlined box:

```
┌───────────────────────────────────────────────┐
│ ✨ AI draft: suggested tasks                  │
│ ☑ Create reset-token model                    │
│ ☑ Build reset email template                  │
│ ☐ Add expiry check                            │
│ [Add selected]   [Regenerate]   [Discard]     │
└───────────────────────────────────────────────┘
```

Bug analysis box:
```
┌───────────────────────────────────────────────┐
│ ✨ AI draft: bug analysis                     │
│ Clearer summary: ...                          │
│ Suggested severity: High                      │
│ Missing info to ask: browser, steps, logs     │
│ [Apply summary]   [Discard]                   │
└───────────────────────────────────────────────┘
```

#### AI States
| State | Display |
|---|---|
| Loading | Button disabled, text "Generating..." |
| Success | Draft box with purple "✨ AI draft" label |
| Error | Red message: "AI is unavailable right now. You can still create issues manually." plus **[Try again]** |
| Rate limited | "Too many AI requests. Please try again later." |

---

### 5.9 Reports

```
Reports                                         Sprint: Sprint 3 ▼
-------------------------------------------------------------------
Sprint progress          Points done vs. remaining
[██████████░░░░░░░░░░]   18 done · 16 remaining

Simple burndown (optional, V1.2)
 34 |*
    |   *
    |      *  *
    |            *
  0 +-------------------
     D1  D3  D5  D7 ...

Issues by assignee
 AK  ██████  8
 RS  ████    5
 MK  ███     4
```

---

### 5.10 Team (Admin only)

```
Team                                            [+ Invite member]
-------------------------------------------------------------------
Name             Email                 Role          Action
Asha K.          asha@x.com            Admin         —
Ravi S.          ravi@x.com            Manager       [Change role] [Remove]
Mina K.          mina@x.com            Developer     [Change role] [Remove]
```

**Invite dialog:** Email, Role (dropdown), [Send invite].

---

### 5.11 Profile
Name, email (read-only), change password. One simple form with a Save button.

---

## 6. Role-Based UI Rules

| UI element | Admin | Manager | Developer | Viewer |
|---|:---:|:---:|:---:|:---:|
| Team page | ✅ | ❌ | ❌ | ❌ |
| New Project button | ✅ | ✅ | ❌ | ❌ |
| Create / Start / Complete sprint | ✅ | ✅ | ❌ | ❌ |
| Create / edit issue | ✅ | ✅ | ✅ | ❌ |
| Delete issue | ✅ | ✅ | ❌ | ❌ |
| Drag cards | ✅ | ✅ | ✅ | ❌ |
| AI buttons | ✅ | ✅ | ✅ | ❌ |
| Dashboard and reports | ✅ | ✅ | ✅ | ✅ |

Hidden controls are a convenience only; the server enforces all permissions.

---

## 7. Interaction Rules

| Situation | Behavior |
|---|---|
| Create or edit success | Toast "Saved" |
| Delete | Confirmation dialog: "Delete SM-5? This cannot be undone." |
| Form errors | Red text under the field; keep the user's input |
| Empty list | Short message and one action button |
| Unsaved changes in a dialog | Warn on close |
| Session expired | Redirect to login with message |
| Starting a sprint when one is active | Disabled button with tooltip: "Complete the active sprint first" |

---

## 8. Responsive Behavior

| Screen | Behavior |
|---|---|
| Desktop (1024 px and up) | Full layout as shown |
| Tablet (768 to 1023 px) | Sidebar collapses to icons; board scrolls horizontally |
| Mobile (under 768 px) | Basic support: sidebar becomes a menu button; board columns stack; status dropdown replaces drag |

V1 is **desktop-first**. Mobile is usable but not optimized.

---

## 9. Accessibility Basics

- Color contrast of at least 4.5:1 for text
- Status shown with **text and color**, never color alone
- Keyboard focus visible on all controls; forms usable with the keyboard
- Labels connected to inputs
- Modals trap focus and close with `Esc`
- Buttons and icons have accessible names

---

## 10. Component to Screen Map (for Developers)

| Screen | Main components |
|---|---|
| Login / Register | `AuthForm` |
| Dashboard | `StatCard`, `ProgressBar`, `StatusChart`, `OverdueList` |
| Projects | `ProjectCard`, `ProjectFormModal` |
| Backlog | `IssueRow`, `SprintSection`, `IssueFormModal`, `AIStoriesModal` |
| Sprints | `SprintTable`, `SprintFormModal`, `CompleteSprintModal`, `SprintSummary` |
| Board | `BoardColumn`, `IssueCard` |
| Issue Detail | `IssueDetail`, `SubtaskList`, `CommentList`, `AIDraftBox` |
| Reports | `ProgressBar`, `BarList`, `BurndownChart` |
| Team | `MemberTable`, `InviteModal` |

---

## 11. Out of Scope for the UI (V1)

- Dark mode and custom themes
- Custom board columns and WIP limits
- Rich-text or markdown editor (plain textarea only)
- File attachments
- Animations and complex transitions
- Native mobile design
