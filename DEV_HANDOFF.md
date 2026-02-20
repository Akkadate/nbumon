# Student Monitoring System - Development Handoff

> **Date**: 2026-02-20
> **Latest Status**: Phase 5 In Progress (Advisor Dashboard, Faculty/Attendance Reports)

## 1. Project State Overview

The **Student Monitoring System** is currently stable with **Phase 4 fully completed** and **Phase 5 partially completed**.

- **Core System**: Full dashboard, student/course lists, risk analytics ✅
- **Reports**: PDF per student, Faculty report, Attendance export ✅
- **LIFF**: LINE integration (register, view attendance, re-link) ✅
- **Advisor Dashboard**: Filter by advisor, export advisor reports ✅
- **Faculty Report**: Faculty-level analytics and export ✅
- **Attendance Report**: Exportable attendance data table ✅
- **Deployment**: Vercel + custom domain `nbucare.northbkk.ac.th` ✅

## 2. Features Completed

### Phase 1-2: Core System

- [x] CSV data import → Supabase
- [x] Attendance parsing (P=Present, A=Absent, L=Late, S=Leave)
- [x] Risk level calculation (4 tiers)
- [x] Dashboard with stats cards
- [x] Student list with filters + search
- [x] Course list
- [x] Charts (Recharts: Pie, Bar, Histogram, Line)

### Phase 3: Enhanced Data

- [x] Student metadata: name, faculty, department, year_level, advisor
- [x] Course metadata: course_name, instructor, semester
- [x] GPA, course_grade columns
- [x] Thai font support (Sarabun base64)

### Phase 4: Advanced Features

- [x] Student popup → show ALL courses (not just ≥20%)
- [x] Color-coded risk badges per course in popup
- [x] Attendance dots (P/A/L/S) per course in popup
- [x] Excel/CSV export with Thai charset (UTF-8 BOM)
- [x] Consecutive absence detection (≥3 trailing)
- [x] Consecutive absence count on dashboard
- [x] Server-side pagination (50/page)
- [x] Debounced server-side search
- [x] LINE LIFF integration (register, view attendance, re-link)

### Phase 5: Reports & Advisor (Partially Complete)

- [x] **Advisor Dashboard** (`/dashboard/advisor`) — filter by advisor, student list, stats
- [x] **Faculty Report** (`/dashboard/faculty-report`) — faculty-level analytics
- [x] **Attendance Report Export** (`/dashboard/attendance-report`) — exportable table
- [x] **PDF Reports** (`/dashboard/reports`) — PDF per student with Sarabun font
- [x] **User Manual** (`/dashboard/manual`) — updated with latest features
- [x] **Trend column** on course_analytics (stable/improving/declining)

## 3. Pages & API Routes (Current)

### Dashboard Pages

| Route | Description |
| --- | --- |
| `/dashboard` | Main dashboard: stats cards, risk breakdown, faculty list |
| `/dashboard/students` | Student list: pagination, search, filters, popup |
| `/dashboard/courses` | Course list with analytics |
| `/dashboard/charts` | Recharts visualizations |
| `/dashboard/consecutive-absence` | Students with ≥3 trailing absences |
| `/dashboard/reports` | PDF report generation |
| `/dashboard/advisor` | Advisor dashboard (filter by advisor) |
| `/dashboard/attendance-report` | Attendance data export |
| `/dashboard/faculty-report` | Faculty-specific reports |
| `/dashboard/manual` | User manual |

### LIFF Pages

| Route | Description |
| --- | --- |
| `/liff` | LIFF entry (init SDK → check → redirect) |
| `/liff/register` | Student code registration form |
| `/liff/attendance` | Attendance viewer (main LIFF page) |

### API Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/stats` | GET | Dashboard summary + consecutive absence count (supports `?advisor=`) |
| `/api/students` | GET | Paginated list (page, limit, riskLevel, faculty, yearLevel, advisor, search) |
| `/api/student-courses` | GET | All courses for one student (`?studentCode=xxx`) |
| `/api/courses` | GET | Course analytics list |
| `/api/charts` | GET | Chart data aggregation |
| `/api/consecutive-absence` | GET | Students with ≥N trailing absences (`?min=3`) |
| `/api/advisors` | GET | Advisor list with stats |
| `/api/attendance-report` | GET | Attendance export data |
| `/api/faculty-report` | GET | Faculty analytics |
| `/api/liff/register` | POST | Link LINE UUID ↔ student_code |
| `/api/liff/profile` | GET | Student profile by LINE UUID (`?lineUserId=xxx`) |
| `/api/liff/unlink` | POST | Remove LINE mapping |

## 4. Pending / Next Steps (Phase 6+)

- [ ] **LINE Push Notifications** — alert students when absence exceeds threshold (requires LINE Messaging API + Bot Channel)
- [ ] **Batch LINE Notifications** — send LINE to all at-risk students at once
- [ ] **Academic Year/Semester Filter** — global filter across all dashboard pages
- [ ] **Historical Trend Comparison** — Line chart comparing multiple semesters
- [ ] **Authentication/Login System** — protect dashboard (currently open-access)
- [ ] **Custom Favicon** — replace default Next.js icon

## 5. Critical Fix: Supabase 1000-Row Limit (2026-02-20)

Supabase (PostgREST) returns at most **1000 rows per request** by default. With `attendance_records` at 15,910+ rows and `student_analytics` at 3,000+ rows, several API routes were returning incomplete data.

**Root cause**: Queries without `.range()` silently truncate at 1000 rows.

**Fix**: Added `lib/db-utils.ts` with `fetchAllRows()` helper that paginates through all results automatically.

### Routes fixed

| Route | Table affected | Impact before fix |
| --- | --- | --- |
| `/api/stats` | `attendance_records` | Consecutive absence count incorrect |
| `/api/consecutive-absence` | `attendance_records` | Missing 93%+ of student data |
| `/api/charts` | `student_analytics` | Charts missing students beyond 1000 |
| `/api/advisors` | `student_analytics` | Some advisors missing from dropdown |
| `/api/faculty-report` | `student_analytics` + `attendance_records` | Missing students + course data |
| `/api/attendance-report` | `attendance_records` (inner query) | Session data incomplete per course |

### fetchAllRows usage pattern

```typescript
import { fetchAllRows } from '@/lib/db-utils';

const data = await fetchAllRows<MyType>(
  (from, to) =>
    supabase
      .from('attendance_records')
      .select('col1, col2')
      .eq('faculty', 'X')
      .range(from, to)
);
```

The factory function is called once per 1000-row page. All filters and ordering must be inside the factory.

## 6. Key Documentation

- **`PROJECT_STATUS.md`**: Detailed system architecture, schema, API reference (main source of truth)
- **`DATA_SPECIFICATION.md`**: CSV column definitions and data format
- **`VERCEL_DEPLOYMENT.md`**: Step-by-step production deployment guide
- **`PHASE3_DEVELOPMENT_PLAN.md`**: Original Phase 3 planning document (for reference)

## 6. Technical Reminders

- **Supabase**: Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` with RLS allowing public reads. Update RLS if adding authentication.
- **Data Sync**: No auto-sync — import manually via `npm run import:csv` (script: `scripts/import-csv.ts`)
- **LIFF Re-linking**: Student changes code → DELETE old mapping → redirect to register form
- **Pagination**: Server-side page-based (not cursor), uses `{ count: 'exact' }` in Supabase select
- **class_check_raw Format**: `"P,A,P,L,S,P,A"` comma-separated uppercase letters
- **Consecutive Absence**: Counted from trailing entries of `class_check_raw` (count A backwards until non-A)
- **No Authentication**: Dashboard is open-access; LIFF uses LINE profile as mobile identity
- **Font**: Sarabun Thai font embedded as base64 in `lib/sarabun-font.ts` for PDF generation
- **autoTable import**: Use `import autoTable from 'jspdf-autotable'` then `autoTable(doc, {...})` — NOT `doc.autoTable()`
- **Recharts types**: Use `any` type for Tooltip formatter to avoid TS errors

## 7. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://vblqkkrifonxvxsbcfcv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_LIFF_ID=2009129078-N9OyKHXq
```

Set in `.env.local` (local) and Vercel Dashboard (production).

## 8. Deployment

- **GitHub**: [Akkadate/studentcare](https://github.com/Akkadate/studentcare) (branch: `main`)
- **Production**: [nbucare.northbkk.ac.th](https://nbucare.northbkk.ac.th) (Vercel, auto-deploy on push)
- **LIFF**: [liff.line.me/2009129078-N9OyKHXq](https://liff.line.me/2009129078-N9OyKHXq)
