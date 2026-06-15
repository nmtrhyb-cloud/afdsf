import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowRight, MapPin, Clock, Phone, CheckCircle, Truck, Package, User, Star, MessageCircle, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import RatingDialog from '@/components/RatingDialog';
import { DriverCommunication } from '@/components/DriverCommunication';
import MapComponent from '@/components/maps/MapComponent';

interface OrderStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
  timestamp: Date;
  description: string;
}

interface OrderDetails {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerLocationLat?: string;
  customerLocationLng?: string;
  items: any[];
  total: number;
  status: string;
  estimatedTime: string;
  driverName?: string;
  driverPhone?: string;
  driverId?: string;
  restaurantName?: string;
  orderNumber: string;
  createdAt: Date;
}

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, setLocation] = useLocation();
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [hasShownRating, setHasShownRating] = useState(false);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  
  // جلب إعدادات الدعم
  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const supportPhone = uiSettings?.find(s => s.key === 'support_phone')?.value || 'tel:+967777777777';
  const supportWhatsapp = uiSettings?.find(s => s.key === 'support_whatsapp')?.value || 'https://wa.me/967777777777';

  // جلب بيانات الطلب الحقيقية من API مع تحديثات سريعة
  const { data: orderData, isLoading, error, refetch } = useQuery<{order: OrderDetails, tracking: OrderStatus[]}>({
    queryKey: [`/api/orders/${orderId}/track`],
    enabled: !!orderId,
    refetchInterval: 10000, // Reduced polling frequency as we now have WebSockets
  });

  // WebSocket support for real-time tracking
  useEffect(() => {
    if (!orderId) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws?.send(JSON.stringify({
          type: 'track_order',
          payload: { orderId }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'order_status_changed' || message.type === 'order_update') {
            refetch();
          } else if (message.type === 'driver_location' && message.payload.driverId === orderData?.order.driverId) {
            setDriverLocation([message.payload.latitude, message.payload.longitude]);
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [orderId, refetch, orderData?.order.driverId]);

  useEffect(() => {
    if (orderData?.order.status === 'delivered' && !hasShownRating) {
      setShowRatingDialog(true);
      setHasShownRating(true);
    }
  }, [orderData?.order.status, hasShownRating]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-md mx-auto">
          <Card className="text-center p-6">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">الطلب غير موجود</h2>
            <p className="text-gray-600 mb-4">لم نتمكن من العثور على هذا الطلب</p>
            <Button onClick={() => setLocation('/')} data-testid="button-back-home">
              العودة للرئيسية
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const { order, tracking } = orderData;

  const getStatusProgress = (status: string) => {
    const statusMap = {
      pending: 25,
      confirmed: 40,
      preparing: 60,
      on_way: 80,
      delivered: 100,
      cancelled: 0,
    };
    return statusMap[status as keyof typeof statusMap] || 0;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      on_way: 'bg-purple-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-500';
  };

  const getStatusText = (status: string) => {
    const textMap = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      on_way: 'في الطريق',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return textMap[status as keyof typeof textMap] || status;
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/profile')}
            data-testid="button-tracking-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">تتبع الطلب</h2>
        </div>
      </header>

      <section className="p-4 space-y-6">
        {/* Order Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">طلب رقم #{order.id}</CardTitle>
              <Badge 
                className={`${getStatusColor(order.status)} text-white`}
                data-testid="order-status-badge"
              >
                {getStatusText(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Live Update Indicator */}
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>التحديث المباشر مفعل</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-foreground">الوقت المتوقع للوصول: </span>
              <span className="font-bold text-primary" data-testid="estimated-time">
                {order.estimatedTime}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">حالة الطلب</span>
                <span className="text-foreground">{getStatusProgress(order.status)}%</span>
              </div>
              <Progress 
                value={getStatusProgress(order.status)} 
                className="h-2"
                data-testid="order-progress"
              />
            </div>
          </CardContent>
        </Card>

        {/* Driver Info & Map */}
        {(['confirmed', 'preparing', 'ready', 'picked_up', 'on_way'].includes(order.status)) && order.driverId && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <MapIcon className="h-4 w-4 text-primary" />
                  تتبع الموقع المباشر
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[250px] relative">
                <MapComponent 
                  center={driverLocation || [15.3694, 44.1910]} // Default to Sana'a if no location
                  zoom={15}
                  height="100%"
                  driverPosition={driverLocation || undefined}
                  markers={order.customerLocationLat && order.customerLocationLng ? [{
                    position: [parseFloat(order.customerLocationLat), parseFloat(order.customerLocationLng)],
                    title: 'موقعك',
                    type: 'destination'
                  }] : []}
                />
                {!driverLocation && (
                  <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[1px] z-[400]">
                    <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium">في انتظار موقع السائق...</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DriverCommunication 
              driver={{
                id: order.driverId || '',
                name: order.driverName || 'سائق التوصيل',
                phone: order.driverPhone || '',
                isAvailable: true
              }}
              orderNumber={order.orderNumber}
              customerLocation={order.deliveryAddress}
            />
          </div>
        )}

        {/* Delivery Address */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-1" />
              <div>
                <h4 className="font-medium text-foreground mb-1">عنوان التوصيل</h4>
                <p className="text-sm text-foreground" data-testid="delivery-address">
                  {order.deliveryAddress}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تفاصيل الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <span className="text-foreground font-medium" data-testid={`item-name-${index}`}>
                    {item.name}
                  </span>
                  <span className="text-muted-foreground text-sm mr-2">
                    × {item.quantity}
                  </span>
                </div>
                <span className="font-bold text-primary" data-testid={`item-price-${index}`}>
                  {item.price * item.quantity} ريال
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center font-bold">
                <span className="text-foreground">الإجمالي</span>
                <span className="text-primary" data-testid="order-total">
                  {order.total} ريال
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تاريخ الطلب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tracking.map((status, index) => (
                <div key={status.id} className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(status.status)} mt-1 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium" data-testid={`timeline-description-${index}`}>
                      {status.description || status.message || 'تحديث الطلب'}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`timeline-time-${index}`}>
                      {new Date(status.timestamp).toLocaleTimeString('ar-SA', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
              onClick={() => window.open(supportWhatsapp, '_blank')}
              data-testid="button-whatsapp-support"
            >
              <MessageCircle className="h-4 w-4" />
              واتساب الإدارة
            </Button>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              onClick={() => window.location.href = supportPhone}
              data-testid="button-call-support"
            >
              <Phone className="h-4 w-4" />
              اتصال بالإدارة
            </Button>
          </div>
          
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <Button 
              variant="destructive" 
              className="w-full"
              data-testid="button-cancel-order"
            >
              إلغاء الطلب
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}