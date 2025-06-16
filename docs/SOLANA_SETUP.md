# 🚀 **دليل إعداد Solana USDT Transfer**

## 📋 **نظرة عامة**

هذا النظام يتيح إرسال USDT على شبكة Solana مع دفع الرسوم من محفظة رئيسية، مما يوفر تجربة سلسة للمستخدمين بدون الحاجة لامتلاك SOL.

---

## 🔧 **الإعداد الأولي**

### **1. متغيرات البيئة**

أضف هذه المتغيرات إلى ملف `.env`:

```bash
# ===============================
# 🌐 SOLANA CONFIGURATION
# ===============================
SOLANA_NETWORK=mainnet-beta
# Options: mainnet-beta, devnet, testnet

SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# أو استخدم RPC مخصص من Alchemy/QuickNode

# ===============================
# 💰 FEE PAYER WALLET
# ===============================
SOLANA_FEE_PAYER_PRIVATE_KEY=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64]
# مصفوفة من 64 رقم تمثل المفتاح الخاص

# ===============================
# 📊 LIMITS & SETTINGS
# ===============================
MAX_USDT_PER_TX=10000
# الحد الأقصى للمبلغ في المعاملة الواحدة

MIN_SOL_BALANCE=0.1
# الحد الأدنى لرصيد SOL في محفظة الرسوم
```

### **2. إنشاء محفظة Fee Payer**

```javascript
// إنشاء محفظة جديدة
const { Keypair } = require('@solana/web3.js');

const wallet = Keypair.generate();
console.log('Public Key:', wallet.publicKey.toString());
console.log('Private Key Array:', Array.from(wallet.secretKey));
```

### **3. تمويل محفظة Fee Payer**

- احصل على SOL في محفظة Fee Payer
- الحد الأدنى المطلوب: 0.1 SOL
- كل معاملة تكلف ~0.005 SOL

---

## 🔄 **كيفية العمل**

### **المرحلة 1: تحضير المعاملة**

```javascript
POST /api/v1/solana/usdt/prepare
{
  "fromWallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "toWallet": "4fYNw3dojWmQ4dXtSGE9epjRGy9pFSx62YypT7avPYvA",
  "amount": 10.5
}
```

**الاستجابة:**
```javascript
{
  "success": true,
  "data": {
    "transaction": "base64_encoded_transaction",
    "transactionId": "tx_1234567890_abc123",
    "amount": 10.5,
    "estimatedFee": {
      "totalSOL": 0.005,
      "currency": "SOL"
    },
    "expiresAt": 1640995200000,
    "message": "Transaction ready - needs user signature"
  }
}
```

### **المرحلة 2: توقيع المستخدم**

المستخدم يوقع على المعاملة باستخدام محفظته (Phantom, Solflare, إلخ)

### **المرحلة 3: إكمال المعاملة**

```javascript
POST /api/v1/solana/usdt/complete
{
  "serializedTransaction": "base64_encoded_transaction",
  "userSignature": {
    "publicKey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "signature": "base64_encoded_signature"
  },
  "transactionId": "tx_1234567890_abc123"
}
```

**الاستجابة:**
```javascript
{
  "success": true,
  "data": {
    "signature": "5j7s8K9mN2pQ3rT4uV5wX6yZ7a8B9c0D1e2F3g4H5i6J7k8L9m0N1o2P3q4R5s6T7u8V9w0X1y2Z3a4B5c6D7e8F9g0H",
    "explorerUrl": "https://explorer.solana.com/tx/5j7s8K9mN2pQ3rT4uV5wX6yZ7a8B9c0D1e2F3g4H5i6J7k8L9m0N1o2P3q4R5s6T7u8V9w0X1y2Z3a4B5c6D7e8F9g0H",
    "status": "confirmed",
    "timestamp": "2023-12-31T23:59:59.999Z"
  }
}
```

---

## 📊 **APIs المتاحة**

### **🚀 Transfer APIs**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/usdt/prepare` | POST | تحضير عملية إرسال USDT |
| `/usdt/complete` | POST | إكمال عملية إرسال USDT |
| `/usdt/send-simple` | POST | إرسال مبسط (للاختبار فقط) |

### **💰 Balance APIs**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/usdt/balance/:address` | GET | فحص رصيد USDT |
| `/fee-payer/balance` | GET | فحص رصيد محفظة الرسوم |

### **📈 Utility APIs**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/estimate-fee` | GET | تقدير رسوم المعاملة |
| `/stats` | GET | إحصائيات الخدمة |
| `/transaction/:signature` | GET | معلومات المعاملة |
| `/docs` | GET | وثائق API |

---

## 🔐 **الأمان**

### **حماية المفتاح الخاص**

```javascript
// ❌ خطأ
const privateKey = "your-private-key-here";

// ✅ صحيح
const privateKey = process.env.SOLANA_FEE_PAYER_PRIVATE_KEY;

// ✅ أفضل - استخدم خدمات إدارة المفاتيح
const privateKey = await getSecretFromVault('solana-fee-payer');
```

### **مراقبة الرصيد**

```javascript
// تنبيه عندما ينخفض رصيد SOL
const balance = await solanaService.checkFeePayerBalance();
if (balance.balance < 0.1) {
  await sendAlert('Low SOL balance in fee payer wallet');
}
```

### **حدود الأمان**

- حد أقصى للمبلغ: 10,000 USDT
- معدل الطلبات: 10 طلبات/دقيقة
- انتهاء صلاحية المعاملة: دقيقة واحدة

---

## 🧪 **الاختبار**

### **1. فحص حالة الخدمة**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/solana/stats
```

### **2. فحص رصيد محفظة الرسوم**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/solana/fee-payer/balance
```

### **3. فحص رصيد USDT**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/solana/usdt/balance/YOUR_WALLET_ADDRESS
```

### **4. تقدير الرسوم**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/solana/estimate-fee
```

---

## 🚨 **استكشاف الأخطاء**

### **خطأ: "Insufficient SOL for fees"**

```javascript
// الحل: تمويل محفظة Fee Payer
// تحقق من الرصيد
GET /api/v1/solana/fee-payer/balance

// إذا كان الرصيد منخفض، أرسل SOL إلى العنوان
```

### **خطأ: "Invalid wallet address format"**

```javascript
// تأكد من صحة عنوان المحفظة
const { PublicKey } = require('@solana/web3.js');
try {
  new PublicKey(walletAddress);
  console.log('Valid address');
} catch (error) {
  console.log('Invalid address');
}
```

### **خطأ: "Transaction failed"**

```javascript
// تحقق من:
// 1. رصيد USDT كافي
// 2. رصيد SOL كافي للرسوم
// 3. صحة التوقيع
// 4. انتهاء صلاحية المعاملة
```

---

## 💰 **التكاليف**

| العملية | التكلفة بـ SOL | التكلفة بـ USD |
|---------|---------------|---------------|
| إرسال USDT | ~0.000005 | ~$0.0001 |
| إنشاء Token Account | ~0.002039 | ~$0.05 |
| **إجمالي** | **~0.005** | **~$0.1** |

---

## 🔄 **التحديثات المستقبلية**

- [ ] دعم عملات أخرى (USDC, SOL)
- [ ] تحسين إدارة الرسوم
- [ ] إضافة Webhook للإشعارات
- [ ] دعم المعاملات المجمعة
- [ ] تحسين الأمان والمراقبة

---

## 📞 **الدعم**

للمساعدة أو الاستفسارات:
- 📧 Email: support@7awel.com
- 📱 WhatsApp: +970-XXX-XXXX
- 🌐 Website: https://7awel.com

---

**🎉 نظام Solana USDT Transfer جاهز للاستخدام!** 