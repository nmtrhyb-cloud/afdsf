/**
 * خدمة حساب رسوم التوصيل - متجر طمطوم
 * Delivery Fee Calculation Service - Tam Tom Store
 * 
 * تدعم طرق متعددة لحساب رسوم التوصيل:
 * 1. رسوم ثابتة (fixed)
 * 2. حسب المسافة (per_km)
 * 3. حسب المناطق (zone_based)
 */

import { storage } from "../storage";

const DEFAULT_BASE_FEE = 500;
const DEFAULT_PER_KM_FEE = 100;
const DEFAULT_MIN_FEE = 300;
const DEFAULT_MAX_FEE = 5000;
const EARTH_RADIUS_KM = 6371;

export interface DeliveryLocation {
  lat: number;
  lng: number;
}

export interface DeliveryFeeResult {
  fee: number;
  distance: number;
  estimatedTime: string;
  feeBreakdown: {
    baseFee: number;
    distanceFee: number;
    totalBeforeLimit: number;
  };
  isFreeDelivery: boolean;
  freeDeliveryReason?: string;
  appliedRuleId?: string;
  appliedDiscountId?: string;
}

export interface DeliveryFeeSettings {
  type: 'fixed' | 'per_km' | 'zone_based' | 'restaurant_custom';
  baseFee: number;
  perKmFee: number;
  minFee: number;
  maxFee: number;
  freeDeliveryThreshold: number;
  storeLat?: number;
  storeLng?: number;
}

export function calculateDistance(
  point1: DeliveryLocation,
  point2: DeliveryLocation
): number {
  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function isPointInPolygon(point: DeliveryLocation, polygon: DeliveryLocation[]): boolean {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = point.lat, yi = point.lng;
    const x1 = polygon[i].lat, y1 = polygon[i].lng;
    const x2 = polygon[j].lat, y2 = polygon[j].lng;
    const intersect = ((y1 > yi) !== (y2 > yi)) &&
      (xi < (x2 - x1) * (yi - y1) / (y2 - y1) + x1);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

export function estimateDeliveryTime(distanceKm: number): string {
  const avgSpeedKmH = 30;
  const prepTimeMinutes = 15;
  const travelTimeMinutes = (distanceKm / avgSpeedKmH) * 60;
  const totalTimeMinutes = Math.ceil(prepTimeMinutes + travelTimeMinutes);
  const minTime = totalTimeMinutes;
  const maxTime = Math.ceil(totalTimeMinutes * 1.3);

  if (maxTime <= 60) return `${minTime}-${maxTime} دقيقة`;
  const minHours = Math.floor(minTime / 60);
  const maxHours = Math.ceil(maxTime / 60);
  if (minHours === maxHours) return `حوالي ${minHours} ساعة`;
  return `${minHours}-${maxHours} ساعة`;
}

async function getDeliveryFeeSettings(): Promise<DeliveryFeeSettings> {
  try {
    const globalSettings = await storage.getDeliveryFeeSettings();
    if (globalSettings && globalSettings.type) {
      return {
        type: globalSettings.type as DeliveryFeeSettings['type'],
        baseFee: Math.max(0, parseFloat(globalSettings.baseFee || '0')),
        perKmFee: Math.max(0, parseFloat(globalSettings.perKmFee || '0')),
        minFee: Math.max(0, parseFloat(globalSettings.minFee || '0')),
        maxFee: Math.max(0, parseFloat(globalSettings.maxFee || DEFAULT_MAX_FEE.toString())),
        freeDeliveryThreshold: Math.max(0, parseFloat(globalSettings.freeDeliveryThreshold || '0')),
        storeLat: globalSettings.storeLat ? parseFloat(String(globalSettings.storeLat)) : undefined,
        storeLng: globalSettings.storeLng ? parseFloat(String(globalSettings.storeLng)) : undefined,
      };
    }
  } catch (error) {
    console.error('Error fetching delivery fee settings:', error);
  }

  return {
    type: 'per_km',
    baseFee: DEFAULT_BASE_FEE,
    perKmFee: DEFAULT_PER_KM_FEE,
    minFee: DEFAULT_MIN_FEE,
    maxFee: DEFAULT_MAX_FEE,
    freeDeliveryThreshold: 0
  };
}

/**
 * حساب رسوم التوصيل الكاملة لمتجر طمطوم
 */
export async function calculateDeliveryFee(
  customerLocation: DeliveryLocation,
  restaurantId: string | null,
  orderSubtotal: number
): Promise<DeliveryFeeResult> {
  const [geoZones, deliveryRules, discounts, deliverySettings, restaurant, allRestaurants] = await Promise.all([
    storage.getGeoZones(),
    storage.getDeliveryRules(),
    storage.getDeliveryDiscounts(),
    getDeliveryFeeSettings(),
    restaurantId ? storage.getRestaurant(restaurantId) : Promise.resolve(null),
    storage.getRestaurants(),
  ]);

  const activeGeoZones = geoZones.filter(z => z.isActive);
  const activeRules = deliveryRules.filter(r => r.isActive);
  const activeDiscounts = discounts.filter(d => d.isActive);

  // موقع متجر طمطوم: يأتي بالترتيب:
  // 1. من إعدادات رسوم التوصيل (store_lat/store_lng)
  // 2. من المطعم المحدد
  // 3. من أول مطعم في قاعدة البيانات (المتجر الرئيسي)
  let storeLocation: DeliveryLocation = { lat: 0, lng: 0 };

  if (deliverySettings.storeLat && deliverySettings.storeLng) {
    storeLocation = { lat: deliverySettings.storeLat, lng: deliverySettings.storeLng };
  } else if (restaurant && restaurant.latitude && restaurant.longitude) {
    storeLocation = {
      lat: parseFloat(restaurant.latitude as string),
      lng: parseFloat(restaurant.longitude as string),
    };
  } else if (allRestaurants && allRestaurants.length > 0) {
    const firstStore = allRestaurants.find(r => r.latitude && r.longitude);
    if (firstStore && firstStore.latitude && firstStore.longitude) {
      storeLocation = {
        lat: parseFloat(firstStore.latitude as string),
        lng: parseFloat(firstStore.longitude as string),
      };
    }
  }

  const distance = storeLocation.lat !== 0 ? calculateDistance(customerLocation, storeLocation) : 0;
  const estimatedTime = estimateDeliveryTime(distance);

  // تحديد المنطقة الجغرافية
  let matchingGeoZoneId: string | null = null;
  for (const zone of activeGeoZones) {
    try {
      const polygon = JSON.parse(zone.coordinates);
      if (isPointInPolygon(customerLocation, polygon)) {
        matchingGeoZoneId = zone.id;
        break;
      }
    } catch (e) {
      console.error(`Error parsing coordinates for zone ${zone.name}`, e);
    }
  }

  // تطبيق القواعد الديناميكية
  let appliedFee: number | null = null;
  let appliedRuleId: string | undefined;

  for (const rule of activeRules) {
    let matches = false;
    if (rule.ruleType === 'zone' && rule.geoZoneId === matchingGeoZoneId) {
      matches = true;
    } else if (rule.ruleType === 'distance') {
      const minD = rule.minDistance ? parseFloat(rule.minDistance) : 0;
      const maxD = rule.maxDistance ? parseFloat(rule.maxDistance) : Infinity;
      if (distance >= minD && distance <= maxD) matches = true;
    } else if (rule.ruleType === 'order_value') {
      const minV = rule.minOrderValue ? parseFloat(rule.minOrderValue) : 0;
      const maxV = rule.maxOrderValue ? parseFloat(rule.maxOrderValue) : Infinity;
      if (orderSubtotal >= minV && orderSubtotal <= maxV) matches = true;
    }

    if (matches) {
      appliedFee = parseFloat(rule.fee);
      appliedRuleId = rule.id;
      break;
    }
  }

  if (appliedFee === null) {
    switch (deliverySettings.type) {
      case 'fixed':
        appliedFee = deliverySettings.baseFee;
        break;
      case 'zone_based':
        appliedFee = await getZoneBasedFee(distance);
        break;
      case 'per_km':
      default:
        appliedFee = deliverySettings.baseFee + (distance * deliverySettings.perKmFee);
        break;
    }
  }

  let isFreeDelivery = false;
  let freeDeliveryReason: string | undefined;
  let appliedDiscountId: string | undefined;

  if (deliverySettings.freeDeliveryThreshold > 0 && orderSubtotal >= deliverySettings.freeDeliveryThreshold) {
    isFreeDelivery = true;
    freeDeliveryReason = `توصيل مجاني للطلبات فوق ${deliverySettings.freeDeliveryThreshold} ريال`;
    appliedFee = 0;
  } else {
    const now = new Date();
    for (const discount of activeDiscounts) {
      if (discount.validFrom && new Date(discount.validFrom) > now) continue;
      if (discount.validUntil && new Date(discount.validUntil) < now) continue;
      if (discount.minOrderValue && orderSubtotal < parseFloat(discount.minOrderValue)) continue;

      appliedDiscountId = discount.id;
      if (discount.discountType === 'percentage') {
        const discountAmount = appliedFee * (parseFloat(discount.discountValue) / 100);
        appliedFee -= discountAmount;
        if (parseFloat(discount.discountValue) === 100) {
          isFreeDelivery = true;
          freeDeliveryReason = `خصم توصيل مجاني: ${discount.name}`;
        }
      } else {
        appliedFee -= parseFloat(discount.discountValue);
        if (appliedFee <= 0) {
          appliedFee = 0;
          isFreeDelivery = true;
          freeDeliveryReason = `توصيل مجاني: ${discount.name}`;
        }
      }
      break;
    }
  }

  appliedFee = Math.max(0, Math.min(deliverySettings.maxFee, appliedFee));
  appliedFee = Math.round(appliedFee * 100) / 100;

  return {
    fee: appliedFee,
    distance,
    estimatedTime,
    feeBreakdown: {
      baseFee: appliedFee === 0 && isFreeDelivery ? 0 : appliedFee,
      distanceFee: 0,
      totalBeforeLimit: appliedFee
    },
    isFreeDelivery,
    freeDeliveryReason,
    appliedRuleId,
    appliedDiscountId
  };
}

async function getZoneBasedFee(distance: number): Promise<number> {
  try {
    const zones = await storage.getDeliveryZones();
    if (zones && zones.length > 0) {
      const matchingZone = zones.find(zone =>
        distance >= parseFloat(zone.minDistance || '0') &&
        distance <= parseFloat(zone.maxDistance || '999')
      );
      if (matchingZone) return parseFloat(matchingZone.deliveryFee || String(DEFAULT_BASE_FEE));
    }
  } catch (error) {
    console.error('Error fetching delivery zones:', error);
  }
  return DEFAULT_BASE_FEE + (distance * DEFAULT_PER_KM_FEE);
}

export function calculateQuickDeliveryFee(
  distanceKm: number,
  baseFee: number = DEFAULT_BASE_FEE,
  perKmFee: number = DEFAULT_PER_KM_FEE
): number {
  const fee = baseFee + (distanceKm * perKmFee);
  return Math.round(Math.max(DEFAULT_MIN_FEE, Math.min(DEFAULT_MAX_FEE, fee)) * 100) / 100;
}

export default {
  calculateDistance,
  calculateDeliveryFee,
  calculateQuickDeliveryFee,
  estimateDeliveryTime
};
