import express from "express";
import { storage } from "../storage.js";
import { calculateDeliveryFee } from "../services/deliveryFeeService";
import { formatCurrency } from "../../shared/utils";
import { canOrderFromRestaurant } from "../../utils/restaurantHours";
import { randomUUID } from "crypto";

const router = express.Router();

// إنشاء طلب جديد
router.post("/", async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      customerLocationLat,
      customerLocationLng,
      notes,
      paymentMethod,
      items,
      subtotal,
      deliveryFee: clientDeliveryFee,
      totalAmount,
      restaurantId,
      customerId,
      deliveryPreference,
      scheduledDate,
      scheduledTimeSlot
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!customerName || !customerPhone || !deliveryAddress || !items) {
      return res.status(400).json({ 
        error: "بيانات ناقصة: الاسم، الهاتف، العنوان، والعناصر مطلوبة"
      });
    }

    // التحقق من وجود المطعم (اختياري الآن)
    let restaurant = null;
    if (restaurantId) {
      restaurant = await storage.getRestaurant(restaurantId);
    }
    
    // التحقق من ساعات العمل إذا كان المطعم موجوداً
    if (restaurant) {
      const orderStatus = canOrderFromRestaurant(restaurant);
      if (!orderStatus.canOrder) {
        return res.status(400).json({ 
          error: orderStatus.message || "المطعم مغلق حالياً"
        });
      }
    }

    // حساب رسوم التوصيل والمسافة
    let finalDeliveryFee = parseFloat(clientDeliveryFee || '0');
    let distance = 0;
    
    if (customerLocationLat && customerLocationLng) {
      try {
        const feeResult = await calculateDeliveryFee(
          { lat: parseFloat(customerLocationLat), lng: parseFloat(customerLocationLng) },
          restaurantId,
          parseFloat(subtotal || '0')
        );
        finalDeliveryFee = feeResult.fee;
        distance = feeResult.distance;
      } catch (feeError) {
        console.error("Error calculating delivery fee during order creation:", feeError);
        // Fallback to client fee if service fails
      }
    }

    // إنشاء رقم طلب فريد
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // التأكد من أن العناصر هي JSON string
    let itemsString;
    try {
      itemsString = typeof items === 'string' ? items : JSON.stringify(items);
    } catch (error) {
      return res.status(400).json({ 
        error: "تنسيق العناصر غير صحيح"
      });
    }

    // حساب العمولات
    const subtotalNum = parseFloat(subtotal || '0');
    const deliveryFeeNum = finalDeliveryFee;
    
    let restaurantCommissionAmount = 0;
    let restaurantEarnings = 0;
    
    if (restaurant) {
      const restaurantCommissionRate = parseFloat(restaurant.commissionRate?.toString() || '10'); // افتراضي 10%
      restaurantCommissionAmount = (subtotalNum * restaurantCommissionRate) / 100;
      restaurantEarnings = subtotalNum - restaurantCommissionAmount;
    } else {
      // إذا لم يكن هناك مطعم (متجر رئيسي)، فكل الدخل للمؤسسة
      restaurantEarnings = 0;
      restaurantCommissionAmount = subtotalNum;
    }
    
    // حساب عمولة السائق الأولية (سيتم تحديثها عند التعيين)
    const defaultDriverCommissionRate = 70; // 70% من رسوم التوصيل
    const driverEarnings = (deliveryFeeNum * defaultDriverCommissionRate) / 100;
    const companyEarnings = restaurantCommissionAmount + (deliveryFeeNum - driverEarnings);

    // إنشاء الطلب
    const orderData = {
      orderNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim().replace(/\s+/g, ''),
      customerEmail: customerEmail ? customerEmail.trim() : null,
      customerId: customerId || null,
      deliveryAddress: deliveryAddress.trim(),
      customerLocationLat: customerLocationLat ? String(customerLocationLat) : null,
      customerLocationLng: customerLocationLng ? String(customerLocationLng) : null,
      notes: notes ? notes.trim() : null,
      paymentMethod: paymentMethod || 'cash',
      status: 'pending',
      items: itemsString,
      subtotal: String(subtotalNum),
      deliveryFee: String(deliveryFeeNum),
      distance: String(distance),
      total: String(subtotalNum + deliveryFeeNum),
      totalAmount: String(subtotalNum + deliveryFeeNum),
      driverEarnings: String(driverEarnings),
      restaurantEarnings: String(restaurantEarnings),
      companyEarnings: String(companyEarnings),
      restaurantId: restaurantId || null,
      estimatedTime: restaurant?.deliveryTime || '30-45 دقيقة',
      deliveryPreference: deliveryPreference || 'now',
      scheduledDate: scheduledDate || null,
      scheduledTimeSlot: scheduledTimeSlot || null
    };

    const order = await storage.createOrder(orderData);

    // إنشاء إشعارات للإدارة والمطعم فقط
    // الطلب لا يصل للسائقين إلا بعد تعيينه من الإدارة
    try {
      // إشعار للمطعم (إذا وجد)
      if (restaurantId) {
        await storage.createNotification({
          type: 'new_order',
          title: 'طلب جديد',
          message: `طلب جديد رقم ${orderNumber} من ${customerName}. صافي الربح: ${formatCurrency(restaurantEarnings)}`,
          recipientType: 'restaurant',
          recipientId: restaurantId,
          orderId: order.id,
          isRead: false
        });
      }
      
      // إشعار للإدارة فقط - السائقون سيتلقون إشعار عند تعيينهم للطلب
      await storage.createNotification({
        type: 'new_order_pending_assignment',
        title: 'طلب جديد في انتظار التعيين',
        message: `طلب جديد رقم ${orderNumber} من ${customerName} في انتظار تعيين سائق. الموقع: ${deliveryAddress}`,
        recipientType: 'admin',
        recipientId: null,
        orderId: order.id,
        isRead: false
      });

      // تتبع الطلب
      await storage.createOrderTracking({
        orderId: order.id,
        status: 'pending',
        message: 'تم استلام الطلب وجاري المراجعة',
        createdBy: 'system',
        createdByType: 'system'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        estimatedTime: order.estimatedTime,
        total: order.totalAmount
      }
    });

  } catch (error: any) {
    console.error("خطأ في إنشاء الطلب:", error);
    res.status(500).json({ 
      error: "حدث خطأ في الخادم",
      message: error.message 
    });
  }
});

// جلب الطلبات مع فلترة محسنة
router.get("/", async (req, res) => {
  try {
    const { status, driverId, available, restaurantId } = req.query;
    
    let orders = await storage.getOrders();
    
    // فلترة حسب السائق (طلباتي)
    if (driverId && available !== 'true') {
      orders = orders.filter(order => order.driverId === driverId && 
        ['confirmed', 'preparing', 'ready', 'picked_up', 'on_way'].includes(order.status));
    }
    // فلترة الطلبات المتاحة (المعينة لهذا السائق حصراً ولم يقبلها بعد)
    else if (available === 'true') {
      if (!driverId) {
        // إذا لم يتم توفير معرف السائق، لا نعيد أي طلبات متاحة
        // لأن الطلبات المتاحة يجب أن تكون معينة لسائق محدد
        orders = [];
      } else {
        orders = orders.filter(order => 
          order.status === 'assigned' && order.driverId === driverId
        );
      }
    }
    // فلترة للوحة التحكم (بدون driverId)
    else {
      if (status && status !== 'all') {
        orders = orders.filter(order => order.status === status);
      }
      
      if (restaurantId) {
        orders = orders.filter(order => order.restaurantId === restaurantId);
      }
    }
    
    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(orders);
  } catch (error) {
    console.error('خطأ في جلب الطلبات:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تعيين طلب لسائق
router.put("/:id/assign-driver", async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود الطلب
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // تحرير السائق السابق إذا كان موجوداً
    if (order.driverId && order.driverId !== driverId) {
      try {
        await storage.updateDriver(order.driverId, { isAvailable: true });
        
        // إشعار للسائق السابق بإلغاء التعيين
        await storage.createNotification({
          type: 'order_unassigned',
          title: 'إلغاء تعيين الطلب',
          message: `تم إلغاء تعيينك للطلب رقم ${order.orderNumber} وتحويله لسائق آخر`,
          recipientType: 'driver',
          recipientId: order.driverId,
          orderId: id,
          isRead: false
        });
      } catch (err) {
        console.error('Error freeing up previous driver:', err);
      }
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    if (!driver.isAvailable || !driver.isActive) {
      return res.status(400).json({ error: "السائق غير متاح حالياً" });
    }

    // حساب أرباح السائق بناءً على نسبته الخاصة
    const deliveryFeeNum = parseFloat(order.deliveryFee?.toString() || '0');
    const driverCommissionRate = parseFloat(driver.commissionRate?.toString() || '70');
    const driverEarnings = (deliveryFeeNum * driverCommissionRate) / 100;
    
    // تحديث أرباح الشركة بناءً على عمولة السائق الفعلية
    const restaurantId = order.restaurantId;
    let restaurant = null;
    let restaurantCommissionAmount = 0;
    
    const subtotalNum = parseFloat(order.subtotal?.toString() || '0');
    
    if (restaurantId) {
      restaurant = await storage.getRestaurant(restaurantId);
      const restaurantCommissionRate = parseFloat(restaurant?.commissionRate?.toString() || '10');
      restaurantCommissionAmount = (subtotalNum * restaurantCommissionRate) / 100;
    } else {
      restaurantCommissionAmount = subtotalNum;
    }
    
    const companyEarnings = restaurantCommissionAmount + (deliveryFeeNum - driverEarnings);

    // تحديث الطلب
    const updatedOrder = await storage.updateOrder(id, {
      driverId,
      driverEarnings: String(driverEarnings),
      companyEarnings: String(companyEarnings),
      status: 'assigned', // تعيين الطلب للسائق أولاً
      updatedAt: new Date()
    });

    // Broadcast update via WebSocket
    const ws = req.app.get('ws');
    if (ws) {
      ws.broadcast('order_update', { orderId: id, status: 'assigned' });
      // Also send direct notification to the driver
      if (ws.sendToDriver) {
        ws.sendToDriver(driverId, 'new_order_assigned', { 
          orderId: id, 
          status: 'assigned',
          message: `تم تعيين طلب جديد رقم ${order.orderNumber} لك`
        });
      }
    }

    // لا نقوم بتحديث حالة السائق إلى مشغول إلا بعد استلامه للطلب فعلياً

    // إنشاء إشعارات
    try {
      // إشعار مباشر للسائق المعين
      await storage.createNotification({
        type: 'new_order_assigned',
        title: 'طلب جديد مُعين لك',
        message: `تم تعيينك لتوصيل الطلب رقم ${order.orderNumber} من ${restaurant?.name || 'المتجر الرئيسي'}. يرجى تأكيد الاستلام.`,
        recipientType: 'driver',
        recipientId: driverId,
        orderId: id,
        isRead: false
      });

      // إشعار للإدارة
      await storage.createNotification({
        type: 'order_assigned',
        title: 'تم تعيين سائق',
        message: `تم تعيين السائق ${driver.name} للطلب ${order.orderNumber}`,
        recipientType: 'admin',
        recipientId: null,
        orderId: id,
        isRead: false
      });

      // تتبع الطلب
      await storage.createOrderTracking({
        orderId: id,
        status: 'assigned',
        message: `تم تعيين السائق ${driver.name} وفي انتظار قبول الطلب`,
        createdBy: 'admin',
        createdByType: 'admin'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('خطأ في تعيين السائق:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث حالة الطلب
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updatedBy, updatedByType } = req.body;

    if (!status) {
      return res.status(400).json({ error: "الحالة مطلوبة" });
    }

    // التحقق من وجود الطلب
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // تحديث الطلب
    const updatedOrder = await storage.updateOrder(id, {
      status,
      updatedAt: new Date()
    });

    // Broadcast update via WebSocket
    const ws = req.app.get('ws');
    if (ws) {
      ws.broadcast('order_update', { orderId: id, status });
    }

    // إنشاء رسالة الحالة
    let statusMessage = '';
    switch (status) {
      case 'confirmed':
        statusMessage = 'تم تأكيد الطلب من المطعم';
        break;
      case 'preparing':
        statusMessage = 'جاري تحضير الطلب';
        break;
      case 'ready':
        statusMessage = 'الطلب جاهز للاستلام';
        break;
      case 'picked_up':
        statusMessage = 'تم استلام الطلب من المطعم';
        break;
      case 'on_way':
        statusMessage = 'السائق في الطريق إليك';
        break;
      case 'delivered':
        statusMessage = 'تم تسليم الطلب بنجاح';
        
        // تحرير السائق وتحديث أرباحه وأرباح المطعم
        if (order.driverId) {
          await storage.updateDriver(order.driverId, { isAvailable: true });
          
          // تحديث رصيد السائق في المحفظة
          try {
            const driverEarnings = parseFloat(order.driverEarnings?.toString() || '0');
            if (driverEarnings > 0) {
              const { AdvancedDatabaseStorage } = await import("../db-advanced");
              const advStorage = new AdvancedDatabaseStorage(storage.db);
              
              // التحقق من وجود محفظة للسائق أو إنشاؤها
              let wallet = await advStorage.getDriverWallet(order.driverId);
              if (!wallet) {
                await advStorage.createDriverWallet({
                  driverId: order.driverId,
                  balance: "0",
                  isActive: true
                });
              }
              await advStorage.addDriverWalletBalance(order.driverId, driverEarnings);
              
              // تحديث إجمالي الأرباح في جدول السائقين
              const driver = await storage.getDriver(order.driverId);
              const currentEarnings = parseFloat(driver?.earnings?.toString() || '0');
              const currentCompletedOrders = driver?.completedOrders || 0;
              await storage.updateDriver(order.driverId, {
                earnings: String(currentEarnings + driverEarnings),
                completedOrders: currentCompletedOrders + 1
              });
            }
          } catch (e) {
            console.error('Error updating driver earnings:', e);
          }
        }

        // تحديث أرباح المطعم
        if (order.restaurantId) {
          try {
            const restaurantEarnings = parseFloat(order.restaurantEarnings?.toString() || '0');
            if (restaurantEarnings > 0) {
              const { AdvancedDatabaseStorage } = await import("../db-advanced");
              const advStorage = new AdvancedDatabaseStorage(storage.db);
              
              let rWallet = await advStorage.getRestaurantWallet(order.restaurantId);
              if (!rWallet) {
                await advStorage.createRestaurantWallet({
                  restaurantId: order.restaurantId,
                  balance: "0",
                  isActive: true
                });
              }
              
              const currentBalance = parseFloat(rWallet?.balance?.toString() || "0");
              await advStorage.updateRestaurantWallet(order.restaurantId, {
                balance: String(currentBalance + restaurantEarnings)
              });
            }
          } catch (e) {
            console.error('Error updating restaurant earnings:', e);
          }
        }
        break;
      case 'cancelled':
        statusMessage = 'تم إلغاء الطلب';
        // تحرير السائق إذا كان مُعيَّناً
        if (order.driverId) {
          await storage.updateDriver(order.driverId, { isAvailable: true });
        }
        break;
      default:
        statusMessage = `تم تحديث حالة الطلب إلى ${status}`;
    }

    // إنشاء إشعارات وتتبع
    try {
      // إشعار للعميل
      await storage.createNotification({
        type: 'order_status_update',
        title: 'تحديث حالة الطلب',
        message: `طلبك رقم ${order.orderNumber}: ${statusMessage}`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId: id,
        isRead: false
      });

      // إشعار للإدارة
      await storage.createNotification({
        type: 'order_status_update',
        title: 'تحديث حالة الطلب',
        message: `الطلب ${order.orderNumber}: ${statusMessage}`,
        recipientType: 'admin',
        recipientId: null,
        orderId: id,
        isRead: false
      });

      // تتبع الطلب
      await storage.createOrderTracking({
        orderId: id,
        status,
        message: statusMessage,
        createdBy: updatedBy || 'system',
        createdByType: updatedByType || 'system'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("خطأ في تحديث حالة الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب الطلبات حسب العميل
router.get("/customer/:phone", async (req, res) => {
  try {
    const phone = req.params.phone.trim().replace(/\s+/g, '');
    
    if (!phone) {
      return res.status(400).json({ 
        error: "رقم الهاتف مطلوب"
      });
    }
    
    const customerOrders = await storage.getOrdersByCustomer(phone);
    
    res.json(customerOrders);
  } catch (error) {
    console.error("خطأ في جلب طلبات العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب تفاصيل تتبع الطلب
router.get("/:orderId/track", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // جلب بيانات السائق إذا كانت موجودة
    let driverInfo = null;
    if (order.driverId) {
      const driver = await storage.getDriver(order.driverId);
      if (driver) {
        driverInfo = {
          name: driver.name,
          phone: driver.phone
        };
      }
    }

    // جلب سجل تتبع الطلب
    const trackingHistory = await storage.getOrderTracking(orderId);
    
    // تنسيق البيانات لتتوافق مع واجهة التتبع
    const formattedOrder = {
      ...order,
      driverName: driverInfo?.name,
      driverPhone: driverInfo?.phone,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    };

    const formattedTracking = trackingHistory.map(t => ({
      id: t.id,
      status: t.status,
      timestamp: t.createdAt,
      description: t.message
    }));

    res.json({
      order: formattedOrder,
      tracking: formattedTracking
    });
  } catch (error) {
    console.error("خطأ في جلب بيانات تتبع الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب تفاصيل طلب محدد
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await storage.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }
    
    res.json(order);
  } catch (error) {
    console.error("خطأ في جلب تفاصيل الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إلغاء الطلب
router.patch("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, cancelledBy } = req.body;

    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    await storage.updateOrder(orderId, { status: 'cancelled' });

    // تحرير السائق إذا كان مُعيَّناً
    if (order.driverId) {
      await storage.updateDriver(order.driverId, { isAvailable: true });
    }

    // إنشاء إشعارات
    try {
      await storage.createNotification({
        type: 'order_cancelled',
        title: 'تم إلغاء الطلب',
        message: `تم إلغاء طلبك رقم ${order.orderNumber}${reason ? ': ' + reason : ''}`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId,
        isRead: false
      });

      await storage.createOrderTracking({
        orderId,
        status: 'cancelled',
        message: reason || 'تم إلغاء الطلب',
        createdBy: cancelledBy || 'system',
        createdByType: 'system'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error("خطأ في إلغاء الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Helper function
function formatCurrency(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${num.toLocaleString('ar-YE')} ر.ي`;
}

export default router;