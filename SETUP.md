# Student Monitoring System - Setup Guide

## Prerequisites
- Node.js installed
- Supabase account
- CSV file with attendance data

## Setup Steps

### 1. Supabase Database Setup

1. Go to your Supabase project: https://vblqkkrifonxvxsbcfcv.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/schema.sql`
4. Click **Run** to create all tables

### 2. Import CSV Data

Run the import script:

```powershell
cd d:\coding\Antigavity\AgentManager\student-monitoring
powershell -ExecutionPolicy Bypass -Command "npm run import:csv"
```

This will:
- Clear existing data
- Import all attendance records from CSV
- Generate student analytics
- Generate course analytics

### 3. Run Development Server

```powershell
powershell -ExecutionPolicy Bypass -Command "npm run dev"
```

Open your browser and go to: http://localhost:3000

## Features

### Dashboard
- Summary statistics
- Student risk levels (วิฤต, เฝ้าระวัง, ติดตาม)
- Course statistics
- Quick navigation

### Students Page
- Filter by risk level
- Search by student code
- View attendance rates
- Identify at-risk students

### Courses Page
- Filter by status (no checks, high absence)
- Search by course code
- View student counts
- Track course performance

## Troubleshooting

### npm commands not working
Use PowerShell with bypass:
```powershell
powershell -ExecutionPolicy Bypass -Command "npm run <command>"
```

### Supabase connection issues
Check `.env.local` file has correct values:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

### Import script errors
Make sure:
1. CSV file is in correct location
2. Supabase tables are created
3. Database is accessible
