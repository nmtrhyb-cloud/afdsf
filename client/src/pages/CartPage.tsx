import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Trash2, MapPin, Tag, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCart } from '../context/CartContext';
import { useUserLocation as useCoordinates } from '../context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { InsertOrder, Restaurant } from '@shared/schema';
import { calculateDistance, calculateDeliveryFee } from '../utils/location';

import { formatCurrency } from '@/lib/utils';

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { state, removeItem, updateQuantity, clearCart, setDeliveryFee } = useCart();
  const { items, subtotal, total, deliveryFee } = state;
  const { toast } = useToast();
  const { location: userLocation, getCurrentLocation } = useCoordinates();
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<{
    distance: number;
    estimatedTime: string;
    isFreeDelivery: boolean;
  } | null>(null);

  const restaurantId = items[0]?.restaurantId;

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', restaurantId],
    enabled: !!restaurantId,
  });

  // Calculate delivery fee whenever subtotal or location changes
  useEffect(() => {
    if (items.length === 0) {
      setDeliveryInfo(null);
      setDeliveryFee(0);
      return;
    }

    const calculateFee = async () => {
      if (userLocation.position) {
        setCalculatingFee(true);
        try {
          const response = await apiRequest('POST', '/api/delivery-fees/calculate', {
            customerLat: userLocation.position.coords.latitude,
            customerLng: userLocation.position.coords.longitude,
            restaurantId: restaurantId,
            orderSubtotal: subtotal
          });
          
          const result = await response.json();
          if (result.success) {
            setDeliveryFee(result.fee);
            setDeliveryInfo({
              distance: result.distance,
              estimatedTime: result.estimatedTime,
              isFreeDelivery: result.isFreeDelivery
            });
          }
        } catch (error) {
          console.error('Error calculating delivery fee:', error);
          // Fallback to basic fee if API fails
          setDeliveryFee(5);
        } finally {
          setCalculatingFee(false);
        }
      } else {
        // Try to get location if not available
        getCurrentLocation();
        setDeliveryFee(0);
        setDeliveryInfo(null);
      }
    };

    calculateFee();
  }, [userLocation.position, subtotal, restaurantId]);

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponData, setCouponData] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponDiscount(0);
    setCouponData(null);
    try {
      const categoryIds = [...new Set(items.map((i: any) => i.categoryId).filter(Boolean))];
      const res = await apiRequest('POST', '/api/coupons/validate', {
        code: couponCode.trim().toUpperCase(),
        orderValue: subtotal,
        categoryIds,
      });
      const data = await res.json();
      if (data.valid) {
        setCouponData(data.coupon);
        setCouponDiscount(data.discount || 0);
        toast({ title: "تم تطبيق الكوبون", description: `وفّرت ${formatCurrency(data.discount || 0)}` });
      } else {
        setCouponError(data.message || "كوبون غير صالح");
      }
    } catch {
      setCouponError("خطأ في التحقق من الكوبون");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponData(null);
    setCouponError('');
  };

  const finalTotal = Math.max(0, total - couponDiscount);

  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    notes: '',
    paymentMethod: 'cash',
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: InsertOrder) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم تأكيد طلبك بنجاح!",
        description: "سيتم التواصل معك قريباً",
      });
      clearCart();
      // توجيه العميل لصفحة تتبع الطلب
      if (data?.order?.id) {
        setLocation(`/order-tracking/${data.order.id}`);
      } else {
        setLocation('/');
      }
    },
    onError: () => {
      toast({
        title: "خطأ في تأكيد الطلب",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = () => {
    if (!orderForm.customerName || !orderForm.customerPhone || !orderForm.deliveryAddress) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "أضف بعض العناصر قبل تأكيد الطلب",
        variant: "destructive",
      });
      return;
    }

    const orderData: InsertOrder = {
      orderNumber: `ORD${Date.now()}`,
      customerName: orderForm.customerName,
      customerPhone: orderForm.customerPhone,
      customerEmail: orderForm.customerEmail || undefined,
      deliveryAddress: orderForm.deliveryAddress,
      notes: orderForm.notes || undefined,
      paymentMethod: orderForm.paymentMethod,
      items: JSON.stringify(items),
      subtotal: subtotal.toString(),
      deliveryFee: deliveryFee.toString(),
      total: finalTotal.toString(),
      restaurantId: items[0]?.restaurantId || undefined,
      customerLocationLat: userLocation.position?.coords.latitude.toString(),
      customerLocationLng: userLocation.position?.coords.longitude.toString(),
      status: 'pending',
    };

    placeOrderMutation.mutate(orderData);
  };

  // دالة لتحويل السعر من string إلى number للحسابات
  const parsePrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    const num = parseFloat(price);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-cart-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">طمطوم - السلة</h2>
        </div>
      </header>

      <section className="p-4">
        {/* Cart Items */}
        <div className="space-y-4 mb-6">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <i className="fas fa-shopping-cart text-4xl mb-4"></i>
              <p>السلة فارغة</p>
              <p className="text-sm">أضف بعض العناصر لتبدأ طلبك</p>
            </div>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="p-4 flex justify-between items-center">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground" data-testid={`cart-item-name-${item.id}`}>
                    {item.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {item.price} ريال × {item.quantity}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      data-testid={`button-decrease-${item.id}`}
                    >
                      -
                    </Button>
                    <span className="px-3 py-1 bg-muted rounded" data-testid={`quantity-${item.id}`}>
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      data-testid={`button-increase-${item.id}`}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary" data-testid={`item-total-${item.id}`}>
                    {parsePrice(item.price) * item.quantity} ريال
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:bg-destructive/10"
                    data-testid={`button-remove-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Order Summary and Form */}
        {items.length > 0 && (
          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-4">ملخص الطلب</h3>
            
            {/* Order Summary */}
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="text-foreground" data-testid="order-subtotal">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">رسوم التوصيل</span>
                <div className="flex flex-col items-end">
                  {calculatingFee ? (
                    <span className="text-xs text-muted-foreground animate-pulse">جاري الحساب...</span>
                  ) : deliveryFee > 0 ? (
                    <span className="text-foreground">{formatCurrency(deliveryFee)}</span>
                  ) : userLocation.position ? (
                    <span className="text-green-600 font-bold">توصيل مجاني</span>
                  ) : (
                    <span className="text-destructive text-xs">يرجى تحديد الموقع للحساب</span>
                  )}
                </div>
              </div>

              {deliveryInfo && (
                <div className="flex flex-col gap-1 py-2 border-y border-dashed border-border my-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">المسافة المقدرة:</span>
                    <span className="text-foreground font-medium">{deliveryInfo.distance} كم</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">وقت التوصيل المتوقع:</span>
                    <span className="text-foreground font-medium">{deliveryInfo.estimatedTime}</span>
                  </div>
                </div>
              )}

              {userLocation.error && (
                <div className="bg-destructive/10 p-2 rounded text-xs text-destructive flex items-center gap-2 mt-1">
                  <i className="fas fa-exclamation-circle"></i>
                  {userLocation.error}
                </div>
              )}
              
              {!userLocation.position && !userLocation.isLoading && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2 text-xs h-9 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                  onClick={getCurrentLocation}
                >
                  <MapPin className="h-3.5 w-3.5 ml-2" />
                  تحديد موقعي الآن لحساب التوصيل تلقائياً
                </Button>
              )}

              {userLocation.isLoading && (
                <div className="text-center py-2">
                  <span className="text-xs text-muted-foreground animate-pulse italic">جاري جلب موقعك الحالي...</span>
                </div>
              )}

              {/* Coupon Section */}
              <div className="border-t border-border pt-3 mt-2">
                {couponData ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2.5 mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-700">{couponData.nameAr || couponCode}</p>
                        <p className="text-xs text-green-600">خصم {formatCurrency(couponDiscount)}</p>
                      </div>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-red-400 hover:text-red-600">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 mb-2">
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                        placeholder="أدخل كود الخصم"
                        className="font-mono text-sm h-9"
                        onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                        dir="ltr"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleValidateCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="h-9 gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
                        تطبيق
                      </Button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="h-3 w-3" />{couponError}</p>}
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 mb-1">
                    <span>خصم الكوبون</span>
                    <span>- {formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-2">
                  <span className="text-foreground">الإجمالي</span>
                  <span className="text-orange-500 text-lg" data-testid="order-total">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName" className="text-foreground">الاسم *</Label>
                <Input
                  id="customerName"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="أدخل اسمك"
                  data-testid="input-customer-name"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone" className="text-foreground">رقم الهاتف *</Label>
                <Input
                  id="customerPhone"
                  value={orderForm.customerPhone}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="أدخل رقم هاتفك"
                  data-testid="input-customer-phone"
                />
              </div>

              <div>
                <Label htmlFor="customerEmail" className="text-foreground">البريد الإلكتروني</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={orderForm.customerEmail}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="أدخل بريدك الإلكتروني (اختياري)"
                  data-testid="input-customer-email"
                />
              </div>

              <div>
                <Label htmlFor="deliveryAddress" className="text-foreground">عنوان التوصيل *</Label>
                <Input
                  id="deliveryAddress"
                  value={orderForm.deliveryAddress}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder="أدخل عنوانك بالتفصيل"
                  data-testid="input-delivery-address"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-foreground">ملاحظات الطلب</Label>
                <Textarea
                  id="notes"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                  className="h-20 resize-none"
                  data-testid="input-notes"
                />
              </div>

              <div>
                <Label className="text-foreground">طريقة الدفع</Label>
                <RadioGroup
                  value={orderForm.paymentMethod}
                  onValueChange={(value) => setOrderForm(prev => ({ ...prev, paymentMethod: value }))}
                  className="grid grid-cols-2 gap-2 mt-2"
                >
                  <div className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${orderForm.paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                    <RadioGroupItem value="cash" id="cash" className="sr-only" />
                    <Label htmlFor="cash" className="flex flex-col items-center gap-2 cursor-pointer w-full h-full">
                      <span className="text-2xl">💵</span>
                      <span className="text-[10px] font-black">نقداً</span>
                    </Label>
                  </div>
                  <div className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${orderForm.paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                    <RadioGroupItem value="card" id="card" className="sr-only" />
                    <Label htmlFor="card" className="flex flex-col items-center gap-2 cursor-pointer w-full h-full">
                      <span className="text-2xl">💳</span>
                      <span className="text-[10px] font-black">بطاقة دفع</span>
                    </Label>
                  </div>
                  <div className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${orderForm.paymentMethod === 'wallet' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                    <RadioGroupItem value="wallet" id="wallet" className="sr-only" />
                    <Label htmlFor="wallet" className="flex flex-col items-center gap-2 cursor-pointer w-full h-full">
                      <span className="text-2xl">👛</span>
                      <span className="text-[10px] font-black">المحفظة</span>
                    </Label>
                  </div>
                  <div className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${orderForm.paymentMethod === 'online' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                    <RadioGroupItem value="online" id="online" className="sr-only" />
                    <Label htmlFor="online" className="flex flex-col items-center gap-2 cursor-pointer w-full h-full">
                      <span className="text-2xl">🌐</span>
                      <span className="text-[10px] font-black">دفع إلكتروني</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={placeOrderMutation.isPending || calculatingFee || !userLocation.position}
              className="w-full mt-6 py-4 text-lg font-bold"
              data-testid="button-place-order"
            >
              {placeOrderMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i> جاري تأكيد الطلب...
                </span>
              ) : calculatingFee ? (
                'جاري حساب رسوم التوصيل...'
              ) : !userLocation.position ? (
                'يرجى تحديد الموقع لإكمال الطلب'
              ) : (
                'تأكيد الطلب'
              )}
            </Button>
          </Card>
        )}
      </section>
    </div>
  );
}