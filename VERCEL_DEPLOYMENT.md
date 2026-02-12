# Deploy Student Monitoring Dashboard to Vercel

คู่มือการ deploy โปรเจกต์ Next.js ไปยัง Vercel แบบละเอียด

## ข้อกำหนดเบื้องต้น

- ✅ บัญชี GitHub (มีโค้ดอยู่แล้ว)
- ✅ บัญชี Vercel (ฟรี) - สมัครได้ที่ https://vercel.com
- ✅ Supabase database ที่ตั้งค่าเรียบร้อยแล้ว

## ขั้นตอนการ Deploy

### Step 1: สมัครบัญชี Vercel

1. ไปที่ https://vercel.com
2. คลิก **"Sign Up"**
3. เลือก **"Continue with GitHub"**
4. อนุญาตให้ Vercel เข้าถึง GitHub account

### Step 2: Import โปรเจกต์

1. หลังจาก login แล้ว คลิก **"Add New..."** → **"Project"**
2. เลือก **"Import Git Repository"**
3. ค้นหา repository `studentcare`
4. คลิก **"Import"**

### Step 3: ตั้งค่า Environment Variables

**สำคัญมาก!** ต้องตั้งค่า environment variables ก่อน deploy:

1. ในหน้า Configure Project หา section **"Environment Variables"**
2. เพิ่ม variables ดังนี้:

```
ชื่อ: NEXT_PUBLIC_SUPABASE_URL
ค่า: https://vblqkkrifonxvxsbcfcv.supabase.co
```

```
ชื่อ: NEXT_PUBLIC_SUPABASE_ANON_KEY
ค่า: sb_publishable_LKerHxtgUgRlD9gd62gtpw_0gwHSdfS
```

> 💡 **Tip**: คุณสามารถ copy ค่าจากไฟล์ `.env.local` ในเครื่องของคุณ

3. เลือก Environment ให้ครบทั้ง 3:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### Step 4: Deploy!

1. Framework Preset จะถูกเลือกเป็น **"Next.js"** อัตโนมัติ
2. Build Command: `next build` (default)
3. Output Directory: `.next` (default)
4. Install Command: `npm install` (default)
5. คลิก **"Deploy"** 🚀

### Step 5: รอการ Build

- Vercel จะเริ่ม build โปรเจกต์ (ใช้เวลา 2-3 นาที)
- คุณจะเห็น build logs แบบ real-time
- เมื่อเสร็จสิ้น จะเห็นข้อความ **"Deployment Successful"**

### Step 6: ทดสอบเว็บไซต์

1. Vercel จะให้ URL แบบนี้: `https://studentcare.vercel.app`
2. คลิก **"Visit"** เพื่อเปิดเว็บไซต์
3. ทดสอบว่าทุกอย่างทำงานถูกต้อง

## การตรวจสอบหลังจาก Deploy

### ✅ Checklist

- [ ] หน้า Landing page แสดงผลถูกต้อง
- [ ] Dashboard แสดงข้อมูลจาก database ได้
- [ ] หน้า Students list ทำงานได้
- [ ] หน้า Courses list ทำงานได้
- [ ] Filters และ Search ทำงานปกติ
- [ ] ไม่มี error ใน console

### หากมีปัญหา

1. ตรวจสอบ Environment Variables:
   - ไปที่ **Project Settings** → **Environment Variables**
   - ตรวจสอบว่าค่าถูกต้อง

2. ดู Build Logs:
   - คลิกที่ deployment
   - เลือก tab **"Building"**
   - อ่าน error messages

3. ดู Runtime Logs:
   - ไปที่ **Deployments**
   - คลิกที่ deployment ล่าสุด
   - เลือก tab **"Functions"** เพื่อดู API logs

## Custom Domain (Optional)

หากต้องการใช้ domain ของคุณเอง:

1. ไปที่ **Project Settings** → **Domains**
2. คลิก **"Add"**
3. ใส่ domain ของคุณ (เช่น `studentcare.yourdomain.com`)
4. ทำตาม instructions เพื่อตั้งค่า DNS

## การอัปเดตเว็บไซต์

เมื่อคุณต้องการอัปเดตโค้ด:

1. แก้ไขโค้ดในเครื่อง
2. Commit และ Push ไป GitHub:
   ```bash
   git add .
   git commit -m "คำอธิบายการเปลี่ยนแปลง"
   git push origin main
   ```
3. Vercel จะ **auto-deploy** ให้อัตโนมัติ!

## Environment Variables สำหรับ Production

หากต้องการความปลอดภัยสูงสุด:

### สำหรับ Supabase

1. สร้าง Supabase API Key แยกสำหรับ Production
2. ตั้งค่า Row Level Security (RLS) policies
3. จำกัดสิทธิ์การเข้าถึงตาม role

### ตัวอย่าง RLS Policy สำหรับ Production

```sql
-- Allow read access to student_analytics
CREATE POLICY "Allow read access to student_analytics"
ON student_analytics FOR SELECT
USING (true);

-- Allow read access to course_analytics
CREATE POLICY "Allow read access to course_analytics"
ON course_analytics FOR SELECT
USING (true);

-- Restrict write access
CREATE POLICY "Restrict write access"
ON student_analytics FOR INSERT
USING (false);
```

## Performance Optimization

Vercel จะ optimize โปรเจกต์โดยอัตโนมัติ แต่คุณสามารถเพิ่มเติม:

### 1. Enable Edge Functions (Optional)

```typescript
// ใน app/api/*/route.ts เพิ่ม:
export const runtime = 'edge';
```

### 2. Caching

Vercel จะ cache static assets อัตโนมัติ

### 3. Image Optimization

หากมีรูปภาพ ใช้ Next.js Image component:
```tsx
import Image from 'next/image';
```

## Monitoring

### Analytics (Free)

1. ไปที่ **Analytics** tab
2. ดูข้อมูล:
   - Page views
   - Unique visitors
   - Top pages
   - Performance metrics

### Real User Monitoring

Vercel Speed Insights จะวัด:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

## Troubleshooting

### ปัญหาที่พบบ่อย

#### 1. Build Failed
```
Error: Environment variable not found
```
**แก้ไข**: ตรวจสอบว่าตั้งค่า Environment Variables ครบถ้วน

#### 2. API Routes ไม่ทำงาน
```
Error: Failed to fetch
```
**แก้ไข**: 
- ตรวจสอบ Environment Variables
- ตรวจสอบ Supabase connection

#### 3. Empty Data
```
Dashboard shows 0 students
```
**แก้ไข**: 
- ตรวจสอบว่า database มีข้อมูล
- รัน import script อีกครั้ง
- ตรวจสอบ Supabase URL และ Key

## คำแนะนำเพิ่มเติม

### 1. Preview Deployments

ทุกครั้งที่ push ไป branch อื่น (ไม่ใช่ main), Vercel จะสร้าง preview deployment:
- ทดสอบ features ใหม่ก่อน merge
- แชร์ link ให้ทีมดูก่อน production

### 2. Rollback

หากมีปัญหาหลัง deploy:
1. ไปที่ **Deployments**
2. เลือก deployment เวอร์ชันก่อนหน้า
3. คลิก **"Promote to Production"**

### 3. Environment Variables ต่อ Environment

คุณสามารถตั้งค่าต่างกันได้:
- **Production**: ใช้ database จริง
- **Preview**: ใช้ test database
- **Development**: ใช้ local database

## ค่าใช้จ่าย

**Vercel Free Tier** เหมาะสำหรับโปรเจกต์นี้:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Serverless Functions

**หากเกินขีดจำกัด** สามารถ upgrade เป็น Pro ($20/month)

## สรุป

หลังจาก deploy เสร็จแล้ว คุณจะได้:

✅ เว็บไซต์ที่เข้าถึงได้จากทุกที่
✅ HTTPS อัตโนมัติ
✅ Auto-deploy เมื่อ push code
✅ Global CDN สำหรับความเร็ว
✅ Analytics และ monitoring

**URL ตัวอย่าง**: https://studentcare.vercel.app

ขอให้ deploy สำเร็จครับ! 🚀
