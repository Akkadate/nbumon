# NBU Student Monitoring — คู่มือติดตั้งบน University Server

> **ชื่อระบบ**: NBU Student Monitoring
> **URL**: `nbumon.northbkk.ac.th`
> ระบบใช้ **Next.js** + **PostgreSQL** (direct connection ผ่าน `pg`)
> ไม่ต้องใช้ Supabase อีกต่อไป

---

## สิ่งที่ต้องมีบน Server

| รายการ | เวอร์ชัน |
| --- | --- |
| Node.js | >= 18.x |
| PostgreSQL | >= 13.x (มีอยู่แล้ว) |
| PM2 | `npm install -g pm2` |
| Nginx | สำหรับ reverse proxy |
| Git | สำหรับดึงโค้ด |

---

## ขั้นตอนที่ 1: เตรียม PostgreSQL Database

```sql
-- รันใน psql หรือ pgAdmin
CREATE DATABASE student_monitoring;
CREATE USER student_app WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE student_monitoring TO student_app;
\c student_monitoring
GRANT ALL ON SCHEMA public TO student_app;
```

จากนั้นรัน schema และ functions:

```bash
# บน server (หรือ pgAdmin)
psql -U student_app -d student_monitoring -f scripts/schema.sql
psql -U student_app -d student_monitoring -f scripts/setup-db-functions.sql
```

---

## ขั้นตอนที่ 2: Copy ข้อมูลจาก Supabase (ถ้ามีข้อมูลเดิม)

```bash
# Export จาก Supabase (รันบนเครื่อง local ที่มี psql)
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  --table=attendance_records \
  --table=student_analytics \
  --table=course_analytics \
  --table=line_students \
  --data-only \
  -f supabase_export.sql

# Import ไป University PostgreSQL
psql -h localhost -U student_app -d student_monitoring -f supabase_export.sql
```

หรือใช้ script import CSV ใหม่โดยตรง:

```bash
# แก้ DATABASE_URL ใน .env.local ก่อน แล้ว:
npm run import:csv -- studentcheck.csv
```

---

## ขั้นตอนที่ 3: ติดตั้ง Node.js และ PM2

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ติดตั้ง PM2
sudo npm install -g pm2
```

---

## ขั้นตอนที่ 4: ดึงโค้ดและ Build

```bash
# Clone โค้ด
git clone https://github.com/Akkadate/studentcare.git /var/www/nbumon
cd /var/www/nbumon

# ติดตั้ง dependencies
npm install

# สร้าง .env.local
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://student_app:your_secure_password@localhost:5432/student_monitoring
DATABASE_SSL=false
NEXT_PUBLIC_LIFF_ID=2009129078-N9OyKHXq
EOF

# Build production
npm run build
```

---

## ขั้นตอนที่ 5: รันด้วย PM2

```bash
# Start app (port 3001 — port 3000 used by award-reg)
PORT=3001 pm2 start npm --name "nbumon" -- start

# ตั้งให้ start อัตโนมัติเมื่อ server reboot
pm2 startup
pm2 save

# ดูสถานะ
pm2 status
pm2 logs nbumon
```

---

## ขั้นตอนที่ 6: ตั้ง Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/nbumon
```

ใส่ config ต่อไปนี้:

```nginx
server {
    listen 80;
    server_name nbumon.northbkk.ac.th;

    # Redirect HTTP → HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name nbumon.northbkk.ac.th;

    # SSL Certificate (ใช้ cert มหาวิทยาลัย หรือ Let's Encrypt)
    ssl_certificate     /etc/ssl/certs/nbumon.crt;
    ssl_certificate_key /etc/ssl/private/nbumon.key;

    location / {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# เปิดใช้ site
sudo ln -s /etc/nginx/sites-available/nbumon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ขั้นตอนที่ 7: ตรวจสอบระบบ

```bash
# ทดสอบ API
curl http://localhost:3001/api/stats

# ดู logs
pm2 logs nbumon --lines 50

# ดู PostgreSQL connections
psql -U student_app -d student_monitoring -c "SELECT count(*) FROM attendance_records;"
```

---

## การอัปเดตโค้ด (Deploy ใหม่)

```bash
cd /var/www/nbumon
git pull origin main
npm install
npm run build
pm2 restart nbumon
```

สร้าง script `deploy.sh` เพื่อสะดวก:

```bash
#!/bin/bash
cd /var/www/nbumon
git pull origin main
npm install --production
npm run build
pm2 restart nbumon
echo "Deploy complete!"
```

```bash
chmod +x deploy.sh
# ใช้งาน: ./deploy.sh
```

---

## Environment Variables (.env.local)

| Variable | ค่า | หมายเหตุ |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/student_monitoring` | Connection string ไป University PostgreSQL |
| `DATABASE_SSL` | `false` | false สำหรับ LAN local, true ถ้าใช้ remote+SSL |
| `NEXT_PUBLIC_LIFF_ID` | `2009129078-N9OyKHXq` | LINE LIFF App ID (ไม่เปลี่ยน) |

---

## PostgreSQL Connection Pool Settings (lib/db.ts)

```typescript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 10,                   // max concurrent DB connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
```

ปรับ `max` ตามจำนวน user concurrent ที่คาดไว้

---

## ประสิทธิภาพที่คาดหวัง (เทียบ Supabase เดิม)

| API Route | Supabase เดิม | University PostgreSQL |
| --- | --- | --- |
| `/api/stats` | ~6 วินาที (20 HTTP calls) | **< 50ms** (3 SQL queries parallel) |
| `/api/faculty-report` | ~10 วินาที (33+ calls) | **< 80ms** (2 SQL queries) |
| `/api/consecutive-absence` | ~5 วินาที (16 calls) | **< 50ms** (1 SQL query + DB function) |
| `/api/charts` | ~1 วินาที (4 calls) | **< 30ms** (8 SQL queries parallel) |
| `/api/students` | ~0.3 วินาที | **< 20ms** |

---

## Troubleshooting

### PM2 ไม่ start

```bash
pm2 logs nbumon
# ดู error แล้วแก้ไข .env.local
```

### PostgreSQL connection refused

```bash
# ตรวจสอบว่า PostgreSQL รันอยู่
sudo systemctl status postgresql

# ตรวจสอบ pg_hba.conf ให้อนุญาต local connection
sudo nano /etc/postgresql/*/main/pg_hba.conf
# เพิ่ม: local   student_monitoring   student_app   md5
sudo systemctl reload postgresql
```

### `count_trailing_absences` function not found

```bash
# รัน setup script ใหม่
psql -U student_app -d student_monitoring -f scripts/setup-db-functions.sql
```

### Port ถูกใช้งานอยู่

```bash
# ระบบนี้รันบน port 3001 (port 3000 ถูกใช้โดย award-reg)
PORT=3001 pm2 start npm --name "nbumon" -- start
# ตรวจสอบ Nginx proxy_pass ให้ตรงกับ port ที่ใช้
```

---

## สรุปไฟล์ที่เปลี่ยนแปลงจาก Supabase → PostgreSQL

| ไฟล์ | การเปลี่ยนแปลง |
| --- | --- |
| `lib/db.ts` | ใหม่ — PostgreSQL connection pool (`pg`) |
| `lib/supabase.ts` | เก็บไว้เพื่อ reference แต่ไม่ได้ใช้แล้ว |
| `lib/db-utils.ts` | เก็บไว้ reference ไม่ได้ใช้แล้ว (ไม่มี row limit) |
| `app/api/*/route.ts` (12 files) | เปลี่ยนจาก Supabase client → `query()` จาก `lib/db` |
| `scripts/setup-db-functions.sql` | ใหม่ — SQL functions สำหรับ PostgreSQL |
| `.env.local` | เปลี่ยน env vars ใช้ `DATABASE_URL` แทน |
