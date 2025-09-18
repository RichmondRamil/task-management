# Data Model

<img width="870" height="513" alt="Image" src="https://github.com/user-attachments/assets/e09569a3-0962-438c-92d6-97b2ab01adb5" />

## Core Entities
- **Profile** – User accounts with email, name, and bio  
- **Project** – Project containers with status tracking  
- **Task** – Work items with status, priority, and due dates  
- **ProjectMember** – Junction table for user–project relationships with roles  

## Key Relationships
- **Profile owns Projects (1:M)** – Each project has one owner  
- **Profile joins Projects (M:M via ProjectMember)** – Users can be members with roles (owner/admin/member)  
- **Profile creates/assigns Tasks (1:M)** – Users create and can be assigned tasks  
- **Project contains Tasks (1:M)** – Tasks can optionally belong to projects  

## Design Features
- **Flexible Task System** – Tasks can exist with or without project assignment  
- **Role-Based Access** – Different permission levels through ProjectMember roles  
- **Status Management** – Enums for project status, task status/priority, member roles  
- **Data Integrity** – Cascade deletion, unique constraints, and audit timestamps  
- **Optional Relationships** – Supports various workflow patterns  

---
### 1. Sign In
**Description:** Users can securely log in with their account credentials.  
**GIF:**  
![Image](https://github.com/user-attachments/assets/71a9b107-37e4-4b2c-b16c-03a4fdb5f935)

---

### 2. Sign Up
**Description:** New users can register by providing their details.  
**GIF:**  
![Image](https://github.com/user-attachments/assets/df4be72c-ef55-4cf3-ab77-3eae11e8317d)

---

### 3. Create New Project
**Description:** Users can create a new project and become its owner.  
**GIF:**  
![Image](https://github.com/user-attachments/assets/c81c530f-6375-4e96-8b41-a3d45027696a)

---

### 4. Create New Task
**Description:** Users can add tasks within projects they own or collaborate on.  
**GIF:**  
![Create Task](https://previews.dropbox.com/p/thumb/ACxMZSBV6OVVOiM7yWC73JzYU6oTzDjd0ohy-7I3AwQKVrZ-2F9_DLYvFUX2vTt1FUzxKRl-XW3Ci_Yf7cb3V7qPZVzh3qVIhA2PVANA8fpQECajC2QIN1-bE8Rjh5k_U0q-O4xNX2l2LKf5gRC5Yo3fSn9JvUIC9vq242yiyFhm3G7ONypmlGyRkVvmARb389nHdcgMHK8LaQekZe9YfhB8xFbHVcb302QmiLA6DbKtN6R1NGf0nW3n6V2DN7OT3iSJ365DZvUQ-Zv4cvww5PahUCybMsejJZAo3407AdSvidYrZOWdgVxXqnm8wk7kDH_dsvIVqSF32Jy4G55fBVk2sEtlLNenuRlrUQ0cWbTP7K_02FxqlbtJrhZ5vk0X02JF0TNm4uNmQ2JDt_4eiDi9gsiF5OwPo0p2tO2EW7GszfSLy7Wj6RpMpJp-XIJSKr51lCOlNgfCUdF6kGDBfjnRUp_BTwAqtjaPFVar_0mAly_aP9rzzearoliWtuygPo-0wSZdsXJUU5Tzltf6tnzm/p.gif)

---

### 5. Update Task & Project
**Description:** Tasks and project details can be updated by authorized users.  
**GIF:**  
![Image](https://github.com/user-attachments/assets/dc9d12cd-758b-4801-89cd-7353f9d96312)

---

# 🛠️ Local Setup Guide

## ✅ Prerequisites

- 🔗 **Node.js** 18.0.0 or later  
- 📦 **npm** or **yarn** package manager  
- 🐘 **PostgreSQL** database (local or remote)  
- 🗝️ **Supabase** account (for authentication)  

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?connection_limit=1&pool_timeout=10"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Running Migrations

1. 📥 Install dependencie
```
npm install
```
2. 🔄 Run migrations
```
npx prisma migrate dev --name init
```
3. ⚡ Generate Prisma Client
```
npx prisma generate
```
4. 🖥️ Run App in Local Environment
```
npn run dev
```
# Feature Mapping

## Authentication & User Management

| Feature | Implementation Status | Files | Notes |
|---------|----------------------|-------|-------|
| User Registration | ✅ Implemented | [AuthContext.tsx](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/contexts/AuthContext.tsx:0:0-0:0), `SignUpForm.tsx` | Email/password signup with profile creation |
| User Login | ✅ Implemented | [AuthContext.tsx](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/contexts/AuthContext.tsx:0:0-0:0), `SignInForm.tsx` | Email/password authentication |
| Profile Management | ✅ Implemented | [ProfileContext.tsx](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/contexts/ProfileContext.tsx:0:0-0:0) | Automatic profile creation on signup |
| Session Management | ✅ Implemented | [AuthContext.tsx](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/contexts/AuthContext.tsx:0:0-0:0) | Persistent sessions with JWT |

## Project Management

| Feature | Implementation Status | Files | Notes |
|---------|----------------------|-------|-------|
| Create Project | ✅ Implemented | `ProjectContext.tsx`, `ProjectModal.tsx` | Create new projects with name and description |
| Edit Project | ✅ Implemented | `ProjectContext.tsx`, `ProjectModal.tsx` | Update project details |
| Delete Project | ✅ Implemented | `ProjectContext.tsx`, [Projects.tsx](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/components/Projects.tsx:0:0-0:0) | Delete projects with confirmation |
| List Projects | ✅ Implemented | [Projects.tsx](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/components/Projects.tsx:0:0-0:0) | View all projects with status and task counts |
| Project Status | ✅ Implemented | [Projects.tsx](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/components/Projects.tsx:0:0-0:0), [database.ts](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/types/database.ts:0:0-0:0) | Track project status (active/completed/archived) |

## Task Management

| Feature | Implementation Status | Files | Notes |
|---------|----------------------|-------|-------|
| Create Task | ✅ Implemented | `TaskContext.tsx`, `TaskModal.tsx` | Create tasks with title, description, due date |
| Edit Task | ✅ Implemented | `TaskContext.tsx`, `TaskModal.tsx` | Update task details |
| Delete Task | ✅ Implemented | `TaskContext.tsx`, `Tasks.tsx` | Delete tasks with confirmation |
| Task Status | ✅ Implemented | `Tasks.tsx`, [database.ts](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/types/database.ts:0:0-0:0) | Track task status (todo/in_progress/done) |
| Task Priority | ✅ Implemented | `Tasks.tsx`, [database.ts](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/types/database.ts:0:0-0:0) | Set task priority (low/medium/high) |
| Task Assignment | ✅ Implemented | `Tasks.tsx`, `TaskModal.tsx` | Assign tasks to team members |
| Task Filtering | ✅ Implemented | `Tasks.tsx` | Filter tasks by status and priority |
| Task Sorting | ✅ Implemented | `Tasks.tsx` | Sort tasks by due date, priority, status |

## Team Collaboration

| Feature | Implementation Status | Files | Notes |
|---------|----------------------|-------|-------|
| Project Members | ✅ Implemented | `ProjectMember` model, [database.ts](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/types/database.ts:0:0-0:0) | Track project team members |
| Member Roles | ✅ Implemented | `ProjectMember` model | Role-based access control (owner/admin/member) |
| Assign Tasks | ✅ Implemented | `TaskModal.tsx`, `Tasks.tsx` | Assign tasks to team members |

## UI/UX

| Feature | Implementation Status | Files | Notes |
|---------|----------------------|-------|-------|
| Task Board View | ✅ Implemented | `Tasks.tsx` | Visual task board with drag-and-drop |
| Loading States | ✅ Implemented | All components | Loading indicators during async operations |
| Error Handling | ✅ Implemented | All components | User-friendly error messages |
| Confirmation Dialogs | ✅ Implemented | `DeleteConfirmationModal.tsx` | Prevent accidental deletions |

## Data Management

| Feature | Implementation Status | Files | Notes |
|---------|----------------------|-------|-------|
| Database Schema | ✅ Implemented | [prisma/schema.prisma](cci:7://file:///Users/richmondramil/Desktop/task-manager/prisma/schema.prisma:0:0-0:0) | Well-structured database schema |
| Data Validation | ✅ Implemented | All contexts | Type-safe data handling |

## Security

| Feature | Implementation Status | Files | Notes |
|---------|----------------------|-------|-------|
| Authentication | ✅ Implemented | [AuthContext.tsx](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/contexts/AuthContext.tsx:0:0-0:0) | Secure user authentication |
| Authorization | ✅ Implemented | RLS Policies, [database.ts](cci:7://file:///Users/richmondramil/Desktop/task-manager/src/lib/types/database.ts:0:0-0:0) | Row-level security |

## Performance

| Feature | Implementation Status | Files | Notes |
|---------|----------------------|-------|-------|
| Code Splitting | ✅ Implemented | `_app.tsx` | Optimized bundle sizes |
| Image Optimization | ✅ Implemented | `next.config.js` | Next.js image optimization |

## Future Enhancements

| Feature | Priority | Notes |
|---------|----------|-------|
| Real-time Collaboration | High | Add real-time updates for team collaboration |
| File Attachments | Medium | Allow file uploads for tasks |
| Comments & Activity Log | Medium | Task comments and activity history |
| Calendar View | Low | Alternative task visualization |
| Reporting | Low | Generate project reports |
| Email Notifications | Medium | Task assignment and due date reminders |

# 🔐 Access Control Model

## 👤 Profile Management
| Action | Permission |
|--------|------------|
| ✏️ Manage own profile | ✅ Allowed (insert/update) |
| 👀 View all profiles (when authenticated) | ✅ Allowed |
| 🌍 Public view of own profile | ✅ Allowed |

---

## 🗂️ Project Ownership & Collaboration
| Action | Permission |
|--------|------------|
| 🛠️ Project owners manage their projects | ✅ Full Control |
| 👥 Invite team members to projects | ✅ Allowed |
| 🔎 View projects (owned or member) | ✅ Allowed |
| 👤 Manage team membership (owners only) | ✅ Allowed |

---

## ✅ Task Management
| Action | Permission |
|--------|------------|
| ➕ Create tasks in owned/joined projects | ✅ Allowed |
| 📝 Create personal tasks (no project) | ✅ Allowed |
| 👀 View tasks in accessible projects | ✅ Allowed |
| 🎯 View tasks assigned to them | ✅ Allowed |
| ✍️ View tasks created by them | ✅ Allowed |
| 🗑️ Delete tasks they created | ✅ Allowed |

# List of AI Tools Used

## AI Products and MCPs

- **Claude Code** – Used for code assistance and debugging  
- **Windsurf** – Utilized as an AI-powered IDE for rapid prototyping and development  
- **NotebookLM** – Leveraged for structured research, documentation, and knowledge management  
