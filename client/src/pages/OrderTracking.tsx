import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowRight, MapPin, Clock, Phone, Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  items: any[];
  total: number;
  status: string;
  estimatedTime: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: Date;
}

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, setLocation] = useLocation();
  
  // إعداد WebSocket للتحديثات الفورية
  useEffect(() => {
    if (!orderId) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('🔗 تم الاتصال بـ WebSocket لتتبع الطلب');
        ws.send(JSON.stringify({
          type: 'register',
          userType: 'customer',
          userId: 'guest',
          orderId: orderId
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'order_status_updated' && message.data.orderId === orderId) {
            // إعادة تحميل بيانات الطلب
            refetch();
            
            // إشعار المستخدم
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('تحديث الطلب', {
                body: message.data.message,
                icon: '/logo.png'
              });
            }
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
  }, [orderId]);
  
  // Mock order data - in real app this would come from API
  const [order] = useState<OrderDetails>({
    id: orderId || '12345',
    customerName: 'محمد أحمد',
    customerPhone: '+967771234567',
    deliveryAddress: 'صنعاء، شارع الزبيري، بجانب مسجد النور',
    items: [
      { name: 'عربكة بالقشطة والعسل', quantity: 2, price: 55 },
      { name: 'مياه معدنية', quantity: 1, price: 3 },
    ],
    total: 113,
    status: 'on_way',
    estimatedTime: '25 دقيقة',
    driverName: 'أحمد محمد',
    driverPhone: '+967771234567',
    createdAt: new Date(),
  });

  const [orderHistory] = useState<OrderStatus[]>([
    { id: '1', status: 'pending', timestamp: new Date(Date.now() - 30 * 60000), description: 'تم استلام الطلب' },
    { id: '2', status: 'confirmed', timestamp: new Date(Date.now() - 25 * 60000), description: 'تم تأكيد الطلب من المطعم' },
    { id: '3', status: 'preparing', timestamp: new Date(Date.now() - 15 * 60000), description: 'جاري تحضير الطلب' },
    { id: '4', status: 'on_way', timestamp: new Date(Date.now() - 5 * 60000), description: 'الطلب في الطريق إليك' },
  ]);

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

        {/* Driver Info */}
        {order.status === 'on_way' && order.driverName && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground" data-testid="driver-name">
                    {order.driverName}
                  </h4>
                  <p className="text-sm text-muted-foreground">سائق التوصيل</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid="button-call-driver"
                >
                  <Phone className="h-4 w-4 ml-2" />
                  اتصال
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">السائق في الطريق إليك</span>
                </div>
              </div>
            </CardContent>
          </Card>
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
              {orderHistory.map((status, index) => (
                <div key={status.id} className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(status.status)} mt-1 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium" data-testid={`timeline-description-${index}`}>
                      {status.description}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`timeline-time-${index}`}>
                      {status.timestamp.toLocaleTimeString('ar-YE', { 
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
          <Button 
            variant="outline" 
            className="w-full"
            data-testid="button-contact-support"
          >
            تواصل مع الدعم
          </Button>
          
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