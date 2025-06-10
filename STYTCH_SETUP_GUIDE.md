# Stytch Setup Guide - دليل إعداد Stytch

## المشكلة
```
{
  "error_type": "project_not_found",
  "error_message": "Project could not be found."
}
```

## الحل السريع

### 1. إنشاء حساب Stytch

1. **انتقل إلى:** https://stytch.com/
2. **انقر على "Get Started"**
3. **انشئ حساب جديد** باستخدام بريدك الإلكتروني
4. **أكد بريدك الإلكتروني**

### 2. إنشاء مشروع جديد

1. **في لوحة التحكم، انقر على "Create Project"**
2. **اختر اسم للمشروع:** `7awel-crypto-wallet`
3. **اختر "Consumer" type**
4. **انقر "Create"**

### 3. الحصول على API Keys

1. **انتقل إلى "API Keys" من القائمة الجانبية**
2. **انسخ القيم التالية:**
   - **Project ID** (يبدأ بـ `project-test-`)
   - **Secret** (يبدأ بـ `secret-test-`)

### 4. إنشاء ملف .env

انشئ ملف `.env` في مجلد المشروع:

```env
# Environment
NODE_ENV=development
PORT=3000

# Stytch Configuration
STYTCH_PROJECT_ID=project-test-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
STYTCH_SECRET=secret-test-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**استبدل الـ x بالقيم الحقيقية من Stytch Dashboard**

### 5. إعداد OTP في Stytch

1. **انتقل إلى "Products" → "OTPs"**
2. **مفعل الخيارات التالية:**
   - ✅ SMS OTP
   - ✅ WhatsApp OTP  
   - ✅ Email OTP

### 6. اختبار الاتصال

1. **شغل السيرفر:**
```bash
npm run dev
```

2. **اختبر الاتصال:**
```http
GET http://localhost:3000/api/stytch-test
```

**النتيجة المطلوبة:**
```json
{
  "status": "SUCCESS",
  "message": "Stytch connection successful! ✅",
  "environment": {
    "project_id": "Set ✅",
    "secret": "Set ✅",
    "node_env": "development"
  }
}
```

### 7. اختبار OTP

بعد إعداد متغيرات البيئة:

```http
POST http://localhost:3000/api/v1/auth/otp/send
Content-Type: application/json

{
  "medium": "phone",
  "value": "+963968364974",
  "channel": "whatsapp"
}
```

## إعدادات إضافية (اختيارية)

### 1. Redirect URLs
```
Dashboard → Settings → Redirect URLs
أضف: http://localhost:3000
```

### 2. Webhook URLs (للإنتاج)
```
Dashboard → Settings → Webhooks
أضف: https://your-domain.com/api/webhooks/stytch
```

### 3. Session Duration
```
Dashboard → Products → Sessions
مدة الجلسة: 7 أيام (افتراضي)
```

## نصائح مهمة

### 🔒 أمان
- **لا تشارك** الـ Secret مع أحد
- **استخدم متغيرات البيئة** فقط
- **في الإنتاج:** استخدم `project-live-` و `secret-live-`

### 📱 اختبار OTP
- **للاختبار:** استخدم أرقام وهمية من Stytch
- **Test phone numbers:** `+15005550006`
- **Test OTP code:** `000000`

### 🚨 استكشاف الأخطاء

#### خطأ: "project_not_found"
- ✅ تأكد من `STYTCH_PROJECT_ID` صحيح
- ✅ تأكد من أن الملف `.env` موجود
- ✅ اعد تشغيل السيرفر بعد إضافة متغيرات البيئة

#### خطأ: "invalid_secret"
- ✅ تأكد من `STYTCH_SECRET` صحيح
- ✅ تأكد من عدم وجود مسافات إضافية

#### خطأ: "phone_number_invalid"
- ✅ استخدم تنسيق دولي: `+963968364974`
- ✅ تأكد من أن الرقم صحيح

## مثال كامل للاختبار

```bash
# 1. إنشاء ملف .env
echo "NODE_ENV=development
PORT=3000
STYTCH_PROJECT_ID=your-project-id-here
STYTCH_SECRET=your-secret-here" > .env

# 2. تشغيل السيرفر
npm run dev

# 3. اختبار الاتصال
curl http://localhost:3000/api/stytch-test

# 4. اختبار OTP
curl -X POST http://localhost:3000/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"medium":"phone","value":"+15005550006","channel":"sms"}'
```

---

بعد اتباع هذه الخطوات، سيعمل نظام OTP بشكل مثالي! 🎉 