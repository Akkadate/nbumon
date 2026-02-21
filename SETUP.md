# Student Monitoring System - Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ (University Server หรือ local)
- CSV file with attendance data

## Setup Steps

### 1. PostgreSQL Database Setup

```sql
-- รันใน psql หรือ pgAdmin
CREATE DATABASE student_monitoring;
CREATE USER student_app WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE student_monitoring TO student_app;
\c student_monitoring
GRANT ALL ON SCHEMA public TO student_app;
```

จากนั้นสร้าง schema และ DB functions:

```bash
psql -U student_app -d student_monitoring -f scripts/schema.sql
psql -U student_app -d student_monitoring -f scripts/setup-db-functions.sql
```

### 2. Environment Variables

สร้างไฟล์ `.env.local`:

```env
DATABASE_URL=postgresql://student_app:your_secure_password@localhost:5432/student_monitoring
DATABASE_SSL=false
NEXT_PUBLIC_LIFF_ID=2009129078-N9OyKHXq
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Import CSV Data

```bash
npm run import:csv -- studentcheck.csv
```

สิ่งที่ script ทำ:

- ล้างข้อมูลเดิม
- Import attendance records จาก CSV (bulk insert ด้วย unnest)
- คำนวณ student_analytics (risk level, trailing_absences)
- คำนวณ course_analytics (trend, avg_attendance_rate)

### 5. Run Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

## Scripts

| คำสั่ง | คำอธิบาย |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build production |
| `npm run start` | Start production server |
| `npm run import:csv -- [file]` | Import CSV data into PostgreSQL |

---

## Features

### Dashboard Pages

| หน้า | คำอธิบาย |
| --- | --- |
| `/dashboard` | Main dashboard — stats cards, risk breakdown |
| `/dashboard/students` | รายชื่อนักศึกษา — pagination, search, filter, popup |
| `/dashboard/courses` | รายวิชา — analytics, filter |
| `/dashboard/charts` | กราฟ Recharts |
| `/dashboard/consecutive-absence` | นักศึกษาขาดเรียนติดต่อกัน ≥3 ครั้ง |
| `/dashboard/advisor` | Advisor Dashboard — filter by advisor |
| `/dashboard/faculty-report` | รายงานแยกตามคณะ |
| `/dashboard/attendance-report` | Session-by-session trend + export |
| `/dashboard/reports` | สร้าง PDF รายงาน |
| `/dashboard/manual` | คู่มือการใช้งาน |

---

## Troubleshooting

### PostgreSQL connection refused

```bash
# ตรวจสอบว่า PostgreSQL รันอยู่
sudo systemctl status postgresql

# ตรวจสอบ pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf
# เพิ่ม: local   student_monitoring   student_app   md5
sudo systemctl reload postgresql
```

### `count_trailing_absences` function not found

```bash
psql -U student_app -d student_monitoring -f scripts/setup-db-functions.sql
```

### npm commands not working (Windows)

```powershell
powershell -ExecutionPolicy Bypass -Command "npm run <command>"
```

### Import script errors

ตรวจสอบ:

1. `.env.local` มีค่า `DATABASE_URL` ถูกต้อง
2. PostgreSQL tables ถูกสร้างแล้ว (รัน schema.sql)
3. Database accessible (ทดสอบด้วย `psql -U student_app -d student_monitoring`)
