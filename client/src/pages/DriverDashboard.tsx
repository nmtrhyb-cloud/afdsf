import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Truck, 
  MapPin, 
  Clock, 
  DollarSign, 
  LogOut,
  Navigation,
  Phone,
  CheckCircle,
  XCircle,
  Package,
  Settings,
  TrendingUp,
  Activity,
  Map,
  Bell,
  User,
  Calendar,
  Target
} from 'lucide-react';
import type { Order, Driver } from '@shared/schema';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [driverStatus, setDriverStatus] = useState<'available' | 'busy' | 'offline'>('available');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // الحصول على معرف السائق من localStorage
  const [driverId, setDriverId] = useState<string>('');
  
  useEffect(() => {
    const driverUser = localStorage.getItem('driver_user');
    if (driverUser) {
      try {
        const userData = JSON.parse(driverUser);
        setDriverId(userData.id);
      } catch (error) {
        console.error('خطأ في تحليل بيانات السائق:', error);
        onLogout();
      }
    } else {
      onLogout();
    }
  }, [onLogout]);
  
  // إعداد WebSocket للتحديثات الفورية
  useEffect(() => {
    if (!driverId) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('🔗 تم الاتصال بـ WebSocket للسائق');
        ws.send(JSON.stringify({
          type: 'register',
          userType: 'driver',
          userId: driverId
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'order_assigned':
              // طلب جديد تم تعيينه للسائق
              toast({
                title: "طلب جديد!",
                description: `تم تعيين طلب جديد لك`,
              });
              queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/orders`] });
              break;
            case 'new_order_available':
              // طلب جديد متاح
              toast({
                title: "طلب جديد متاح!",
                description: "يوجد طلب جديد متاح للتوصيل",
              });
              queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/available-orders`] });
              break;
          }
        } catch (error) {
          console.error('خطأ في معالجة رسالة WebSocket:', error);
        }
      };
      
      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('خطأ في إنشاء اتصال WebSocket:', error);
    }
  }, [driverId, toast, queryClient]);

  // Fetch driver info
  const { data: driver } = useQuery<Driver>({
    queryKey: [`/api/drivers/${driverId}`],
    enabled: !!driverId,
  });

  // Fetch available orders
  const { data: availableOrders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: [`/api/drivers/${driverId}/available-orders`],
    enabled: !!driverId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch driver orders
  const { data: myOrders } = useQuery<Order[]>({
    queryKey: [`/api/drivers/${driverId}/orders`],
    enabled: !!driverId,
  });

  // Fetch driver stats
  const { data: todayStats } = useQuery({
    queryKey: [`/api/drivers/${driverId}/stats`, 'today'],
    queryFn: () => fetch(`/api/drivers/${driverId}/stats?period=today`).then(res => res.json()),
  });

  const { data: weekStats } = useQuery({
    queryKey: [`/api/drivers/${driverId}/stats`, 'week'],
    queryFn: () => fetch(`/api/drivers/${driverId}/stats?period=week`).then(res => res.json()),
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/drivers/${driverId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng
        }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}`] });
      toast({ title: 'تم تحديث الحالة بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في تحديث الحالة', variant: 'destructive' });
    },
  });

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/drivers/${driverId}/accept-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!response.ok) throw new Error('Failed to accept order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/available-orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/orders`] });
      setDriverStatus('busy');
      toast({ title: 'تم قبول الطلب بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في قبول الطلب', variant: 'destructive' });
    },
  });

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/drivers/${driverId}/complete-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!response.ok) throw new Error('Failed to complete order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/stats`] });
      setDriverStatus('available');
      toast({ title: 'تم تسليم الطلب بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في تسليم الطلب', variant: 'destructive' });
    },
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('خطأ في الحصول على الموقع:', error);
        }
      );
    }
  }, []);

  const handleLogout = () => {
    // مسح بيانات السائق من localStorage
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    onLogout();
  };

  const toggleStatus = () => {
    const newStatus = driverStatus === 'available' ? 'offline' : 'available';
    setDriverStatus(newStatus);
    updateStatusMutation.mutate(newStatus);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toFixed(2)} ريال`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700';
      case 'busy': return 'bg-orange-100 text-orange-700';
      case 'offline': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'متاح';
      case 'busy': return 'مشغول';
      case 'offline': return 'غير متاح';
      default: return 'غير معروف';
    }
  };

  const currentOrder = myOrders?.find(order => 
    order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready'
  );

  // Render main dashboard
  if (activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Truck className="h-8 w-8 text-green-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">تطبيق السائق</h1>
                  <p className="text-sm text-gray-500">{driver?.name || 'أحمد محمد'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(driverStatus)}>
                  {getStatusText(driverStatus)}
                </Badge>
                <Button 
                  variant={driverStatus === 'available' ? "outline" : "default"}
                  onClick={toggleStatus}
                  className={driverStatus === 'available' ? "" : "bg-green-600 hover:bg-green-700"}
                  disabled={updateStatusMutation.isPending}
                >
                  {driverStatus === 'available' ? 'إيقاف العمل' : 'بدء العمل'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  خروج
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">الرئيسية</TabsTrigger>
              <TabsTrigger value="orders">الطلبات</TabsTrigger>
              <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
              <TabsTrigger value="map">الخريطة</TabsTrigger>
              <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">طلبات اليوم</p>
                        <p className="text-2xl font-bold text-blue-600">{todayStats?.totalOrders || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">أرباح اليوم</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(todayStats?.totalEarnings || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">أرباح الأسبوع</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(weekStats?.totalEarnings || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">الحالة</p>
                        <p className="text-lg font-bold text-orange-600">{getStatusText(driverStatus)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Order */}
              {currentOrder && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Package className="h-5 w-5" />
                      الطلب الحالي - #{currentOrder.id}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">معلومات العميل</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone className="h-4 w-4" />
                            {currentOrder.customerPhone}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <MapPin className="h-4 w-4" />
                            {currentOrder.deliveryAddress}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">تفاصيل الطلب</p>
                          <p className="text-sm text-gray-600 mt-1">المجموع: {formatCurrency(currentOrder.totalAmount)}</p>
                          <p className="text-sm text-gray-600">رسوم التوصيل: {formatCurrency(currentOrder.deliveryFee)}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => window.open(`https://maps.google.com/?q=${currentOrder.deliveryAddress}`, '_blank')}
                          className="gap-2"
                          variant="outline"
                        >
                          <Navigation className="h-4 w-4" />
                          التنقل
                        </Button>
                        <Button
                          onClick={() => window.open(`tel:${currentOrder.customerPhone}`, '_self')}
                          className="gap-2"
                          variant="outline"
                        >
                          <Phone className="h-4 w-4" />
                          اتصال
                        </Button>
                        <Button
                          onClick={() => completeOrderMutation.mutate(currentOrder.id)}
                          disabled={completeOrderMutation.isPending}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                          تم التسليم
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Available Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    الطلبات المتاحة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : !availableOrders || availableOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground p-8">لا توجد طلبات متاحة حالياً</p>
                  ) : (
                    <div className="space-y-4">
                      {availableOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-medium">طلب #{order.id}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                  <MapPin className="h-4 w-4" />
                                  {order.deliveryAddress}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="h-4 w-4" />
                                  {formatDate(order.createdAt.toString())}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                              <p className="text-sm text-green-600">
                                رسوم: {formatCurrency(order.deliveryFee)}
                              </p>
                            </div>
                            <Button
                              onClick={() => acceptOrderMutation.mutate(order.id)}
                              disabled={acceptOrderMutation.isPending || driverStatus !== 'available'}
                              className="gap-2 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                              قبول
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other tabs content would go here */}
            <TabsContent value="orders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>تاريخ الطلبات</CardTitle>
                </CardHeader>
                <CardContent>
                  {myOrders && myOrders.length > 0 ? (
                    <div className="space-y-4">
                      {myOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">طلب #{order.id}</p>
                            <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                            <p className="text-sm text-gray-600">{formatDate(order.createdAt.toString())}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                              {order.status === 'delivered' ? 'مكتمل' : 'قيد التنفيذ'}
                            </Badge>
                            <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground p-8">لا توجد طلبات</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      إحصائيات اليوم
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>إجمالي الطلبات:</span>
                      <span className="font-bold">{todayStats?.totalOrders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي الأرباح:</span>
                      <span className="font-bold text-green-600">{formatCurrency(todayStats?.totalEarnings || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>متوسط الطلب:</span>
                      <span className="font-bold">{formatCurrency(todayStats?.avgOrderValue || 0)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      إحصائيات الأسبوع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>إجمالي الطلبات:</span>
                      <span className="font-bold">{weekStats?.totalOrders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي الأرباح:</span>
                      <span className="font-bold text-green-600">{formatCurrency(weekStats?.totalEarnings || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>متوسط الطلب:</span>
                      <span className="font-bold">{formatCurrency(weekStats?.avgOrderValue || 0)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="map" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    خريطة التوصيل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">خريطة تفاعلية - قريباً</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    الملف الشخصي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>الاسم:</span>
                    <span className="font-medium">{driver?.name || 'أحمد محمد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رقم الهاتف:</span>
                    <span className="font-medium">{driver?.phone || '0501234567'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الحالة:</span>
                    <Badge className={getStatusColor(driverStatus)}>
                      {getStatusText(driverStatus)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>متاح للعمل:</span>
                    <span className="font-medium">{driver?.isAvailable ? 'نعم' : 'لا'}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return null;
};