import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle, XCircle, Phone, MapPin, Filter, Navigation, Search, Truck, AlertCircle, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order, Driver } from '@shared/schema';

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: statusFilter !== 'all' ? ['/api/orders', statusFilter] : ['/api/orders'],
    refetchInterval: 10000,
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
    refetchInterval: 15000,
  });

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'auth',
        payload: { userId: 'admin_dashboard' }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'order_update' || message.type === 'driver_assigned') {
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [queryClient]);

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/orders/${id}`, { status });
      return response.json();
    },
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      const statusLabels: Record<string, string> = {
        confirmed: 'مؤكد',
        preparing: 'قيد التحضير',
        on_way: 'في الطريق',
        delivered: 'مكتمل',
        cancelled: 'ملغي'
      };
      toast({
        title: "✅ تم تحديث الطلب",
        description: `تغيرت حالة الطلب إلى ${statusLabels[status] || status}`,
      });
    },
    onError: () => {
      toast({
        title: "❌ خطأ",
        description: "فشل تحديث الطلب",
        variant: "destructive"
      });
    }
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ id, driverId }: { id: string; driverId: string }) => {
      const response = await apiRequest('PUT', `/api/orders/${id}/assign-driver`, { driverId });
      return response.json();
    },
    onSuccess: (data, { id, driverId }) => {
      const driver = drivers?.find(d => d.id === driverId);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      setAssigningOrderId(null);
      setSelectedDriver(prev => ({ ...prev, [id]: '' }));
      
      toast({
        title: "✅ تم تعيين السائق",
        description: `تم توجيه الطلب للسائق ${driver?.name} بنجاح`,
      });

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'driver_assigned',
          payload: { orderId: id, driverId, driverName: driver?.name }
        }));
      }
    },
    onError: () => {
      toast({
        title: "❌ خطأ",
        description: "فشل تعيين السائق",
        variant: "destructive"
      });
      setAssigningOrderId(null);
    }
  });

  const getOrderItems = (itemsString: string) => {
    try {
      return JSON.parse(itemsString);
    } catch {
      return [];
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'في الانتظار', color: 'bg-yellow-500' },
      confirmed: { label: 'مؤكد', color: 'bg-blue-500' },
      preparing: { label: 'قيد التحضير', color: 'bg-orange-500' },
      on_way: { label: 'في الطريق', color: 'bg-purple-500' },
      delivered: { label: 'تم التوصيل', color: 'bg-green-500' },
      cancelled: { label: 'ملغي', color: 'bg-red-500' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>;
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'on_way',
      on_way: 'delivered',
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const labels = {
      pending: 'تأكيد الطلب',
      confirmed: 'بدء التحضير',
      preparing: 'تجهيز للتوصيل',
      on_way: 'تم التوصيل',
    };
    return labels[currentStatus as keyof typeof labels];
  };

  const filteredOrders = orders?.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  }).filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.customerName?.toLowerCase().includes(search) ||
      order.customerPhone?.toLowerCase().includes(search) ||
      order.id?.toLowerCase().includes(search) ||
      order.deliveryAddress?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">إدارة الطلبات</h1>
            <p className="text-sm text-muted-foreground">متابعة وإدارة جميع الطلبات</p>
          </div>
        </div>
      </div>

      <div className="p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* القائمة الجانبية للفرز - ثابتة عند التمرير */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  تصفية الطلبات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant={statusFilter === 'all' ? 'default' : 'ghost'} 
                  className="w-full justify-start gap-2"
                  onClick={() => setStatusFilter('all')}
                >
                  <Package className="h-4 w-4" />
                  جميع الطلبات
                </Button>
                <Button 
                  variant={statusFilter === 'pending' ? 'default' : 'ghost'} 
                  className="w-full justify-start gap-2"
                  onClick={() => setStatusFilter('pending')}
                >
                  <Package className="h-4 w-4 text-yellow-500" />
                  جديدة (انتظار)
                </Button>
                <Button 
                  variant={statusFilter === 'confirmed' ? 'default' : 'ghost'} 
                  className="w-full justify-start gap-2"
                  onClick={() => setStatusFilter('confirmed')}
                >
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  مؤكدة
                </Button>
                <Button 
                  variant={statusFilter === 'preparing' ? 'default' : 'ghost'} 
                  className="w-full justify-start gap-2"
                  onClick={() => setStatusFilter('preparing')}
                >
                  <Package className="h-4 w-4 text-orange-500" />
                  قيد التحضير
                </Button>
                <Button 
                  variant={statusFilter === 'on_way' ? 'default' : 'ghost'} 
                  className="w-full justify-start gap-2"
                  onClick={() => setStatusFilter('on_way')}
                >
                  <Truck className="h-4 w-4 text-purple-500" />
                  في الطريق
                </Button>
                <Button 
                  variant={statusFilter === 'delivered' ? 'default' : 'ghost'} 
                  className="w-full justify-start gap-2"
                  onClick={() => setStatusFilter('delivered')}
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  مكتملة
                </Button>
                <Button 
                  variant={statusFilter === 'cancelled' ? 'default' : 'ghost'} 
                  className="w-full justify-start gap-2"
                  onClick={() => setStatusFilter('cancelled')}
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                  ملغية
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إحصائيات سريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الإجمالي:</span>
                    <span className="font-bold">{orders?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-yellow-600">
                    <span>جديد:</span>
                    <span className="font-bold">{orders?.filter(o => o.status === 'pending').length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* المحتوى الرئيسي للطلبات */}
        <div className="flex-1 space-y-4">
          {/* شريط البحث */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الطلبات (الاسم، الهاتف، رقم الطلب، العنوان)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                  data-testid="input-search-orders"
                />
              </div>
            </CardContent>
          </Card>

          {/* Orders Grid */}
          <div className="space-y-4">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-6 bg-muted rounded w-32" />
                      <div className="h-6 bg-muted rounded w-20" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredOrders?.length ? (
              filteredOrders.map((order) => {
                const items = getOrderItems(order.items);
                const nextStatus = getNextStatus(order.status || 'pending');
                const nextStatusLabel = getNextStatusLabel(order.status || 'pending');
                
                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">طلب #{order.id}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(order.status || 'pending')}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Customer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">معلومات العميل</h4>
                          <p className="text-sm text-foreground">{order.customerName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{order.customerPhone}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">عنوان التوصيل</h4>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <span className="text-sm text-muted-foreground block">{order.deliveryAddress}</span>
                              {order.customerLocationLat && order.customerLocationLng && (
                                <span className="text-xs text-muted-foreground/70 mt-1 block">
                                  📍 {order.customerLocationLat}, {order.customerLocationLng}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">تفاصيل الطلب</h4>
                        <div className="space-y-2">
                          {items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-foreground">{item.name} × {item.quantity}</span>
                              <span className="text-muted-foreground">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="border-t border-border mt-2 pt-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">المجموع الفرعي:</span>
                            <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">رسوم التوصيل:</span>
                            <span className="text-foreground">{formatCurrency(order.deliveryFee)}</span>
                          </div>
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-foreground">المجموع:</span>
                            <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment & Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">طريقة الدفع</h4>
                          <p className="text-sm text-muted-foreground">
                            {order.paymentMethod === 'cash' ? 'دفع نقدي' : 'مدفوع مسبقاً'}
                          </p>
                        </div>
                        {order.notes && (
                          <div>
                            <h4 className="font-semibold text-foreground mb-1">ملاحظات</h4>
                            <p className="text-sm text-muted-foreground">{order.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Driver Assignment Section */}
                      {(order.status !== 'delivered' && order.status !== 'cancelled') && (
                        <div className={`p-4 rounded-lg border ${order.driverId ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              {order.driverId ? 'السائق المعين' : 'تعيين سائق'}
                            </h4>
                            {!order.driverId && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                مطلوب تعيين
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                            <Select 
                              value={assigningOrderId === order.id ? (selectedDriver[order.id] || '') : (order.driverId || '')} 
                              onValueChange={(val) => {
                                setAssigningOrderId(order.id);
                                setSelectedDriver(prev => ({ ...prev, [order.id]: val }));
                              }}
                              disabled={assigningOrderId !== null && assigningOrderId !== order.id}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="اختر سائقاً" />
                              </SelectTrigger>
                              <SelectContent>
                                {drivers?.map(driver => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    <span className="flex items-center gap-2">
                                      {driver.name}
                                      {driver.isAvailable && <Badge variant="outline" className="text-xs">متاح</Badge>}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => {
                                const driverId = assigningOrderId === order.id ? selectedDriver[order.id] : order.driverId;
                                if (driverId) {
                                  assignDriverMutation.mutate({ id: order.id, driverId });
                                }
                              }}
                              disabled={assigningOrderId === order.id 
                                ? (!selectedDriver[order.id] || assignDriverMutation.isPending) 
                                : assignDriverMutation.isPending}
                              className="gap-2 w-full sm:w-auto"
                            >
                              <Truck className="h-4 w-4" />
                              {assigningOrderId === order.id ? 'تأكيد التعيين' : (order.driverId ? 'تغيير' : 'تعيين')}
                            </Button>
                          </div>
                        </div>
                      )}



                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">

                        {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <Button
                            onClick={() => updateOrderStatusMutation.mutate({ 
                              id: order.id, 
                              status: nextStatus 
                            })}
                            disabled={updateOrderStatusMutation.isPending}
                            className="gap-2"
                            data-testid={`button-update-order-${order.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            {nextStatusLabel}
                          </Button>
                        )}
                        
                        {order.status === 'pending' && (
                          <Button
                            variant="destructive"
                            onClick={() => updateOrderStatusMutation.mutate({ 
                              id: order.id, 
                              status: 'cancelled' 
                            })}
                            disabled={updateOrderStatusMutation.isPending}
                            className="gap-2"
                            data-testid={`button-cancel-order-${order.id}`}
                          >
                            <XCircle className="h-4 w-4" />
                            إلغاء الطلب
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          onClick={() => window.open(`tel:${order.customerPhone}`)}
                          className="gap-2"
                          data-testid={`button-call-customer-${order.id}`}
                        >
                          <Phone className="h-4 w-4" />
                          اتصال بالعميل
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            const address = encodeURIComponent(order.deliveryAddress);
                            const googleMapsUrl = order.customerLocationLat && order.customerLocationLng 
                              ? `https://www.google.com/maps?q=${order.customerLocationLat},${order.customerLocationLng}`
                              : `https://www.google.com/maps/search/?api=1&query=${address}`;
                            window.open(googleMapsUrl, '_blank');
                          }}
                          className="gap-2"
                          data-testid={`button-track-location-${order.id}`}
                        >
                          <Navigation className="h-4 w-4" />
                          تتبع الموقع
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {statusFilter === 'all' ? 'لا توجد طلبات' : `لا توجد طلبات ${statusFilter === 'pending' ? 'في الانتظار' : statusFilter === 'confirmed' ? 'مؤكدة' : statusFilter === 'preparing' ? 'قيد التحضير' : statusFilter === 'on_way' ? 'في الطريق' : statusFilter === 'delivered' ? 'مكتملة' : 'ملغية'}`}
                </h3>
                <p className="text-muted-foreground">
                  {statusFilter === 'all' 
                    ? 'ستظهر الطلبات هنا عند ورودها من العملاء'
                    : 'لا توجد طلبات بهذه الحالة حالياً'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}