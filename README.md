# نظام محاسبة كروت الإنترنت

نظام محاسبة حقيقي بنظام قيود مزدوجة (مدين/دائن)، بموافقة ثلاثية للشركاء على أي تعديل أو حذف، مبني بـ Next.js + TypeScript + PostgreSQL + Drizzle ORM + Tailwind CSS.

## النشر على Vercel

### 1) قاعدة البيانات
أنشئ قاعدة بيانات PostgreSQL مجانية متوافقة مع Vercel (مثل Neon أو Vercel Postgres أو Supabase) واحصل على رابط الاتصال (`DATABASE_URL`).

### 2) رفع المشروع
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin <رابط مستودعك على GitHub>
git push -u origin main
```

### 3) الربط بـ Vercel
1. من لوحة Vercel: **Add New Project** → اختر المستودع.
2. **قبل** الضغط على Deploy، أضف متغيرات البيئة (Environment Variables):
   - `DATABASE_URL` = رابط قاعدة بياناتك
   - `JWT_SECRET` = نص عشوائي طويل (يمكن توليده بـ `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)

   ⚠️ **مهم جدًا:** عملية البناء (Build) نفسها تحتاج `DATABASE_URL` وليس فقط وقت التشغيل — إذا ضغطت Deploy قبل إضافة المتغيرات سيفشل الـ Build برسالة `DATABASE_URL is required`. تأكد من إضافتهما أولًا ثم اضغط Deploy (أو أعد المحاولة Redeploy بعد إضافتهما).
3. اضغط **Deploy**.

### 4) إنشاء الجداول (مرة واحدة فقط، أول نشر)
من جهازك، مع تعيين `DATABASE_URL` لنفس قاعدة بيانات الإنتاج، نفّذ:
```bash
npm install
npm run db:push
```
هذا ينشئ كل الجداول (الحسابات، العملاء، الموردين، القيود، الشركاء، الموافقات، سجل التدقيق...).

### 5) أول تسجيل دخول
افتح رابط الموقع على Vercel → صفحة `/login` → سجّل دخول بحساب المدير:
- **admin** / **Admin@2024**

أول محاولة تسجيل دخول تُنشئ تلقائيًا دليل الحسابات، الشركاء الثلاثة، بقية المستخدمين، والخزينة.

### حسابات الدخول التجريبية
| الدور | اسم المستخدم | كلمة المرور |
|---|---|---|
| المدير العام | admin | Admin@2024 |
| الشريك الأول | partner1 | Partner1@2024 |
| الشريك الثاني | partner2 | Partner2@2024 |
| الشريك الثالث | partner3 | Partner3@2024 |
| المحاسب | accountant | Account@2024 |

**مهم:** غيّر كلمات المرور هذه بعد أول دخول في بيئة إنتاج حقيقية.

## التشغيل محليًا
```bash
npm install
cp .env.example .env   # ثم عدّل DATABASE_URL و JWT_SECRET
npm run db:push
npm run dev
```

## أوامر مفيدة
- `npm run dev` — تشغيل وضع التطوير
- `npm run build` && `npm run start` — بناء وتشغيل وضع الإنتاج محليًا
- `npm run db:push` — تطبيق مخطط قاعدة البيانات (Drizzle) على `DATABASE_URL` الحالي
- `npm run typecheck` — فحص أخطاء TypeScript
- `npm run lint` — فحص جودة الكود

## نسخ احتياطي واستعادة (PostgreSQL)
نسخ احتياطي:
```bash
pg_dump "$DATABASE_URL" -F c -f backup.dump
```
استعادة:
```bash
pg_restore --clean --if-exists -d "$DATABASE_URL" backup.dump
```
