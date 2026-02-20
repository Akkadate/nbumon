# Student Monitoring System — Project Status & Architecture

> **Last Updated**: 2026-02-20 (Phase 5 Partial Complete)
> **Repo**: [github.com/Akkadate/studentcare](https://github.com/Akkadate/studentcare) (branch: `main`)
> **Production**: [nbucare.northbkk.ac.th](https://nbucare.northbkk.ac.th) (Vercel, custom domain)
> **LIFF URL**: [liff.line.me/2009129078-N9OyKHXq](https://liff.line.me/2009129078-N9OyKHXq)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| LINE Integration | LIFF SDK `@line/liff` |
| Charts | Recharts |
| PDF Export | jsPDF + jspdf-autotable |
| Icons | lucide-react |
| Thai Font | Sarabun (base64 embedded) |

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://vblqkkrifonxvxsbcfcv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_LKerHxtgUgRlD9gd62gtpw_0gwHSdfS
NEXT_PUBLIC_LIFF_ID=2009129078-N9OyKHXq
```

> ⚠️ ตัวแปรเหล่านี้ต้องตั้งทั้งใน `.env.local` (local) และ Vercel Dashboard (production)

---

## Database Schema (Supabase)

### Table: `attendance_records`

ข้อมูลเช็คชื่อรายวิชาต่อนักศึกษา (1 row = 1 student + 1 course + 1 section)

| Column | Type | Description |
| --- | --- | --- |
| `id` | serial PK | |
| `course_code` | text | รหัสวิชา |
| `revision_code` | text | รหัส revision |
| `section` | text | กลุ่มเรียน |
| `study_code` | text | `C` = ทฤษฎี, `L` = ปฏิบัติ |
| `student_code` | text | รหัสนักศึกษา |
| `class_check_raw` | text | Comma-separated: `P,A,L,S,P,...` |
| `total_sessions` | int | จำนวนครั้งเข้าเรียนทั้งหมด |
| `present_count` | int | จำนวนมา |
| `absent_count` | int | จำนวนขาด |
| `late_count` | int | จำนวนสาย |
| `leave_count` | int | จำนวนลา |
| `no_check_count` | int | ไม่มีข้อมูล |
| `attendance_rate` | float | % เข้าเรียน |
| `absence_rate` | float | % ขาด |
| `student_name` | text | ชื่อ-สกุล |
| `faculty` | text | คณะ |
| `department` | text | สาขา |
| `year_level` | int | ชั้นปี |
| `advisor_name` | text | อาจารย์ที่ปรึกษา |
| `course_name` | text | ชื่อวิชา |
| `instructor` | text | ผู้สอน |
| `acad_year` | int | ปีการศึกษา |
| `semester` | int | เทอม |
| `gpa` | float | GPA |
| `course_grade` | text | เกรดในวิชา |

### Table: `student_analytics`

สรุปภาพรวมต่อนักศึกษา (1 row = 1 student)

| Column | Type | Description |
| --- | --- | --- |
| `id` | serial PK | |
| `student_code` | text (unique) | รหัสนักศึกษา |
| `total_courses` | int | จำนวนวิชาทั้งหมด |
| `total_sessions` | int | จำนวนครั้งทั้งหมด |
| `total_absences` | int | รวมขาดทุกวิชา |
| `total_late` | int | รวมสาย |
| `avg_attendance_rate` | float | % เข้าเรียนเฉลี่ย |
| `avg_absence_rate` | float | % ขาดเฉลี่ย |
| `risk_level` | text | `critical` / `monitor` / `follow_up` / `normal` |
| `courses_at_risk` | int | วิชาที่ขาดเรียน ≥20% |
| `student_name` | text | ชื่อ-สกุล |
| `faculty` | text | คณะ |
| `department` | text | สาขา |
| `year_level` | int | ชั้นปี |
| `advisor_name` | text | อาจารย์ที่ปรึกษา |
| `gpa` | float | GPA |

### Table: `course_analytics`

สรุปภาพรวมต่อวิชา (1 row = 1 course + section + study_code)

| Column | Type | Description |
| --- | --- | --- |
| `id` | serial PK | |
| `course_code` | text | รหัสวิชา |
| `revision_code` | text | |
| `section` | text | กลุ่ม |
| `study_code` | text | C/L |
| `total_students` | int | จำนวนนศ. ในกลุ่ม |
| `students_high_absence` | int | นศ. ขาด ≥20% |
| `avg_attendance_rate` | float | เข้าเรียนเฉลี่ย |
| `has_no_checks` | bool | วิชาที่ยังไม่เช็คชื่อ |
| `total_sessions` | int | |
| `course_name` | text | ชื่อวิชา |
| `instructor` | text | ผู้สอน |
| `faculty` | text | คณะ (สำหรับ filter) |
| `acad_year` | int | ปีการศึกษา |
| `semester` | int | เทอม |
| `trend` | text | `stable` / `improving` / `declining` |

### Table: `line_students`

Mapping LINE UUID ↔ รหัสนักศึกษา (LINE LIFF)

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid PK | Auto-generated |
| `line_user_id` | text (unique) | LINE UUID |
| `student_code` | text | รหัสนักศึกษา |
| `display_name` | text | ชื่อ LINE |
| `picture_url` | text | รูป LINE |
| `registered_at` | timestamptz | วันผูก |
| `updated_at` | timestamptz | วันเปลี่ยนรหัสล่าสุด |

---

## Risk Level Thresholds

| Level | Thai | Absence Rate |
| --- | --- | --- |
| `critical` | วิกฤต | ≥ 40% |
| `monitor` | เฝ้าระวัง | 20% – 39% |
| `follow_up` | ติดตาม | 10% – 19% |
| `normal` | ปกติ | < 10% |

## Attendance Status Codes

| Code | Thai | Color |
| --- | --- | --- |
| `P` | มาเรียน | Emerald |
| `A` | ขาด | Red |
| `L` | สาย | Amber |
| `S` | ลา | Blue |

---

## Project Structure

```text
student-monitoring/
├── app/
│   ├── page.tsx                         # Landing / splash page
│   ├── layout.tsx                       # Root layout (Sarabun font)
│   ├── globals.css                      # Tailwind CSS imports
│   │
│   ├── dashboard/
│   │   ├── page.tsx                     # Main dashboard (stats cards, quick nav)
│   │   ├── students/page.tsx            # Student list + pagination + popup + export
│   │   ├── courses/page.tsx             # Course list
│   │   ├── charts/page.tsx              # Recharts visualizations
│   │   ├── consecutive-absence/page.tsx # ≥3 consecutive absence detection
│   │   ├── reports/page.tsx             # PDF report generation
│   │   ├── advisor/page.tsx             # Advisor dashboard (filter by advisor)
│   │   ├── attendance-report/page.tsx   # Attendance data export
│   │   ├── faculty-report/page.tsx      # Faculty-specific reports
│   │   └── manual/page.tsx              # User manual
│   │
│   ├── liff/
│   │   ├── page.tsx                     # LIFF entry (init SDK → check → redirect)
│   │   ├── register/page.tsx            # Student code registration form
│   │   └── attendance/page.tsx          # Attendance viewer (main LIFF page)
│   │
│   └── api/
│       ├── stats/route.ts               # Dashboard statistics + consecutive absence count
│       ├── students/route.ts            # Students list (paginated, searchable, filterable)
│       ├── courses/route.ts             # Course list
│       ├── student-courses/route.ts     # All courses for a student (no filter)
│       ├── charts/route.ts              # Chart data aggregation
│       ├── consecutive-absence/route.ts # Consecutive absence detection
│       ├── advisors/route.ts            # Advisor list with stats
│       ├── attendance-report/route.ts   # Attendance export data
│       ├── faculty-report/route.ts      # Faculty analytics
│       └── liff/
│           ├── register/route.ts        # POST: link LINE UUID ↔ student_code
│           ├── profile/route.ts         # GET: student + courses by LINE UUID
│           └── unlink/route.ts          # POST: remove LINE mapping
│
├── lib/
│   ├── supabase.ts                      # Supabase client (anon key)
│   ├── types.ts                         # TypeScript interfaces
│   ├── analytics.ts                     # Risk calc, attendance parsing, Thai labels
│   ├── liff.ts                          # LIFF SDK wrapper (lazy init, getProfile)
│   └── sarabun-font.ts                  # Base64 font for PDF export
│
├── migrations/
│   ├── phase3-add-columns.sql           # Phase 3: add enhanced columns
│   ├── liff-line-students.sql           # Phase 4: LINE mapping table
│   ├── add_faculty_to_course_analytics.sql
│   └── add_trend_to_course_analytics.sql
│
├── scripts/                             # Data import/ETL scripts
│   ├── import-csv.ts                    # CSV import script
│   ├── recalculate-analytics.ts         # Recalculate analytics
│   └── schema.sql                       # Database schema definition
│
└── doc-reference/                       # Reference materials
```

---

## API Reference

### `GET /api/students`

Paginated student list with filters.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | int | 1 | Page number |
| `limit` | int | 50 | Records per page |
| `riskLevel` | string | all | `critical` / `monitor` / `follow_up` |
| `faculty` | string | all | Filter by faculty |
| `yearLevel` | string | all | Filter by year |
| `advisor` | string | all | Filter by advisor name |
| `search` | string | | Search student_code or student_name |

Response: `{ data, total, page, limit, totalPages }`

### `GET /api/student-courses?studentCode=xxx`

All courses for a student — no absence rate filter. Returns `class_check_raw` for dots.

### `GET /api/stats`

Dashboard summary statistics. Supports `?advisor=` param. Returns: `totalStudents`, `atRiskStudents`, `totalCourses`, `avgAttendance`, `consecutiveAbsence` (count of students with ≥3 trailing absences).

### `GET /api/consecutive-absence?min=3`

Students with ≥N trailing consecutive absences. Returns all attendance entries for dot display.

### `GET /api/charts`

Aggregated data for Recharts visualizations.

### `GET /api/courses`

Course analytics list.

### `GET /api/advisors`

Advisor list with student stats.

### `GET /api/attendance-report`

Attendance export data (all records, filterable).

### `GET /api/faculty-report`

Faculty-level analytics and student breakdown.

### LIFF APIs

- `POST /api/liff/register` — Body: `{ lineUserId, studentCode, displayName, pictureUrl }`
- `GET /api/liff/profile?lineUserId=xxx` — Returns `{ registered, student, courses, lineProfile }`
- `POST /api/liff/unlink` — Body: `{ lineUserId }`

---

## Features Completed

### Phase 1-2: Core System

- [x] CSV data import → Supabase
- [x] Attendance parsing (P,A,L,S)
- [x] Risk level calculation
- [x] Dashboard with stats cards
- [x] Student list with filters
- [x] Course list
- [x] Charts (Recharts)

### Phase 3: Enhanced Data

- [x] Student name, faculty, year, GPA, advisor
- [x] Course name, instructor
- [x] Thai font support (Sarabun)

### Phase 4: Advanced Features

- [x] Student popup → show ALL courses (not just ≥20%)
- [x] Color-coded risk badges per course in popup
- [x] Attendance dots (PALS) in popup per course
- [x] Excel/CSV export (Thai charset with BOM)
- [x] Consecutive absence detection (≥3 trailing)
- [x] Consecutive absence count on dashboard
- [x] Server-side pagination (50/page)
- [x] Debounced server-side search
- [x] LINE LIFF integration (register, view attendance, re-link)

### Phase 5: Reports & Advisor

- [x] Advisor dashboard (`/dashboard/advisor`) — filter by advisor, stats, export
- [x] Faculty report (`/dashboard/faculty-report`) — faculty-level analytics
- [x] Attendance report export (`/dashboard/attendance-report`) — exportable table
- [x] PDF report generation (`/dashboard/reports`) — per student with Sarabun font
- [x] User manual updated (`/dashboard/manual`) — all features documented
- [x] Trend column on course_analytics (stable/improving/declining)

### Not Yet Implemented (Phase 6+)

- [ ] LINE push notification (alert when absence ≥ threshold)
- [ ] Batch LINE notifications to at-risk students
- [ ] Academic year / semester global filter
- [ ] Historical trend comparison (cross-semester line chart)
- [ ] Authentication / login system
- [ ] Favicon customization

---

## Important Notes for Future Development

1. **Supabase uses anon key** — API ใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public), RLS policy แบบ allow all. ถ้าจะเพิ่ม authentication ต้องเปลี่ยน RLS
2. **Data import** — ข้อมูลนำเข้าจาก CSV ด้วย scripts ใน `scripts/` folder, ไม่มี auto-sync
3. **LIFF re-linking** — เมื่อ student กด "เปลี่ยนรหัส" ระบบจะ DELETE mapping แล้ว redirect ไปลงทะเบียนใหม่
4. **Pagination** — Students API ใช้ `{ count: 'exact' }` ใน Supabase select, frontend ใช้ page-based (ไม่ใช่ cursor)
5. **class_check_raw** format — `"P,A,P,L,S,P,A"` comma-separated uppercase letters
6. **Consecutive absence** — วิเคราะห์จาก trailing entries ของ `class_check_raw` (นับ A ต่อเนื่องจากท้ายสุด)
7. **No authentication** — ระบบไม่มี login, ใครก็เข้า dashboard ได้ (LIFF ใช้ LINE profile เป็น identity)
8. **autoTable import** — ต้องใช้ `import autoTable from 'jspdf-autotable'` แล้วเรียก `autoTable(doc, {...})` ห้ามใช้ `doc.autoTable()`
9. **Recharts types** — ใช้ `any` type สำหรับ Tooltip formatter เพื่อหลีกเลี่ยง TS errors
