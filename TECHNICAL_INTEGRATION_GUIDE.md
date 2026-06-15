# دليل التكامل التقني لنظام رسوم التوصيل

## نظرة عامة
هذا الدليل يشرح كيفية تكامل نظام رسوم التوصيل بين جميع المكونات:
- **لوحة التحكم (Admin Dashboard)**: إدارة الإعدادات
- **تطبيق العميل (Client App)**: عرض الرسوم
- **تطبيق السائق (Driver App)**: معلومات عمولة التوصيل
- **قاعدة البيانات (Database)**: تخزين البيانات
- **السيرفر (Backend Server)**: حساب الرسوم

---

## 1. معمارية النظام

```
┌─────────────────────────────────────────────────────────────┐
│                      Admin Dashboard                         │
│         (إضافة/تعديل الإعدادات والقواعس)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /api/delivery-fees/settings
                       │
        ┌──────────────▼──────────────┐
        │   Backend Server (Node.js)   │
        │                              │
        │ • validating                │
        │ • calculating               │
        │ • reading from DB           │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │   PostgreSQL Database       │
        │                             │
        │ • delivery_fee_settings     │
        │ • delivery_zones            │
        │ • geo_zones                 │
        │ • delivery_rules            │
        │ • delivery_discounts        │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
    ┌───▼────────────┐          ┌────▼────────────┐
    │ Client App     │          │ Driver App      │
    │ (React)        │          │ (React)         │
    │                │          │                 │
    │ • requests fee │          │ • sees earnings │
    │ • shows in cart│          │ • per delivery  │
    └────────────────┘          └─────────────────┘
```

---

## 2. تسلسل الطلب الكامل

### المرحلة 1: العميل يختار الموقع (Client Side)

```typescript
// client/src/pages/Cart.tsx
const handleLocationSelect = async (location: LocationData) => {
  // 1. الاتصال بالسيرفر لحساب رسوم التوصيل
  const response = await apiRequest('POST', '/api/delivery-fees/calculate', {
    customerLat: location.lat,
    customerLng: location.lng,
    restaurantId: restaurantId || null,
    orderSubtotal: subtotal
  });
  
  const data = await response.json();
  
  // 2. عرض الرسوم في السلة
  if (data.success) {
    setDeliveryFee(data.fee);  // تحديث السلة
    // data.distance, data.estimatedTime, etc.
  }
};
```

**البيانات المرسلة:**
- `customerLat`, `customerLng`: إحداثيات العميل
- `restaurantId`: معرف المطعم (اختياري)
- `orderSubtotal`: إجمالي قيمة الطلب

**البيانات المعادة:**
```json
{
  "success": true,
  "fee": 21.5,
  "distance": 8.3,
  "estimatedTime": "20-30 دقيقة",
  "feeBreakdown": {
    "baseFee": 5,
    "distanceFee": 16,
    "totalBeforeLimit": 21
  },
  "isFreeDelivery": false,
  "appliedRuleId": null,
  "appliedDiscountId": null
}
```

### المرحلة 2: السيرفر يحسب الرسوم (Server Side)

```typescript
// server/routes/delivery-fees.ts
router.post("/calculate", async (req, res) => {
  // 1. الحصول على الإحداثيات والمعلومات
  const { customerLat, customerLng, restaurantId, orderSubtotal } = req.body;
  
  // 2. استدعاء خدمة الحساب
  const result = await calculateDeliveryFee(
    { lat: parseFloat(customerLat), lng: parseFloat(customerLng) },
    restaurantId || null,
    parseFloat(orderSubtotal || '0')
  );
  
  // 3. إعادة النتيجة
  res.json({ success: true, ...result });
});
```

### المرحلة 3: خدمة الحساب (Calculation Service)

```typescript
// server/services/deliveryFeeService.ts
export async function calculateDeliveryFee(
  customerLocation,
  restaurantId,
  orderSubtotal
) {
  // 1. جلب الإعدادات من قاعدة البيانات
  const deliverySettings = await getDeliveryFeeSettings(restaurantId);
  
  // 2. حساب المسافة
  const distance = calculateDistance(storeLocation, customerLocation);
  
  // 3. تحديد المنطقة الجغرافية
  const matchingGeoZoneId = findGeoZone(customerLocation);
  
  // 4. تطبيق القواعس الديناميكية
  let appliedFee = baseFee + (distance * perKmFee);
  for (const rule of activeRules) {
    if (ruleMatches(rule, distance, orderSubtotal, matchingGeoZoneId)) {
      appliedFee = rule.fee;
      break;
    }
  }
  
  // 5. تطبيق الخصومات
  for (const discount of activeDiscounts) {
    if (discountApplies(discount, orderSubtotal)) {
      appliedFee = applyDiscount(appliedFee, discount);
      break;
    }
  }
  
  // 6. تطبيق حد التوصيل المجاني
  if (orderSubtotal >= freeDeliveryThreshold) {
    appliedFee = 0;
  }
  
  // 7. تطبيق الحد الأدنى والأقصى
  appliedFee = Math.max(minFee, Math.min(maxFee, appliedFee));
  
  return {
    fee: appliedFee,
    distance,
    estimatedTime,
    ...
  };
}
```

### المرحلة 4: العميل يضع الطلب

```typescript
// client/src/pages/Cart.tsx
const handlePlaceOrder = () => {
  const orderData = {
    customerName,
    customerPhone,
    deliveryAddress,
    customerLocationLat,
    customerLocationLng,
    items,
    subtotal,
    deliveryFee,  // الرسوم المحسوبة من المرحلة 1
    total: subtotal + deliveryFee,
    restaurantId,
    ...
  };
  
  // إرسال الطلب إلى السيرفر
  placeOrderMutation.mutate(orderData);
};
```

### المرحلة 5: السيرفر ينشئ الطلب

```typescript
// server/routes/orders.ts
router.post("/", async (req, res) => {
  // 1. استقبال البيانات من العميل
  const { 
    subtotal, 
    deliveryFee: clientDeliveryFee,
    customerLocationLat,
    customerLocationLng,
    restaurantId,
    ...rest
  } = req.body;
  
  // 2. إعادة حساب رسوم التوصيل للتحقق
  let finalDeliveryFee = parseFloat(clientDeliveryFee || '0');
  
  if (customerLocationLat && customerLocationLng) {
    const feeResult = await calculateDeliveryFee(
      { lat: parseFloat(customerLocationLat), lng: parseFloat(customerLocationLng) },
      restaurantId,
      parseFloat(subtotal || '0')
    );
    finalDeliveryFee = feeResult.fee;
  }
  
  // 3. حساب العمولات
  const driverEarnings = (finalDeliveryFee * 70) / 100;  // 70% للسائق
  const companyEarnings = finalDeliveryFee - driverEarnings;
  
  // 4. حفظ الطلب مع جميع البيانات
  const order = await storage.createOrder({
    ...rest,
    subtotal: String(subtotalNum),
    deliveryFee: String(finalDeliveryFee),
    total: String(subtotalNum + finalDeliveryFee),
    driverEarnings: String(driverEarnings),
    companyEarnings: String(companyEarnings),
    ...
  });
  
  // 5. إرسال إشعارات
  // للمطعم، للسائق، للعميل
});
```

### المرحلة 6: السائق يرى الطلب

```typescript
// driver/src/pages/Delivery.tsx
// السائق يرى الطلب مع:
// - رقم الطلب
// - تفاصيل العميل
// - العنوان والموقع
// - عمولة التوصيل: deliveryFee * 0.7
// - قيمة الطلب
// - المجموع النهائي
```

---

## 3. تدفق البيانات في قاعدة البيانات

### الجداول الأساسية

#### delivery_fee_settings
```sql
-- الإعدادات العامة والخاصة لكل مطعم
id: UUID
restaurant_id: UUID (NULL for global)
type: VARCHAR (fixed, per_km, zone_based, restaurant_custom)
base_fee: DECIMAL
per_km_fee: DECIMAL
min_fee: DECIMAL
max_fee: DECIMAL
free_delivery_threshold: DECIMAL
store_lat: DECIMAL
store_lng: DECIMAL
is_active: BOOLEAN
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### delivery_zones
```sql
-- مناطق حسب المسافة
id: UUID
name: VARCHAR
min_distance: DECIMAL
max_distance: DECIMAL
delivery_fee: DECIMAL
estimated_time: VARCHAR
is_active: BOOLEAN
```

#### geo_zones
```sql
-- مناطق جغرافية (Polygons)
id: UUID
name: VARCHAR
coordinates: TEXT (JSON)
is_active: BOOLEAN
```

#### delivery_rules
```sql
-- قواعس ديناميكية
id: UUID
name: VARCHAR
rule_type: VARCHAR (distance, order_value, zone)
min_distance: DECIMAL
max_distance: DECIMAL
min_order_value: DECIMAL
max_order_value: DECIMAL
geo_zone_id: UUID
fee: DECIMAL
is_active: BOOLEAN
priority: INTEGER
```

#### delivery_discounts
```sql
-- خصومات على التوصيل
id: UUID
name: VARCHAR
discount_type: VARCHAR (percentage, fixed_amount)
discount_value: DECIMAL
min_order_value: DECIMAL
valid_from: TIMESTAMP
valid_until: TIMESTAMP
is_active: BOOLEAN
```

#### orders
```sql
-- الطلبات مع معلومات التوصيل
id: UUID
order_number: VARCHAR
customer_name: VARCHAR
customer_phone: VARCHAR
delivery_address: TEXT
customer_location_lat: VARCHAR
customer_location_lng: VARCHAR
subtotal: DECIMAL
delivery_fee: DECIMAL  -- <-- الرسوم المحسوبة
total_amount: DECIMAL
distance: DECIMAL  -- المسافة
driver_earnings: DECIMAL  -- عمولة السائق
restaurant_earnings: DECIMAL
company_earnings: DECIMAL
restaurant_id: UUID
driver_id: UUID
status: VARCHAR
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

---

## 4. نقاط API الرئيسية

### حساب الرسوم
```
POST /api/delivery-fees/calculate
Request: {
  customerLat: number,
  customerLng: number,
  restaurantId?: string,
  orderSubtotal: number
}
Response: {
  fee: number,
  distance: number,
  estimatedTime: string,
  ...
}
```

### الإعدادات العامة
```
GET /api/delivery-fees/settings?restaurantId=...
POST /api/delivery-fees/settings
Request: {
  type: string,
  baseFee: string,
  perKmFee: string,
  minFee: string,
  maxFee: string,
  freeDeliveryThreshold: string,
  storeLat?: string,
  storeLng?: string
}
```

### المناطق والقواعس والخصومات
```
GET /api/delivery-fees/zones
POST /api/delivery-fees/zones
PUT /api/delivery-fees/zones/:id
DELETE /api/delivery-fees/zones/:id

GET /api/delivery-fees/rules
POST /api/delivery-fees/rules
PATCH /api/delivery-fees/rules/:id
DELETE /api/delivery-fees/rules/:id

GET /api/delivery-fees/discounts
POST /api/delivery-fees/discounts
PATCH /api/delivery-fees/discounts/:id
DELETE /api/delivery-fees/discounts/:id
```

---

## 5. التحقق من التطابق

### قائمة التحقق (Checklist)

#### 1. قاعدة البيانات
- [ ] الجداول موجودة وتحتوي على البيانات الصحيحة
- [ ] يمكن الاتصال بقاعدة البيانات بدون أخطاء
- [ ] البيانات محفوظة بشكل صحيح عند التعديل

#### 2. السيرفر
- [ ] جميع نقاط API تعمل بدون أخطاء
- [ ] يتم جلب البيانات من قاعدة البيانات بشكل صحيح
- [ ] الحسابات صحيحة ودقيقة
- [ ] الأخطاء معالجة بشكل صحيح

#### 3. تطبيق العميل
- [ ] الرسوم تُحدّث عند اختيار الموقع
- [ ] الرسوم تظهر بشكل صحيح في السلة
- [ ] الطلب يُرسل مع الرسوم الصحيحة
- [ ] لا توجد أخطاء في Console

#### 4. تطبيق السائق
- [ ] الطلبات تظهر مع تفاصيل صحيحة
- [ ] الرسوم والعمولات محسوبة بشكل صحيح
- [ ] معلومات الدخل دقيقة

#### 5. لوحة التحكم
- [ ] يمكن حفظ الإعدادات بدون أخطاء
- [ ] التعديلات تنعكس فوراً على الحسابات
- [ ] جميع القواعس تعمل بشكل صحيح

---

## 6. اختبار النظام

### اختبارات يدوية

#### اختبار 1: الإعدادات الأساسية
1. ادخل لوحة التحكم
2. اذهب لإدارة رسوم التوصيل
3. عيّن الإعدادات التالية:
   - النوع: per_km
   - الرسوم الأساسية: 5
   - رسوم لكل كم: 2
   - الحد الأدنى: 3
   - الحد الأقصى: 50
4. احفظ الإعدادات
5. تحقق من أن الرسالة "تم الحفظ بنجاح" تظهر
6. افتح تطبيق العميل واختبر الحساب

#### اختبار 2: المناطق الجغرافية
1. أضف منطقة جغرافية جديدة
2. حدد إحداثيات منطقة محددة
3. أضف قاعدة للمنطقة (مثلاً: رسوم 20 ريال)
4. اختبر حساب الرسوم من داخل المنطقة
5. اختبر من خارج المنطقة

#### اختبار 3: الخصومات
1. أضف خصم 50% على التوصيل
2. حدد حد أدنى 100 ريال
3. اختبر طلب بـ 150 ريال
4. تحقق من أن الخصم تطبق بشكل صحيح

### اختبارات تلقائية

```bash
# تشغيل الاختبارات
npm test

# اختبار API معين
npm test -- --testNamePattern="delivery-fees"

# اختبار مع التغطية
npm test -- --coverage
```

---

## 7. استكشاف الأخطاء

### الخطأ: الرسوم 0.00

**السبب المحتمل:**
- لا توجد إعدادات محفوظة في قاعدة البيانات
- موقع المتجر غير محدد
- الإحداثيات غير صحيحة

**الحل:**
1. تحقق من قاعدة البيانات: 
   ```sql
   SELECT * FROM delivery_fee_settings WHERE is_active = true;
   ```
2. تحقق من موقع المتجر:
   ```sql
   SELECT store_lat, store_lng FROM delivery_fee_settings;
   ```
3. أعد حفظ الإعدادات من لوحة التحكم

### الخطأ: "بيانات غير صحيحة" عند الحفظ

**السبب المحتمل:**
- الحد الأقصى أقل من الحد الأدنى
- قيم غير رقمية في الحقول الرقمية
- معرف المطعم غير موجود

**الحل:**
1. تحقق من الحقول:
   - الحد الأدنى <= الحد الأقصى
   - جميع الأرقام صحيحة
2. افتح DevTools واعرض رسائل الخطأ
3. تحقق من السجلات (Logs) في السيرفر

### الخطأ: الرسوم لا تتحدث في السلة

**السبب المحتمل:**
- موقع العميل لم يُحدد بشكل صحيح
- خطأ في الاتصال بـ API
- Cache في التطبيق

**الحل:**
1. امسح localStorage: `localStorage.clear()`
2. أعد تحميل الصفحة
3. اختبر الموقع مجدداً
4. افتح DevTools واعرض Network requests

---

## 8. الصيانة والمراقبة

### مراقبة الأداء
```sql
-- عدد الطلبات اليومية
SELECT COUNT(*) as daily_orders FROM orders 
WHERE DATE(created_at) = CURRENT_DATE;

-- متوسط رسوم التوصيل
SELECT AVG(delivery_fee) as avg_fee FROM orders;

-- أكثر المناطق استخداماً
SELECT geo_zones.name, COUNT(*) as count
FROM orders
JOIN geo_zones ON ST_Contains(geo_zones.coordinates, ...)
GROUP BY geo_zones.name;
```

### الالتزام والتحديثات
- تحقق من سجلات الأخطاء يومياً
- راجع الإحصائيات أسبوعياً
- حدّث الإعدادات حسب احتياجات السوق
- اختبر الحسابات عشوائياً

---

**آخر تحديث: 2026-02-20**
