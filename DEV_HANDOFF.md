# Student Monitoring System - Development Handoff

> **Date**: 2026-02-21
> **Latest Status**: Phase 5b Complete (PostgreSQL migration + bug fixes)

## 1. Project State Overview

The **Student Monitoring System** is production-stable. Database has been migrated from Supabase to the University's own PostgreSQL server for dramatically better performance.

- **Core System**: Full dashboard, student/course lists, risk analytics ✅
- **Reports**: PDF per student, Faculty report, Attendance export ✅
- **LIFF**: LINE integration (register, view attendance, re-link) ✅
- **Advisor Dashboard**: Filter by advisor, export advisor reports ✅
- **Faculty Report**: Faculty-level analytics and export ✅
- **Attendance Report**: Session-by-session trend charts, exportable ✅
- **Database**: Migrated to University PostgreSQL (`pg` direct connection) ✅
- **Deployment**: PM2 + Nginx on university server, `nbumon.northbkk.ac.th`, port 3001 ✅

## 2. Features Completed

### Phase 1-2: Core System

- [x] CSV data import → PostgreSQL
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

### Phase 5: Reports & Advisor

- [x] **Advisor Dashboard** (`/dashboard/advisor`) — filter by advisor, student list, stats
- [x] **Faculty Report** (`/dashboard/faculty-report`) — faculty-level analytics
- [x] **Attendance Report Export** (`/dashboard/attendance-report`) — session trend charts, exportable
- [x] **PDF Reports** (`/dashboard/reports`) — PDF per student with Sarabun font
- [x] **User Manual** (`/dashboard/manual`) — updated with latest features
- [x] **Trend column** on course_analytics (up/down/stable)

### Phase 5b: PostgreSQL Migration & Performance

- [x] `lib/db.ts` — PostgreSQL Pool (pg) with type parsers (NUMERIC/DECIMAL → JS number)
- [x] All 12 API routes rewritten to use direct SQL via `query()`
- [x] `scripts/setup-db-functions.sql` — DB functions for trailing absence calculation
- [x] `trailing_absences` column pre-computed on import (fast index scan)
- [x] `scripts/import-csv.ts` rewritten with `unnest()` bulk insert (fast)
- [x] **Bug fix**: `pg` returns NUMERIC as string → all `.toFixed()` calls wrapped with `Number()`
- [x] **Bug fix**: attendance-report API returns camelCase fields to match frontend interfaces
- [x] Performance: `/api/stats` ~50ms (was ~6s with Supabase)

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
| `/dashboard/attendance-report` | Session-by-session trend charts + export |
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
| `/api/attendance-report` | GET | Attendance overview (limit, offset, faculty, countP, countL, countS) |
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

## 5. Critical Bug Fixes Applied

### pg NUMERIC type returns as string (2026-02-21)

`pg` library returns PostgreSQL DECIMAL/NUMERIC columns as JavaScript strings by default. Calling `.toFixed()` on a string throws `TypeError: e.gpa.toFixed is not a function`.

**Fix applied in two layers:**

1. `lib/db.ts` — `types.setTypeParser()` for OID 1700 (NUMERIC), 701 (FLOAT8), 700 (FLOAT4) → `parseFloat()`
2. All frontend pages — wrapped every `.toFixed()` on DB-sourced fields with `Number(val).toFixed(n)` (defensive)

Files modified: `students/page.tsx`, `advisor/page.tsx`, `faculty-report/page.tsx`, `consecutive-absence/page.tsx`, `reports/page.tsx`, `courses/page.tsx`, `liff/attendance/page.tsx` (27 replacements total).

### attendance-report NaN% bug (2026-02-21)

API returned raw PostgreSQL snake_case rows (`avg_rate`, `course_count`, etc.) but frontend interface expected camelCase (`avgRate`, `courseCount`, etc.). Accessing undefined fields caused `NaN%` in the average attendance card.

**Fix**: Map `overviewRes.rows` to camelCase in `app/api/attendance-report/route.ts`.

## 6. Key Documentation

- **`PROJECT_STATUS.md`**: Detailed system architecture, schema, API reference (main source of truth)
- **`UNIVERSITY_DEPLOYMENT.md`**: คู่มือติดตั้งบน University Server (PM2, Nginx, PostgreSQL)
- **`DATA_SPECIFICATION.md`**: CSV column definitions and data format

## 7. Technical Reminders

- **PostgreSQL direct**: Uses `lib/db.ts` Pool. `lib/supabase.ts` / `lib/db-utils.ts` kept for reference, not used.
- **pg type parsers**: OID 1700/701/700 → parseFloat. Always use `Number(val)` before `.toFixed()` on DB values.
- **Data Sync**: No auto-sync — import manually via `npm run import:csv -- file.csv`
- **trailing_absences**: Pre-computed stored column in `student_analytics`. Updated on each CSV import. Enables fast `WHERE trailing_absences >= N` index scan.
- **LIFF Re-linking**: Student changes code → DELETE old mapping → redirect to register form
- **Pagination**: Window function `COUNT(*) OVER()::int` in SQL; frontend is page-based
- **class_check_raw Format**: `"P,A,P,L,S,P,A"` comma-separated uppercase letters
- **No Authentication**: Dashboard is open-access; LIFF uses LINE profile as mobile identity
- **Font**: Sarabun Thai font embedded as base64 in `lib/sarabun-font.ts` for PDF generation
- **autoTable import**: Use `import autoTable from 'jspdf-autotable'` then `autoTable(doc, {...})` — NOT `doc.autoTable()`
- **Recharts types**: Use `any` type for Tooltip formatter to avoid TS errors
- **API snake_case → camelCase**: SQL returns snake_case; map to camelCase in API route before `NextResponse.json()`
- **Port**: App runs on **3001** (port 3000 used by `award-reg` app on same server)

## 8. Environment Variables

```env
DATABASE_URL=postgresql://student_app:your_secure_password@localhost:5432/student_monitoring
DATABASE_SSL=false
NEXT_PUBLIC_LIFF_ID=2009129078-N9OyKHXq
```

Set in `.env.local` on the server.

## 9. Deployment

- **GitHub**: [Akkadate/studentcare](https://github.com/Akkadate/studentcare) (branch: `main`)
- **Production**: [nbumon.northbkk.ac.th](https://nbumon.northbkk.ac.th) (University Server, port 3001)
- **LIFF**: [liff.line.me/2009129078-N9OyKHXq](https://liff.line.me/2009129078-N9OyKHXq)

Update & redeploy:

```bash
cd /var/www/nbumon
git pull origin main
npm install
npm run build
pm2 restart nbumon
```
