# 🔑 **كيفية الحصول على Better Stack Tokens**

## 📋 **الخطوات المفصلة:**

### **1️⃣ إنشاء حساب Better Stack:**
```
🌐 اذهب إلى: https://betterstack.com/users/sign-up
📧 ادخل الإيميل الخاص بك
✉️ اضغط "Send me a magic link"
📱 افتح الإيميل واضغط على الرابط للتسجيل
```

### **2️⃣ إنشاء Source جديد:**
```
1. بعد تسجيل الدخول → اذهب إلى "Sources"
2. اضغط "Connect source" الأزرق
3. اختر "Node.js" من قائمة المنصات
4. ادخل اسم للمصدر: "7awell-backend"
5. اضغط "Create source"
```

### **3️⃣ الحصول على التوكن:**
```
1. بعد إنشاء الـ source → اذهب إلى "Configure"
2. في قسم "Basic information" ستجد:
   
   📋 Source Token: 
   مثال: bt_abc123def456ghi789jkl012mno345pqr678
   
   🌐 Ingesting Host:
   مثال: in.logs.betterstack.com
```

---

## 🔧 **إعداد متغيرات البيئة:**

### **إنشاء ملف .env:**
```bash
# في جذر المشروع
BETTER_STACK_SOURCE_TOKEN=bt_your_actual_token_here
BETTER_STACK_ENDPOINT=https://in.logs.betterstack.com
```

### **مثال كامل:**
```bash
# Better Stack Configuration
BETTER_STACK_SOURCE_TOKEN=bt_abc123def456ghi789jkl012mno345pqr678
BETTER_STACK_ENDPOINT=https://in.logs.betterstack.com

# Other settings
LOG_LEVEL=info
NODE_ENV=development
```

---

## 🧪 **اختبار الإعداد:**

### **1. تشغيل الاختبار:**
```bash
node test-better-stack.js
```

### **2. التحقق من النتائج:**
```
✅ إذا ظهرت الرسائل في الكونسول
✅ اذهب إلى Better Stack → Live tail
✅ يجب أن ترى الـ logs تظهر هناك
```

---

## 🎯 **ملاحظات مهمة:**

### **🆓 الحساب المجاني:**
- **1GB شهرياً** - كافي للمشاريع الصغيرة
- **Live tail** - مشاهدة الـ logs المباشرة
- **Search** - بحث في الـ logs
- **Alerts** - تنبيهات أساسية

### **🔒 الأمان:**
- لا تشارك الـ Source Token مع أحد
- أضف `.env` للـ `.gitignore`
- استخدم متغيرات البيئة في الإنتاج

### **📊 الاستخدام:**
```javascript
// بعد الإعداد، استخدم اللوغر عادي
import logger from './src/logger/index.js';

logger.info('رسالة ستظهر في Better Stack!', { 
  userId: '123' 
});
```

---

## 🆘 **في حالة المشاكل:**

### **إذا لم تظهر الـ logs:**
1. تأكد من صحة الـ Source Token
2. تأكد من الاتصال بالإنترنت
3. تأكد من أن NODE_ENV ليس 'test'

### **رسائل الخطأ الشائعة:**
```bash
# خطأ في التوكن
"Unauthorized" → تحقق من BETTER_STACK_SOURCE_TOKEN

# خطأ في الشبكة  
"Connection failed" → تحقق من الإنترنت

# لا توجد logs
تحقق من مستوى الـ logging (يجب أن يكون info أو أعلى)
``` 