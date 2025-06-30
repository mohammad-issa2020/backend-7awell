# 📝 **دليل إعداد ملف .env للـ Better Stack**

## 🔍 **ما هو ملف .env؟**
ملف `.env` يحتوي على **المتغيرات السرية** للمشروع (مثل كلمات المرور والـ tokens)

---

## 📋 **القيم المطلوبة في ملف .env:**

### **✅ للـ Better Stack:**
```bash
BETTER_STACK_SOURCE_TOKEN=bt_your_token_here
BETTER_STACK_ENDPOINT=https://in.logs.betterstack.com
```

### **✅ للـ Logging العام:**
```bash
LOG_LEVEL=info
NODE_ENV=development
```

### **✅ للـ Grafana Loki (اختياري):**
```bash
LOKI_URL=http://localhost:3100
LOKI_USERNAME=
LOKI_PASSWORD=
```

---

## 🔑 **كيفية الحصول على كل قيمة:**

### **1️⃣ BETTER_STACK_SOURCE_TOKEN**
```
🌐 اذهب إلى: https://betterstack.com/users/sign-up
📧 ادخل الإيميل → اضغط "Send me a magic link"
📱 افتح الإيميل واضغط على الرابط

بعد تسجيل الدخول:
1. اضغط "Sources" من القائمة اليسرى
2. اضغط "Connect source" (الزر الأزرق)
3. اختر "Node.js" من القائمة
4. ادخل اسم: "7awell-backend"
5. اضغط "Create source"

الآن ستجد:
📋 Source Token: bt_abc123def456... (انسخه)
```

### **2️⃣ BETTER_STACK_ENDPOINT**
```
✅ هذا ثابت دائماً: https://in.logs.betterstack.com
(لا تحتاج تغييره)
```

### **3️⃣ LOG_LEVEL**
```
✅ اختر واحد:
- debug    (كل شيء - للتطوير)
- info     (المعلومات المهمة - موصى به)
- warn     (التحذيرات والأخطاء)
- error    (الأخطاء فقط)
```

### **4️⃣ NODE_ENV**
```
✅ اختر واحد:
- development  (للتطوير)
- production   (للإنتاج)
- test         (للاختبار)
```

---

## 📄 **إنشاء ملف .env:**

### **الطريقة الأولى - من VS Code:**
```
1. افتح VS Code في جذر المشروع
2. أنشئ ملف جديد: .env
3. انسخ المحتوى أدناه:
```

### **الطريقة الثانية - من الكونسول:**
```bash
# انشاء الملف
touch .env

# فتح الملف للتعديل
notepad .env
```

---

## 📝 **محتوى ملف .env الكامل:**

```bash
# =================================
# Better Stack Configuration
# =================================
BETTER_STACK_SOURCE_TOKEN=bt_replace_with_your_actual_token
BETTER_STACK_ENDPOINT=https://in.logs.betterstack.com

# =================================
# Logging Configuration  
# =================================
LOG_LEVEL=info
NODE_ENV=development

# =================================
# Grafana Loki (Optional)
# =================================
LOKI_URL=
LOKI_USERNAME=
LOKI_PASSWORD=

# =================================
# Other Settings (if needed)
# =================================
PORT=3000
```

---

## 🔄 **مثال بقيم حقيقية:**

```bash
# مثال بعد الحصول على التوكن من Better Stack
BETTER_STACK_SOURCE_TOKEN=bt_abc123def456ghi789jkl012mno345
BETTER_STACK_ENDPOINT=https://in.logs.betterstack.com

LOG_LEVEL=info
NODE_ENV=development

# Loki (اتركها فارغة إذا لم تستخدمها)
LOKI_URL=
LOKI_USERNAME=
LOKI_PASSWORD=
```

---

## ⚠️ **ملاحظات مهمة:**

### **🔒 الأمان:**
```bash
# أضف .env للـ .gitignore لحماية الـ tokens
echo ".env" >> .gitignore
```

### **✅ التحقق من الإعداد:**
```bash
# شغل الاختبار للتأكد
node test-better-stack.js
```

### **🚨 إذا ظهرت أخطاء:**
```bash
# تأكد من:
1. التوكن صحيح ويبدأ بـ bt_
2. لا يوجد مسافات زائدة
3. ملف .env في جذر المشروع
4. NODE_ENV ليس 'test'
```

---

## 🎯 **الخلاصة:**

| المتغير | القيمة | من أين أحصل عليه |
|---------|--------|------------------|
| `BETTER_STACK_SOURCE_TOKEN` | `bt_abc123...` | Better Stack Dashboard |
| `BETTER_STACK_ENDPOINT` | `https://in.logs.betterstack.com` | ثابت دائماً |
| `LOG_LEVEL` | `info` | اختيارك |
| `NODE_ENV` | `development` | اختيارك |

**بعد الإعداد → شغل: `node test-better-stack.js` للاختبار! 🚀** 