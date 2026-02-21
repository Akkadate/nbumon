# NBU Student Monitoring — ระบบดูแลการเรียนของนักศึกษา

> **URL**: [nbumon.northbkk.ac.th](http://nbumon.northbkk.ac.th)
> **GitHub**: [Akkadate/studentcare](https://github.com/Akkadate/studentcare) (branch: `main`)
> **LIFF**: [liff.line.me/2009129078-N9OyKHXq](https://liff.line.me/2009129078-N9OyKHXq)

ระบบตรวจสอบและวิเคราะห์การเข้าเรียนของนักศึกษา มหาวิทยาลัยนอร์ทกรุงเทพ สร้างด้วย **Next.js 15** + **PostgreSQL** (direct connection)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (University Server — direct `pg` connection) |
| Hosting | University Server (PM2 + Nginx) — port 3001 |
| LINE Integration | LIFF SDK `@line/liff` |
| Charts | Recharts |
| PDF Export | jsPDF + jspdf-autotable |
| Icons | lucide-react |
| Thai Font | Sarabun (base64 embedded for PDF) |

---

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js 18+
- PostgreSQL (local หรือ remote)

### 2. Clone & Install

```bash
git clone https://github.com/Akkadate/studentcare.git
cd studentcare
npm install
```

### 3. Environment Variables

สร้างไฟล์ `.env.local`:

```env
DATABASE_URL=postgresql://student_app:your_password@localhost:5432/student_monitoring
DATABASE_SSL=false
NEXT_PUBLIC_LIFF_ID=2009129078-N9OyKHXq
```

### 4. Setup Database

```bash
# สร้างตารางและ indexes
psql -U student_app -d student_monitoring -f scripts/schema.sql
psql -U student_app -d student_monitoring -f scripts/setup-db-functions.sql
```

### 5. Import Data

```bash
# นำเข้าข้อมูลจาก CSV
npm run import:csv -- studentcheckv2.csv
```

### 6. Run Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

## Features

### Dashboard Pages

| หน้า | คำอธิบาย |
| --- | --- |
| `/dashboard` | Main dashboard — stats cards, risk breakdown |
| `/dashboard/students` | รายชื่อนักศึกษา — pagination, search, filter, popup รายวิชา |
| `/dashboard/courses` | รายวิชา — analytics, filter |
| `/dashboard/charts` | กราฟ Recharts (Pie, Bar, Histogram, Line) |
| `/dashboard/consecutive-absence` | นักศึกษาขาดเรียนติดต่อกัน ≥3 ครั้ง |
| `/dashboard/advisor` | Advisor Dashboard — filter by advisor |
| `/dashboard/faculty-report` | รายงานแยกตามคณะ → อาจารย์ที่ปรึกษา |
| `/dashboard/attendance-report` | Export ข้อมูลการเช็คชื่อ |
| `/dashboard/reports` | สร้าง PDF รายงาน |
| `/dashboard/manual` | คู่มือการใช้งาน |

### LINE LIFF

- นักศึกษาผูก LINE ID ↔ รหัสนักศึกษา
- ดูข้อมูลการเข้าเรียนผ่าน LINE (attendance dots, % ขาด, GPA)
- เปลี่ยนรหัสนักศึกษาได้

### Risk Levels

| Level | Thai | เกณฑ์ |
| --- | --- | --- |
| `critical` | วิกฤต | ขาดเฉลี่ย ≥ 40% |
| `monitor` | เฝ้าระวัง | ขาดเฉลี่ย 20–39% |
| `follow_up` | ติดตาม | ขาดเฉลี่ย 10–19% |
| `normal` | ปกติ | ขาดเฉลี่ย < 10% |

---

## Deployment (University Server)

ดูรายละเอียดใน [UNIVERSITY_DEPLOYMENT.md](UNIVERSITY_DEPLOYMENT.md)

```bash
# Update & Redeploy
cd /var/www/nbumon
git pull origin main
npm run build
pm2 restart nbumon
```

---

## Scripts

| คำสั่ง | คำอธิบาย |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build production |
| `npm run start` | Start production server |
| `npm run import:csv -- [file]` | Import CSV data into PostgreSQL |

---

## Documentation

| ไฟล์ | คำอธิบาย |
| --- | --- |
| `PROJECT_STATUS.md` | Architecture, schema, API reference (main source of truth) |
| `UNIVERSITY_DEPLOYMENT.md` | คู่มือติดตั้งบน University Server |
| `DEV_HANDOFF.md` | Development handoff notes |
| `DATA_SPECIFICATION.md` | CSV column definitions |
