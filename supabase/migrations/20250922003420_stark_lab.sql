/*
  # إضافة ميزات التوصيل المتقدمة

  1. تحديثات جدول المطاعم
    - إضافة حقل رسوم التوصيل لكل كيلومتر
  2. تحديثات جدول الطلبات
    - إضافة حقول الموقع والمسافة المحسوبة
  3. تحديث القيود الخارجية
    - تحسين سلوك الحذف للحفاظ على سلامة البيانات
*/

-- إضافة حقل رسوم التوصيل لكل كيلومتر للمطاعم
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'delivery_fee_per_km'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN delivery_fee_per_km DECIMAL(10, 2) DEFAULT 1.5;
  END IF;
END $$;

-- إضافة حقول الموقع والمسافة للطلبات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_location_lat'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_location_lat DECIMAL(10, 8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_location_lng'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_location_lng DECIMAL(11, 8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'calculated_distance'
  ) THEN
    ALTER TABLE orders ADD COLUMN calculated_distance DECIMAL(10, 2);
  END IF;
END $$;

-- إضافة إعداد رسوم التوصيل لكل كيلومتر
INSERT INTO system_settings (key, value, category, description, is_active) VALUES
('delivery_fee_per_km', '1.5', 'delivery', 'رسوم التوصيل لكل كيلومتر (ريال)', true)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- تحديث القيود الخارجية لحل مشكلة حذف المطاعم
-- إزالة القيود القديمة وإضافة قيود جديدة مع CASCADE

-- للطلبات: تعيين null عند حذف المطعم أو السائق
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_restaurant_id_restaurants_id_fk;
ALTER TABLE orders ADD CONSTRAINT orders_restaurant_id_restaurants_id_fk 
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_driver_id_drivers_id_fk;
ALTER TABLE orders ADD CONSTRAINT orders_driver_id_drivers_id_fk 
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;

-- لعناصر القائمة: حذف تلقائي عند حذف المطعم
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_restaurant_id_restaurants_id_fk;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_restaurant_id_restaurants_id_fk 
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;