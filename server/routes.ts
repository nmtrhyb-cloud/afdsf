import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { dbStorage } from "./db";
import { log } from "./viteServer";
import authRoutes from "./routes/auth";
import { customerRoutes } from "./routes/customer";
import driverRoutes from "./routes/driver";
import ordersRoutes from "./routes/orders";
import deliveryFeeRoutes from "./routes/delivery-fees";
import { adminRoutes } from "./routes/admin";
import { registerAdvancedRoutes } from "./routes/advanced";
import { publicRoutes } from "./routes/public";
import { 
  insertRestaurantSchema, 
  insertMenuItemSchema, 
  insertOrderSchema, 
  insertDriverSchema, 
  insertCategorySchema, 
  insertSpecialOfferSchema,
  insertUiSettingsSchema,
  insertRestaurantSectionSchema,
  insertRatingSchema,
  insertNotificationSchema,
  insertWalletSchema,
  insertWalletTransactionSchema,
  insertSystemSettingsSchema,
  insertRestaurantEarningsSchema,
  insertUserSchema,
  insertCartSchema,
  insertFavoritesSchema,
  orders
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {

  // Auth Routes
  app.use("/api/auth", authRoutes);

  // Admin and Advanced Routes
  app.use("/api/admin", adminRoutes);
  registerAdvancedRoutes(app);

  // Users
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب بيانات المستخدم" });
    }
  });

  app.get("/api/users/username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب بيانات المستخدم" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "بيانات المستخدم غير صحيحة" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, validatedData);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "بيانات المستخدم غير صحيحة" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Category write operations are only available through /api/admin/categories

  // Enhanced Restaurants with filtering - مطاعم محسنة مع التصفية
  app.get("/api/restaurants", async (req, res) => {
    try {
      const { 
        categoryId, 
        lat, 
        lon, 
        sortBy, 
        isFeatured, 
        isNew, 
        search, 
        radius, 
        isOpen 
      } = req.query;
      
      const filters = {
        categoryId: categoryId as string,
        userLatitude: lat ? parseFloat(lat as string) : undefined,
        userLongitude: lon ? parseFloat(lon as string) : undefined,
        sortBy: sortBy as 'name' | 'rating' | 'deliveryTime' | 'distance' | 'newest',
        isFeatured: isFeatured === 'true',
        isNew: isNew === 'true',
        search: search as string,
        radius: radius ? parseFloat(radius as string) : undefined,
        isOpen: isOpen !== undefined ? isOpen === 'true' : undefined
      };
      
      const restaurants = await storage.getRestaurants(filters);
      res.json(restaurants);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  // Restaurant write operations are only available through /api/admin/restaurants

  // Menu Items
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllMenuItems();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getAllMenuItems();
      const featured = products.filter(p => p.isFeatured);
      res.json(featured.length > 0 ? featured : products.slice(0, 12));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getMenuItem(id);
      if (!item) {
        return res.status(404).json({ message: "المنتج غير موجود" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب بيانات المنتج" });
    }
  });

  app.get("/api/restaurants/:restaurantId/menu", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const menuItems = await storage.getMenuItems(restaurantId);
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  // Menu item write operations are only available through /api/admin/menu-items

  // Orders routes are now handled by the dedicated orders router in routes/orders.ts at the bottom
  // Drivers routes are now handled by the dedicated driver router in routes/driver.ts at the bottom

  // Special Offers
  app.get("/api/special-offers", async (req, res) => {
    try {
      log("🔍 Storage type: " + storage.constructor.name);
      
      // Disable caching to see changes
      res.set('Cache-Control', 'no-store');
      
      const { active } = req.query;
      let offers;
      
      // Default to active offers for homepage
      if (active === 'false') {
        offers = await storage.getSpecialOffers();
      } else {
        offers = await storage.getActiveSpecialOffers();
      }
      
      log("📊 Found offers: " + offers.length + " offers");
      res.json(offers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("خطأ في جلب العروض الخاصة: " + errorMessage);
      res.status(500).json({ message: "Failed to fetch special offers" });
    }
  });

  // Special offer write operations are only available through /api/admin/special-offers

  // Favorites Routes
  app.get("/api/favorites/restaurants/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const favorites = await storage.getFavoriteRestaurants(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorite restaurants" });
    }
  });

  app.get("/api/favorites/products/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const favorites = await storage.getFavoriteProducts(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorite products" });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const validatedData = insertFavoritesSchema.parse(req.body);
      const favorite = await storage.addToFavorites(validatedData);
      res.status(201).json(favorite);
    } catch (error) {
      res.status(400).json({ message: "Invalid favorite data" });
    }
  });

  app.delete("/api/favorites", async (req, res) => {
    try {
      const { userId, restaurantId, menuItemId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const success = await storage.removeFromFavorites(userId as string, restaurantId as string, menuItemId as string);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Favorite not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get("/api/favorites/check", async (req, res) => {
    try {
      const { userId, restaurantId, menuItemId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      let isFavorite = false;
      if (restaurantId) {
        isFavorite = await storage.isRestaurantFavorite(userId as string, restaurantId as string);
      } else if (menuItemId) {
        isFavorite = await storage.isProductFavorite(userId as string, menuItemId as string);
      }
      
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Failed to check favorite" });
    }
  });

  // UI Settings Routes
  app.get("/api/ui-settings", async (req, res) => {
    try {
      const settings = await storage.getUiSettings();
      res.json(settings);
    } catch (error) {
      console.error('خطأ في جلب إعدادات الواجهة:', error);
      res.status(500).json({ message: "Failed to fetch UI settings" });
    }
  });

  app.get("/api/ui-settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getUiSetting(key);
      if (!setting) {
        return res.status(404).json({ message: "الإعداد غير موجود" });
      }
      res.json(setting);
    } catch (error) {
      console.error('خطأ في جلب إعداد الواجهة:', error);
      res.status(500).json({ message: "Failed to fetch UI setting" });
    }
  });

  app.put("/api/ui-settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "قيمة الإعداد مطلوبة" });
      }

      const updated = await storage.updateUiSetting(key, value);
      if (!updated) {
        return res.status(404).json({ message: "الإعداد غير موجود" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('خطأ في تحديث إعداد الواجهة:', error);
      res.status(500).json({ message: "Failed to update UI setting" });
    }
  });

  // Order Tracking Route
  app.get("/api/orders/:id/track", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Create tracking data based on order status
      const tracking = [];
      const baseTime = new Date(order.createdAt);
      
      if (order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing' || 
          order.status === 'on_way' || order.status === 'delivered') {
        tracking.push({
          id: '1',
          status: 'pending',
          message: 'تم استلام الطلب',
          timestamp: baseTime,
          createdByType: 'system'
        });
      }
      
      if (order.status === 'confirmed' || order.status === 'preparing' || order.status === 'on_way' || order.status === 'delivered') {
        tracking.push({
          id: '2',
          status: 'confirmed',
          message: 'تم تأكيد الطلب من المطعم',
          timestamp: new Date(baseTime.getTime() + 5 * 60000),
          createdByType: 'restaurant'
        });
      }
      
      if (order.status === 'preparing' || order.status === 'on_way' || order.status === 'delivered') {
        tracking.push({
          id: '3',
          status: 'preparing',
          message: 'جاري تحضير الطلب',
          timestamp: new Date(baseTime.getTime() + 10 * 60000),
          createdByType: 'restaurant'
        });
      }
      
      if (order.status === 'on_way' || order.status === 'delivered') {
        tracking.push({
          id: '4',
          status: 'on_way',
          message: 'الطلب في الطريق إليك',
          timestamp: new Date(baseTime.getTime() + 20 * 60000),
          createdByType: 'driver'
        });
      }
      
      if (order.status === 'delivered') {
        tracking.push({
          id: '5',
          status: 'delivered',
          message: 'تم تسليم الطلب بنجاح',
          timestamp: new Date(baseTime.getTime() + 35 * 60000),
          createdByType: 'driver'
        });
      }
      
      // Parse items if they're stored as JSON string
      let parsedItems = [];
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch (e) {
        parsedItems = [];
      }

      res.json({
        order: {
          ...order,
          items: parsedItems,
          total: parseFloat(order.total || '0')
        },
        tracking
      });
    } catch (error) {
      console.error("خطأ في تتبع الطلب:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Driver-specific order endpoints are handled in routes/orders.ts

  app.get("/api/drivers/:id/orders", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.query;
      
      // Get all orders and filter by driver
      const allOrders = await storage.getOrders();
      let driverOrders = allOrders.filter(order => order.driverId === id);
      
      if (status) {
        driverOrders = driverOrders.filter(order => order.status === status);
      }
      
      // Sort by creation date (newest first)
      driverOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(driverOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch driver orders" });
    }
  });

  app.put("/api/drivers/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, latitude, longitude } = req.body;
      
      const driver = await storage.updateDriver(id, {
        isAvailable: status === 'available',
        currentLocation: latitude && longitude ? `${latitude},${longitude}` : undefined,
      });
      
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      res.json(driver);
    } catch (error) {
      res.status(400).json({ message: "Failed to update driver status" });
    }
  });

  // Driver dashboard routes

  app.get("/api/drivers/:id/stats", async (req, res) => {
    try {
      const { id } = req.params;
      const { period = 'today' } = req.query;
      
      // Validate UUID format (supports both with and without hyphens)
      const uuidRe = /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/i;
      if (!id || id.length < 8 || !uuidRe.test(id.replace(/-/g, ''))) {
        return res.status(400).json({ message: "Invalid driver id format" });
      }
      
      // Check if driver exists
      const driver = await storage.getDriver(id);
      if (!driver) {
        // Return zero stats for non-existent driver to keep client stable
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        return res.json({
          totalOrders: 0,
          totalEarnings: 0,
          avgOrderValue: 0,
          period,
          startDate,
          endDate: new Date()
        });
      }
      
      let startDate: Date;
      const endDate = new Date();
      
      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }
      
      // Get all orders and filter by driver and status
      const allOrders = await storage.getOrders();
      const driverOrders = allOrders.filter(order => 
        order.driverId === id && 
        order.status === 'delivered' &&
        new Date(order.createdAt) >= startDate &&
        new Date(order.createdAt) <= endDate
      );
      
      const totalEarnings = driverOrders.reduce((sum: number, order: any) => {
        // Prefer driverEarnings for driver-specific calculations
        const amount = order.driverEarnings ?? order.totalAmount ?? order.total ?? 0;
        return sum + parseFloat(amount.toString() || '0');
      }, 0);
      
      const stats = {
        totalOrders: driverOrders.length,
        totalEarnings,
        avgOrderValue: driverOrders.length > 0 ? totalEarnings / driverOrders.length : 0,
        period,
        startDate,
        endDate
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch driver stats" });
    }
  });

  // Available orders for drivers are handled in routes/orders.ts

  // ================= RESTAURANT SECTIONS API - DISABLED =================
  // Restaurant sections functionality temporarily disabled - would require additional database methods

  // ================= RATINGS & REVIEWS API - DISABLED =================
  // Ratings functionality temporarily disabled - would require additional database methods

  // ================= NOTIFICATIONS API =================
/*
app.get("/api/notifications", async (req, res) => {
  try {
    const { recipientType, recipientId, unread } = req.query;
    const notifications = await storage.getNotifications(
      recipientType as string, 
      recipientId as string, 
      unread === 'true'
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});
*/

  app.post("/api/notifications", async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      res.status(400).json({ message: "Invalid notification data" });
    }
  });

  // Mark notification as read endpoint temporarily disabled - requires additional database method
  /*
  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: "Failed to update notification" });
    }
  });
  */

  // ================= WALLET & PAYMENTS API - DISABLED =================
  // Wallet functionality temporarily disabled - would require additional database methods

  // ================= SYSTEM SETTINGS API - DISABLED =================
  // System settings functionality temporarily disabled - would require additional database methods

  // ================= RESTAURANT EARNINGS API - DISABLED =================
  // Restaurant earnings functionality temporarily disabled - would require additional database methods

  // ================= ANALYTICS & REPORTS API - DISABLED =================
  // Analytics functionality temporarily disabled - would require additional database methods

  // ================= ADVANCED ORDER MANAGEMENT =================
  app.put("/api/orders/:id/assign-driver", async (req, res) => {
    try {
      const { id } = req.params;
      const { driverId } = req.body;
      
      // Update order with driver
      const order = await storage.updateOrder(id, { 
        driverId,
        status: 'assigned',
        updatedAt: new Date()
      });
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Create notification for driver
      await storage.createNotification({
        type: 'order',
        title: 'طلب جديد',
        message: `تم تكليفك بطلب جديد رقم ${id.slice(0, 8)}`,
        recipientType: 'driver',
        recipientId: driverId,
        orderId: id
      });
      
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign driver" });
    }
  });

  app.get("/api/orders/track/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      let driverLocation = null;
      if (order.driverId) {
        const driver = await storage.getDriver(order.driverId);
        if (driver) {
          driverLocation = driver.currentLocation;
        }
      }
      
      res.json({
        ...order,
        driverLocation
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to track order" });
    }
  });

  // Enhanced Search Routes - مسارات البحث المحسنة
  app.get("/api/search", async (req, res) => {
    try {
      const { 
        q: query, 
        category, 
        lat, 
        lon,
        sortBy,
        isFeatured,
        isNew,
        radius,
        type
      } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const userLocation = (lat && lon) ? { lat: parseFloat(lat as string), lon: parseFloat(lon as string) } : undefined;
      
      const results: any = {};
      
      if (!type || type === 'restaurants') {
        const filters = {
          search: query as string,
          categoryId: category as string,
          sortBy: sortBy as 'name' | 'rating' | 'deliveryTime' | 'distance' | 'newest',
          isFeatured: isFeatured === 'true',
          isNew: isNew === 'true',
          userLatitude: userLocation?.lat,
          userLongitude: userLocation?.lon,
          radius: radius ? parseFloat(radius as string) : undefined
        };
        results.restaurants = await storage.getRestaurants(filters);
      }
      
      if (!type || type === 'categories') {
        results.categories = await storage.searchCategories(query as string);
      }
      
      if (!type || type === 'menu-items') {
        results.menuItems = await storage.searchMenuItemsAdvanced(query as string);
      }
      
      const total = (results.restaurants?.length || 0) + 
                   (results.categories?.length || 0) + 
                   (results.menuItems?.length || 0);

      res.json({ ...results, total });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Cart endpoints - مسارات السلة
  app.get("/api/cart/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ message: 'Failed to fetch cart items' });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const validatedData = insertCartSchema.parse(req.body);
      const newItem = await storage.addToCart(validatedData);
      res.status(201).json(newItem);
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ message: 'Failed to add item to cart' });
    }
  });

  app.put("/api/cart/:cartId", async (req, res) => {
    try {
      const { cartId } = req.params;
      const { quantity } = req.body;
      
      if (quantity <= 0) {
        await storage.removeFromCart(cartId);
        res.json({ message: 'Item removed from cart' });
      } else {
        const updatedItem = await storage.updateCartItem(cartId, quantity);
        res.json(updatedItem);
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      res.status(500).json({ message: 'Failed to update cart item' });
    }
  });

  app.delete("/api/cart/:cartId", async (req, res) => {
    try {
      const { cartId } = req.params;
      const success = await storage.removeFromCart(cartId);
      
      if (success) {
        res.json({ message: 'Item removed from cart' });
      } else {
        res.status(404).json({ message: 'Cart item not found' });
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ message: 'Failed to remove item from cart' });
    }
  });

  app.delete("/api/cart/clear/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const success = await storage.clearCart(userId);
      
      if (success) {
        res.json({ message: 'Cart cleared successfully' });
      } else {
        res.status(404).json({ message: 'No cart items found for user' });
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ message: 'Failed to clear cart' });
    }
  });

  // Favorites endpoints - مسارات المفضلة
  app.get("/api/favorites/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const favorites = await storage.getFavoriteRestaurants(userId);
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ message: 'Failed to fetch favorite restaurants' });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const validatedData = insertFavoritesSchema.parse(req.body);
      const newFavorite = await storage.addToFavorites(validatedData);
      res.status(201).json(newFavorite);
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({ message: 'Failed to add restaurant to favorites' });
    }
  });

  app.delete("/api/favorites/:userId/:restaurantId", async (req, res) => {
    try {
      const { userId, restaurantId } = req.params;
      const success = await storage.removeFromFavorites(userId, restaurantId);
      
      if (success) {
        res.json({ message: 'Restaurant removed from favorites' });
      } else {
        res.status(404).json({ message: 'Favorite not found' });
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({ message: 'Failed to remove restaurant from favorites' });
    }
  });

  app.get("/api/favorites/check/:userId/:restaurantId", async (req, res) => {
    try {
      const { userId, restaurantId } = req.params;
      const isFavorite = await storage.isRestaurantFavorite(userId, restaurantId);
      res.json({ isFavorite });
    } catch (error) {
      console.error('Error checking favorite status:', error);
      res.status(500).json({ message: 'Failed to check favorite status' });
    }
  });

  // تم حذف مسارات المصادقة - لا حاجة لها
  
  // Register auth routes
  app.use("/api/auth", authRoutes);
  
  // Register admin routes
  app.use("/api/admin", adminRoutes);
  
  // Register customer routes
  app.use("/api/customer", customerRoutes);
  
  // Register driver routes (plural for consistency)
  app.use("/api/drivers", driverRoutes);
  
  // Register orders routes
  app.use("/api/orders", ordersRoutes);

  // Register delivery fee routes
  app.use("/api/delivery-fees", deliveryFeeRoutes);

  // Register public routes (including Flutter API)
  app.use("/api", publicRoutes);

  // Enhanced notifications endpoint
  app.get("/api/notifications", async (req, res) => {
    try {
      const { recipientType, recipientId, unread } = req.query;
      const notifications = await storage.getNotifications(
        recipientType as string, 
        recipientId as string, 
        unread === 'true'
      );
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;

      if (storage.constructor.name === "MemStorage") {
        const notifications = await storage.getNotifications();
        const notification = notifications.find((n: any) => n.id === id);
        if (notification) {
          (notification as any).isRead = true;
          res.json(notification);
        } else {
          res.status(404).json({ message: "Notification not found" });
        }
      } else {
        const notification = await (storage as any).markNotificationAsRead(id);
        if (!notification) {
          return res.status(404).json({ message: "Notification not found" });
        }
        res.json(notification);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  app.put("/api/notifications/customer/mark-all-read", async (req, res) => {
    try {
      const { phone, customerId } = req.body;
      if (!phone && !customerId) {
        return res.status(400).json({ message: "phone or customerId required" });
      }

      const all = await storage.getNotifications();
      const target =
        all.filter((n: any) => {
          if (n.recipientType !== "customer") return false;
          if (customerId && n.recipientId === customerId) return true;
          if (phone && n.recipientId === phone) return true;
          return false;
        }) || [];

      if ((storage as any).markNotificationAsRead) {
        await Promise.all(target.map((n: any) => (storage as any).markNotificationAsRead(n.id)));
      } else {
        for (const n of target) {
          (n as any).isRead = true;
        }
      }

      res.json({ success: true, updated: target.length });
    } catch (error) {
      console.error("Error marking all read:", error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  app.get("/api/notifications/customer", async (req, res) => {
    try {
      const { phone, customerId } = req.query;
      const notifications = await storage.getNotifications("customer", (customerId as string) || (phone as string));
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching customer notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await (storage as any).deleteNotification?.(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Public Payment Methods Route
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const methods = await (storage as any).getActivePaymentMethods();
      const methodsWithDocs = await Promise.all(methods.map(async (m: any) => {
        const docs = await (storage as any).getPaymentMethodDocuments(m.id);
        return { ...m, documents: docs };
      }));
      res.json(methodsWithDocs);
    } catch (error) {
      console.error("خطأ في جلب طرق الدفع:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Coupon Validation Route
  app.post("/api/coupons/validate", async (req, res) => {
    try {
      const { code, orderValue, userId, userPhone } = req.body;
      if (!code) return res.status(400).json({ error: "كود الكوبون مطلوب" });
      if (!orderValue) return res.status(400).json({ error: "قيمة الطلب مطلوبة" });
      const result = await (storage as any).validateCoupon(code, parseFloat(orderValue), userId, userPhone);
      res.json(result);
    } catch (error) {
      console.error("خطأ في التحقق من الكوبون:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
