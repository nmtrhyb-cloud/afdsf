import { useState, useEffect } from 'react'; // أضف useEffect
import { Minus, Plus, Trash2, ShoppingBag, X, MapPin, Loader2 } from 'lucide-react'; 
import { useCart } from '../context/CartContext';
import { useUserLocation as useGeoLocation } from '../context/LocationContext';
import { GoogleMapsLocationPicker, LocationData } from './GoogleMapsLocationPicker';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button'; // أضف استيراد Button
import { formatCurrency } from '@/lib/utils';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Cart({ isOpen, onClose }: CartProps) {
  const { state, updateQuantity, removeItem, addNotes, clearCart, setDeliveryFee: setContextDeliveryFee } = useCart();
  const { location: userGeoLocation, getCurrentLocation } = useGeoLocation();
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0); 
  const [deliveryDetails, setDeliveryDetails] = useState<any>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const { toast } = useToast();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    notes: '',
    paymentMethod: 'cash'
  });

  const paymentMethods = [
    { id: 'cash', name: 'نقداً عند الاستلام', icon: '💵' },
    { id: 'card', name: 'بطاقة دفع', icon: '💳' },
    { id: 'wallet', name: 'المحفظة', icon: '👛' },
    { id: 'online', name: 'دفع إلكتروني', icon: '🌐' }
  ];

  // Automatically request location if not available when cart is open
  useEffect(() => {
    if (isOpen && !userGeoLocation.position && !userGeoLocation.isLoading && !userGeoLocation.error) {
      getCurrentLocation();
    }
  }, [isOpen, userGeoLocation.position, userGeoLocation.isLoading]);

  // Use GPS location as default if selectedLocation is null
  useEffect(() => {
    if (userGeoLocation.position && !selectedLocation && isOpen) {
      const { latitude, longitude } = userGeoLocation.position.coords;
      setSelectedLocation({
        lat: latitude,
        lng: longitude,
        address: 'موقعي الحالي (GPS)',
        area: 'تحديد تلقائي'
      });
      
      // لا نحتاج لاستدعاء fetchDeliveryFee هنا لأن الـ useEffect التالي سيقوم بذلك بمجرد تغير selectedLocation
    }
  }, [userGeoLocation.position, selectedLocation, isOpen]);

  // جلب إعدادات رسوم التوصيل
  const { data: uiSettings } = useQuery({
    queryKey: ['/api/admin/ui-settings'],
  });

  // جلب بيانات المطعم للحصول على موقعه بدقة
  const { data: restaurant } = useQuery({
    queryKey: [`/api/restaurants/${state.restaurantId}`],
    enabled: !!state.restaurantId,
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchDeliveryFee = async () => {
      if (!selectedLocation?.lat || !selectedLocation?.lng || !state.restaurantId) {
        return;
      }

      setIsCalculatingFee(true);
      try {
        const response = await fetch('/api/delivery-fees/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerLat: selectedLocation.lat,
            customerLng: selectedLocation.lng,
            restaurantId: state.restaurantId,
            orderSubtotal: state.subtotal || 0
          }),
          signal: abortController.signal
        });
        
        if (!response.ok) throw new Error('فشل في حساب رسوم التوصيل');
        
        const data = await response.json();
        if (isMounted && data.success) {
          setDeliveryFee(data.fee);
          setDeliveryDetails(data);
          setContextDeliveryFee(data.fee);
        }
      } catch (error: any) {
        if (isMounted && error.name !== 'AbortError') {
          console.error('Failed to calculate delivery fee:', error);
          toast({
            title: "خطأ في حساب الرسوم",
            description: "فشل في الاتصال بالسيرفر",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setIsCalculatingFee(false);
        }
      }
    };

    fetchDeliveryFee();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [selectedLocation?.lat, selectedLocation?.lng, state.restaurantId, state.subtotal]);

  // الحصول على موقع المطعم للحساب
  const getRestaurantLocation = () => {
    if (restaurant && restaurant.latitude && restaurant.longitude) {
      return { 
        lat: parseFloat(restaurant.latitude), 
        lng: parseFloat(restaurant.longitude) 
      };
    }
    return undefined;
  };
  if (!isOpen) return null;

  // Function to save customer info to user profile
  const saveCustomerInfoToProfile = async () => {
    try {
      // For now, we'll use the same demo user ID as in Profile component
      const userId = '5ea1edd8-b9e1-4c9e-84fb-25aa2741a0db';
      
      // Update user profile with delivery info
      await apiRequest('PUT', `/api/users/${userId}`, {
        name: customerInfo.name,
        phone: customerInfo.phone,
        address: selectedLocation?.address,
      });
    } catch (error) {
      console.error('Failed to save customer info to profile:', error);
      // Don't show error to user as this is a background operation
    }
  };

  const handleCheckout = async () => {
    if (!selectedLocation) {
      toast({
        title: "موقع التوصيل مطلوب",
        description: "يرجى تحديد موقع التوصيل من الخريطة",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى إدخال الاسم ورقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderData = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        deliveryAddress: selectedLocation.address,
        customerLocationLat: selectedLocation.lat,
        customerLocationLng: selectedLocation.lng,
        notes: customerInfo.notes,
        paymentMethod: customerInfo.paymentMethod,
        items: JSON.stringify(state.items),
        subtotal: state.subtotal,
        deliveryFee: deliveryFee,
        totalAmount: state.subtotal + deliveryFee,
        restaurantId: state.restaurantId
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const order = await response.json();
        
        // Save customer info to profile after successful order
        await saveCustomerInfoToProfile();
        
        toast({
          title: "تم تأكيد طلبك بنجاح! 🎉",
          description: `رقم الطلب: ${order.order?.orderNumber || order.orderNumber}`,
        });
        clearCart();
        onClose();
      } else {
        throw new Error('فشل في إرسال الطلب');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: "خطأ في إرسال الطلب",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-end">
      <div className="bg-white w-full max-w-md h-5/6 rounded-t-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="text-xl font-black tracking-tighter">
              <span className="text-[#388e3c]">طم</span><span className="text-[#d32f2f]">طوم</span>
            </div>
            <h2 className="text-lg font-bold"> - السلة</h2>
            {state.items.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {state.items.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingBag size={64} className="mb-4 opacity-50" />
              <p>سلة التسوق فارغة</p>
              <p className="text-sm">أضف عناصر من المطاعم لتبدأ طلبك</p>
            </div>
          ) : (userGeoLocation.isLoading || isCalculatingFee) && !selectedLocation ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <Loader2 size={48} className="animate-spin text-primary" />
              <div className="text-center">
                <p className="font-bold text-gray-800">جاري حساب رسوم التوصيل...</p>
                <p className="text-xs">يرجى الانتظار قليلاً لنتمكن من تحديد موقعك</p>
              </div>
            </div>
          ) : (
            <>
              {/* Restaurant Name */}
              {state.restaurantName && (
                <div className="p-4 bg-gray-50 border-b">
                  <h3 className="font-medium text-gray-800">من {state.restaurantName}</h3>
                </div>
              )}

              {/* Cart Items */}
              <div className="p-4 space-y-4">
                {state.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="text-red-500 font-medium">{formatCurrency(item.price)}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 border rounded hover:bg-gray-50"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-3 py-1 bg-gray-100 rounded">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 border rounded hover:bg-gray-50"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(parseFloat(item.price) * item.quantity)}
                      </span>
                    </div>

                    {/* Notes */}
                    <textarea
                      placeholder="ملاحظات خاصة بهذا العنصر"
                      value={item.notes || ''}
                      onChange={(e) => addNotes(item.id, e.target.value)}
                      className="w-full mt-2 p-2 border rounded text-sm resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              {/* Checkout Section */}
              {!showCheckout ? (
                <div className="p-4 border-t">
                  {/* Summary */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span>{formatCurrency(state.subtotal)}</span>
                    </div>
                    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-bold">رسوم التوصيل</span>
                        <div className="text-left">
                          {!selectedLocation ? (
                            <span className="text-xs text-amber-600 font-black animate-pulse bg-amber-50 px-2 py-0.5 rounded">جاري تحديد الموقع...</span>
                          ) : isCalculatingFee ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary inline" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-black ${deliveryDetails?.isFreeDelivery ? "line-through text-gray-400" : "text-gray-900"}`}>
                                {formatCurrency(deliveryFee)}
                              </span>
                              {deliveryDetails?.isFreeDelivery && (
                                <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-black">مجاني</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedLocation && deliveryDetails && !isCalculatingFee && (
                        <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-gray-200/50">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="text-[10px] text-gray-500 font-bold">المسافة: {deliveryDetails.distance.toFixed(1)} كم</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-[10px] text-gray-500 font-bold">⏱ {deliveryDetails.estimatedTime}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>المجموع الكلي:</span>
                      <span className="text-red-500">
                        {formatCurrency(selectedLocation ? state.subtotal + deliveryFee : state.subtotal)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowCheckout(true)}
                    disabled={!selectedLocation || isCalculatingFee}
                    className="w-full bg-red-600 text-white py-6 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {!selectedLocation ? (
                      <>
                        <MapPin size={20} />
                        حدد الموقع للمتابعة
                      </>
                    ) : isCalculatingFee ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        جاري حساب التوصيل...
                      </>
                    ) : (
                      'إتمام الطلب'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 border-t space-y-4">
                  {/* Customer Info */}
                  <div>
                    <h3 className="font-medium mb-2">معلومات العميل</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="الاسم *"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      />
                      <input
                        type="tel"
                        placeholder="رقم الهاتف *"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      />
                      <textarea
                        placeholder="ملاحظات إضافية"
                        value={customerInfo.notes}
                        onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* تحديد الموقع */}
                  <div>
                    <h3 className="font-medium mb-2">موقع التوصيل *</h3>
                    {selectedLocation ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-800">{selectedLocation.area}</p>
                            <p className="text-sm text-green-600">{selectedLocation.address}</p>
                            {deliveryDetails && (
                              <div className="mt-1 space-y-0.5">
                                {deliveryDetails.distance > 0 && (
                                  <p className="text-xs text-green-600">
                                    المسافة: {deliveryDetails.distance.toFixed(2)} كم
                                  </p>
                                )}
                                {deliveryDetails.estimatedTime && (
                                  <p className="text-xs text-green-600 font-medium">
                                    الوقت المتوقع: {deliveryDetails.estimatedTime}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLocationPicker(true)}
                          >
                            تغيير
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowLocationPicker(true)}
                        data-testid="button-select-location"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        تحديد موقع التوصيل
                      </Button>
                    )}
                  </div>

                  {/* طرق الدفع */}
                  <div>
                    <h3 className="font-medium mb-2 text-sm">طريقة الدفع *</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setCustomerInfo({...customerInfo, paymentMethod: method.id})}
                          className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                            customerInfo.paymentMethod === method.id 
                              ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' 
                              : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-xl">{method.icon}</span>
                          <span className="text-[10px] font-black">{method.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-4 border-t mt-4">
                    <Button
                      onClick={handleCheckout}
                      className="w-full bg-red-600 text-white py-7 rounded-2xl font-black text-lg hover:bg-red-700 transition-all shadow-xl flex items-center justify-center gap-2"
                    >
                      تأكيد الطلب بنجاح
                    </Button>
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors text-sm"
                    >
                      رجوع لتعديل السلة
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* نافذة تحديد الموقع */}
      <GoogleMapsLocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={setSelectedLocation}
        restaurantLocation={getRestaurantLocation()}
      />
    </div>
  );
}
