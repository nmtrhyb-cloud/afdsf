/**
 * مسارات API لرسوم التوصيل
 * Delivery Fee API Routes
 */

import express from "express";
import { storage } from "../storage";
import { calculateDeliveryFee, calculateDistance, estimateDeliveryTime } from "../services/deliveryFeeService";
import { deliveryFeeCache } from "../utils/cache";
import { z } from "zod";
import { coerceRequestData } from "../utils/coercion";
import { 
  insertGeoZoneSchema, 
  insertDeliveryRuleSchema, 
  insertDeliveryDiscountSchema 
} from "@shared/schema";

const router = express.Router();

router.post("/calculate", async (req, res) => {
  try {
    const { customerLat, customerLng, restaurantId, orderSubtotal } = req.body;

    if (!customerLat || !customerLng) {
      return res.status(400).json({
        error: "بيانات ناقصة",
        details: "يجب توفير إحداثيات العميل"
      });
    }

    const lat = parseFloat(customerLat);
    const lng = parseFloat(customerLng);
    const subtotal = parseFloat(orderSubtotal || '0');
    
    const cacheKey = deliveryFeeCache.generateKey(
      Math.round(lat * 1000),
      Math.round(lng * 1000),
      restaurantId,
      Math.round(subtotal)
    );

    let result = deliveryFeeCache.get(cacheKey);
    
    if (!result) {
      result = await calculateDeliveryFee(
        { lat, lng },
        restaurantId || null,
        subtotal
      );
      deliveryFeeCache.set(cacheKey, result);
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('خطأ في حساب رسوم التوصيل:', error);
    res.status(500).json({ error: error.message || "خطأ في الخادم" });
  }
});

// حساب المسافة بين نقطتين
router.post("/distance", async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.body;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({
        error: "بيانات ناقصة",
        details: "يجب توفير إحداثيات النقطتين"
      });
    }

    const distance = calculateDistance(
      { lat: parseFloat(fromLat), lng: parseFloat(fromLng) },
      { lat: parseFloat(toLat), lng: parseFloat(toLng) }
    );

    const estimatedTime = estimateDeliveryTime(distance);

    res.json({
      success: true,
      distance,
      unit: 'km',
      estimatedTime
    });
  } catch (error: any) {
    console.error('خطأ في حساب المسافة:', error);
    res.status(500).json({ error: error.message || "خطأ في الخادم" });
  }
});

// جلب إعدادات رسوم التوصيل
router.get("/settings", async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const settings = await storage.getDeliveryFeeSettings(restaurantId as string);
    
    if (!settings) {
      // إرجاع الإعدادات الافتراضية
      return res.json({
        type: 'per_km',
        baseFee: '5',
        perKmFee: '2',
        minFee: '3',
        maxFee: '50',
        freeDeliveryThreshold: '0',
        isDefault: true
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('خطأ في جلب إعدادات رسوم التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إنشاء أو تحديث إعدادات رسوم التوصيل (للمدير)
router.post("/settings", async (req, res) => {
  try {
    console.log('📥 تم استقبال طلب حفظ إعدادات التوصيل:', JSON.stringify(req.body, null, 2));
    
    const coercedData = coerceRequestData(req.body);
    console.log('🔄 البيانات بعد التحويل:', JSON.stringify(coercedData, null, 2));
    
    const settingsSchema = z.object({
      type: z.enum(['fixed', 'per_km', 'zone_based', 'restaurant_custom'])
        .refine(val => val, { message: 'نوع الحساب مطلوب' }),
      baseFee: z.string().optional(),
      perKmFee: z.string().optional(),
      minFee: z.string().optional(),
      maxFee: z.string().optional(),
      freeDeliveryThreshold: z.string().optional(),
      storeLat: z.string().optional(),
      storeLng: z.string().optional(),
      restaurantId: z.string().optional()
    });

    const validatedData = settingsSchema.parse(coercedData);
    console.log('✅ البيانات تم التحقق منها بنجاح:', JSON.stringify(validatedData, null, 2));
    
    // التحقق من صحة القيم الرقمية
    const validateNumber = (value: string | undefined, fieldName: string): string => {
      if (!value || value === '') {
        console.log(`⚠️ ${fieldName} فارغة - سيتم استخدام القيمة الافتراضية 0`);
        return '0';
      }
      const num = parseFloat(value);
      if (isNaN(num)) {
        const errorMsg = `❌ ${fieldName} = "${value}" ليست قيمة رقمية صحيحة`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      if (num < 0) {
        const errorMsg = `❌ ${fieldName} يجب أن تكون قيمة موجبة أو صفر، القيمة المدخلة: ${num}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      console.log(`✓ ${fieldName}: ${value} → ${num}`);
      return num.toString();
    };

    const sanitizedData = {
      ...validatedData,
      baseFee: validateNumber(validatedData.baseFee, 'الرسوم الأساسية'),
      perKmFee: validateNumber(validatedData.perKmFee, 'رسوم لكل كيلومتر'),
      minFee: validateNumber(validatedData.minFee, 'الحد الأدنى'),
      maxFee: validateNumber(validatedData.maxFee, 'الحد الأقصى'),
      freeDeliveryThreshold: validateNumber(validatedData.freeDeliveryThreshold, 'حد التوصيل المجاني'),
      storeLat: validatedData.storeLat ? validateNumber(validatedData.storeLat, 'خط العرض') : undefined,
      storeLng: validatedData.storeLng ? validateNumber(validatedData.storeLng, 'خط الطول') : undefined,
    };

    console.log('🧹 البيانات بعد التنظيف:', JSON.stringify(sanitizedData, null, 2));

    // التحقق من أن maxFee أكبر من أو يساوي minFee
    const minFeeNum = parseFloat(sanitizedData.minFee || '0');
    const maxFeeNum = parseFloat(sanitizedData.maxFee || '1000');
    
    console.log(`📊 التحقق من الحدود: minFee=${minFeeNum}, maxFee=${maxFeeNum}`);
    
    if (maxFeeNum < minFeeNum) {
      const errorMsg = `❌ الحد الأقصى (${maxFeeNum}) يجب أن يكون أكبر من أو يساوي الحد الأدنى (${minFeeNum})`;
      console.error(errorMsg);
      return res.status(400).json({
        success: false,
        error: "بيانات غير صحيحة",
        field: "maxFee",
        message: errorMsg,
        details: {
          minFee: minFeeNum,
          maxFee: maxFeeNum,
          issue: "الحد الأقصى أقل من الحد الأدنى"
        }
      });
    }

    // التحقق من أن القيم معقولة
    if (maxFeeNum > 100000) {
      console.warn(`⚠️ تحذير: الحد الأقصى (${maxFeeNum}) يبدو مرتفعاً جداً`);
    }
    
    // التحقق من وجود إعدادات سابقة
    console.log(`🔍 البحث عن إعدادات سابقة للمطعم: ${sanitizedData.restaurantId || 'عام'}`);
    const existing = await storage.getDeliveryFeeSettings(sanitizedData.restaurantId);
    
    if (existing) {
      console.log(`📝 تحديث الإعدادات الموجودة: ${existing.id}`);
      const updated = await storage.updateDeliveryFeeSettings(existing.id, sanitizedData);
      console.log(`✅ تم التحديث بنجاح:`, JSON.stringify(updated, null, 2));
      return res.json({ 
        success: true, 
        message: 'تم تحديث الإعدادات بنجاح',
        settings: updated 
      });
    }

    console.log(`✨ إنشاء إعدادات جديدة`);
    const newSettings = await storage.createDeliveryFeeSettings(sanitizedData);
    console.log(`✅ تم الإنشاء بنجاح:`, JSON.stringify(newSettings, null, 2));
    res.status(201).json({ 
      success: true, 
      message: 'تم حفظ الإعدادات بنجاح',
      settings: newSettings 
    });
  } catch (error: any) {
    console.error('💥 خطأ في حفظ إعدادات رسوم التوصيل:', error);
    
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map(e => ({
        field: e.path.join('.') || 'unknown',
        message: e.message,
        code: e.code
      }));
      console.error('❌ أخطاء Zod validation:', JSON.stringify(errorDetails, null, 2));
      
      return res.status(400).json({
        success: false,
        error: "خطأ في البيانات المدخلة",
        validationErrors: errorDetails,
        hint: "تحقق من أن جميع الحقول تحتوي على قيم صحيحة"
      });
    }
    
    if (error.message && error.message.includes('يجب أن يكون')) {
      return res.status(400).json({
        success: false,
        error: "خطأ في القيم المدخلة",
        message: error.message,
        hint: "تأكد من إدخال أرقام صحيحة في جميع الحقول"
      });
    }

    if (error.code === 'ECONNREFUSED') {
      console.error('❌ عدم القدرة على الاتصال بقاعدة البيانات');
      return res.status(500).json({
        success: false,
        error: "خطأ في الاتصال",
        message: "تعذر الاتصال بقاعدة البيانات",
        hint: "تأكد من أن خادم قاعدة البيانات يعمل"
      });
    }

    return res.status(400).json({ 
      success: false,
      error: "خطأ في حفظ الإعدادات",
      message: error.message || "حدث خطأ غير متوقع",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: "تحقق من وحدة التحكم (Console) لمزيد من التفاصيل"
    });
  }
});

// جلب مناطق التوصيل
router.get("/zones", async (req, res) => {
  try {
    const zones = await storage.getDeliveryZones();
    res.json(zones);
  } catch (error) {
    console.error('خطأ في جلب مناطق التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إضافة منطقة توصيل جديدة
router.post("/zones", async (req, res) => {
  try {
    const zoneSchema = z.object({
      name: z.string().min(1, "اسم المنطقة مطلوب"),
      description: z.string().optional(),
      minDistance: z.string().optional(),
      maxDistance: z.string(),
      deliveryFee: z.string(),
      estimatedTime: z.string().optional()
    });

    const validatedData = zoneSchema.parse(req.body);
    const newZone = await storage.createDeliveryZone(validatedData);
    
    res.status(201).json({ success: true, zone: newZone });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "بيانات غير صحيحة",
        details: error.errors
      });
    }
    console.error('خطأ في إضافة منطقة التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث منطقة توصيل
router.put("/zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await storage.updateDeliveryZone(id, req.body);
    
    if (!updated) {
      return res.status(404).json({ error: "المنطقة غير موجودة" });
    }

    res.json({ success: true, zone: updated });
  } catch (error) {
    console.error('خطأ في تحديث منطقة التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// حذف منطقة توصيل
router.delete("/zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteDeliveryZone(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "المنطقة غير موجودة" });
    }

    res.json({ success: true, message: "تم حذف المنطقة بنجاح" });
  } catch (error) {
    console.error('خطأ في حذف منطقة التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// --- Geo-Zones (Polygons) ---

router.get("/geo-zones", async (req, res) => {
  try {
    const zones = await storage.getGeoZones();
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: "خطأ في جلب المناطق الجغرافية" });
  }
});

router.post("/geo-zones", async (req, res) => {
  try {
    const validatedData = insertGeoZoneSchema.parse(req.body);
    const zone = await storage.createGeoZone(validatedData);
    res.status(201).json(zone);
  } catch (error) {
    res.status(400).json({ error: "بيانات المنطقة غير صحيحة" });
  }
});

router.patch("/geo-zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertGeoZoneSchema.partial().parse(req.body);
    const zone = await storage.updateGeoZone(id, validatedData);
    if (!zone) return res.status(404).json({ error: "المنطقة غير موجودة" });
    res.json(zone);
  } catch (error) {
    res.status(400).json({ error: "بيانات المنطقة غير صحيحة" });
  }
});

router.delete("/geo-zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteGeoZone(id);
    if (!success) return res.status(404).json({ error: "المنطقة غير موجودة" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "فشل حذف المنطقة" });
  }
});

// --- Delivery Rules ---

router.get("/rules", async (req, res) => {
  try {
    const rules = await storage.getDeliveryRules();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: "خطأ في جلب القواعد" });
  }
});

router.post("/rules", async (req, res) => {
  try {
    const coercedData = coerceRequestData(req.body);
    const validatedData = insertDeliveryRuleSchema.parse(coercedData);
    const rule = await storage.createDeliveryRule(validatedData);
    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ error: "بيانات القاعدة غير صحيحة" });
  }
});

router.patch("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const coercedData = coerceRequestData(req.body);
    const validatedData = insertDeliveryRuleSchema.partial().parse(coercedData);
    const rule = await storage.updateDeliveryRule(id, validatedData);
    if (!rule) return res.status(404).json({ error: "القاعدة غير موجودة" });
    res.json(rule);
  } catch (error) {
    res.status(400).json({ error: "بيانات القاعدة غير صحيحة" });
  }
});

router.delete("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteDeliveryRule(id);
    if (!success) return res.status(404).json({ error: "القاعدة غير موجودة" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "فشل حذف القاعدة" });
  }
});

// --- Delivery Discounts ---

router.get("/discounts", async (req, res) => {
  try {
    const discounts = await storage.getDeliveryDiscounts();
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ error: "خطأ في جلب الخصومات" });
  }
});

router.post("/discounts", async (req, res) => {
  try {
    const coercedData = coerceRequestData(req.body);
    const validatedData = insertDeliveryDiscountSchema.parse(coercedData);
    const discount = await storage.createDeliveryDiscount(validatedData);
    res.status(201).json(discount);
  } catch (error) {
    res.status(400).json({ error: "بيانات الخصم غير صحيحة" });
  }
});

router.patch("/discounts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const coercedData = coerceRequestData(req.body);
    const validatedData = insertDeliveryDiscountSchema.partial().parse(coercedData);
    const discount = await storage.updateDeliveryDiscount(id, validatedData);
    if (!discount) return res.status(404).json({ error: "الخصم غير موجود" });
    res.json(discount);
  } catch (error) {
    res.status(400).json({ error: "بيانات الخصم غير صحيحة" });
  }
});

router.delete("/discounts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteDeliveryDiscount(id);
    if (!success) return res.status(404).json({ error: "الخصم غير موجود" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "فشل حذف الخصم" });
  }
});

export default router;
