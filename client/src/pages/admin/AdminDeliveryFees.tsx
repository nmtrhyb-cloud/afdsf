import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { 
  Truck, 
  MapPin, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Calculator,
  Percent,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import GoogleMapPicker from '@/components/maps/GoogleMapPicker';

interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  minDistance: string;
  maxDistance: string;
  deliveryFee: string;
  estimatedTime?: string;
  isActive: boolean;
}

interface DeliveryFeeSettings {
  id?: string;
  type: 'fixed' | 'per_km' | 'zone_based' | 'restaurant_custom';
  baseFee: string;
  perKmFee: string;
  minFee: string;
  maxFee: string;
  freeDeliveryThreshold: string;
  storeLat?: string;
  storeLng?: string;
}

interface GeoZone {
  id: string;
  name: string;
  description?: string;
  coordinates: string; // JSON
  isActive: boolean;
}

interface DeliveryRule {
  id: string;
  name: string;
  ruleType: 'distance' | 'order_value' | 'zone';
  minDistance?: string;
  maxDistance?: string;
  minOrderValue?: string;
  maxOrderValue?: string;
  geoZoneId?: string;
  fee: string;
  isActive: boolean;
  priority: number;
}

interface DeliveryDiscount {
  id: string;
  name: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: string;
  minOrderValue?: string;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export default function AdminDeliveryFees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('settings');
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // جلب إعدادات رسوم التوصيل
  const { data: settings, isLoading: settingsLoading } = useQuery<DeliveryFeeSettings>({
    queryKey: ['/api/delivery-fees/settings'],
  });

  // جلب مناطق التوصيل
  const { data: zones = [], isLoading: zonesLoading } = useQuery<DeliveryZone[]>({
    queryKey: ['/api/delivery-fees/zones'],
  });

  // جلب المناطق الجغرافية الجديدة
  const { data: geoZones = [], isLoading: geoZonesLoading } = useQuery<GeoZone[]>({
    queryKey: ['/api/delivery-fees/geo-zones'],
  });

  // جلب القواعد
  const { data: deliveryRules = [], isLoading: rulesLoading } = useQuery<DeliveryRule[]>({
    queryKey: ['/api/delivery-fees/rules'],
  });

  // جلب الخصومات
  const { data: discounts = [], isLoading: discountsLoading } = useQuery<DeliveryDiscount[]>({
    queryKey: ['/api/delivery-fees/discounts'],
  });

  // حالة النوافذ المنبثقة
  const [isAddGeoZoneOpen, setIsAddGeoZoneOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isAddDiscountOpen, setIsAddDiscountOpen] = useState(false);

  // حالة العناصر الجديدة
  const [newGeoZone, setNewGeoZone] = useState<Partial<GeoZone>>({
    name: '',
    description: '',
    coordinates: '[]',
    isActive: true
  });

  const [newRule, setNewRule] = useState<Partial<DeliveryRule>>({
    name: '',
    ruleType: 'distance',
    fee: '',
    priority: 0,
    isActive: true
  });

  const [newDiscount, setNewDiscount] = useState<Partial<DeliveryDiscount>>({
    name: '',
    discountType: 'percentage',
    discountValue: '',
    isActive: true
  });

  // Mutations for Geo-Zones
  const addGeoZoneMutation = useMutation({
    mutationFn: async (data: Partial<GeoZone>) => {
      const response = await apiRequest('POST', '/api/delivery-fees/geo-zones', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تمت إضافة المنطقة الجغرافية بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/geo-zones'] });
      setIsAddGeoZoneOpen(false);
    }
  });

  // Mutations for Rules
  const addRuleMutation = useMutation({
    mutationFn: async (data: Partial<DeliveryRule>) => {
      const response = await apiRequest('POST', '/api/delivery-fees/rules', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تمت إضافة القاعدة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/rules'] });
      setIsAddRuleOpen(false);
    }
  });

  // Mutations for Discounts
  const addDiscountMutation = useMutation({
    mutationFn: async (data: Partial<DeliveryDiscount>) => {
      const response = await apiRequest('POST', '/api/delivery-fees/discounts', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تمت إضافة الخصم بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/discounts'] });
      setIsAddDiscountOpen(false);
    }
  });

  // حالة الإعدادات
  const [formSettings, setFormSettings] = useState<DeliveryFeeSettings>({
    type: 'per_km',
    baseFee: '5',
    perKmFee: '2',
    minFee: '3',
    maxFee: '50',
    freeDeliveryThreshold: '0',
    storeLat: '24.7136',
    storeLng: '46.6753'
  });

  const handleLocationSelect = (location: any) => {
    setFormSettings(prev => ({
      ...prev,
      storeLat: location.lat.toString(),
      storeLng: location.lng.toString()
    }));
    setIsMapOpen(false);
  };

  // حالة منطقة جديدة
  const [newZone, setNewZone] = useState({
    name: '',
    description: '',
    minDistance: '0',
    maxDistance: '',
    deliveryFee: '',
    estimatedTime: ''
  });

  // تحديث الإعدادات عند تحميلها
  useEffect(() => {
    if (settings) {
      setFormSettings(settings);
    }
  }, [settings]);

  // حفظ الإعدادات
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: DeliveryFeeSettings) => {
      console.log('📤 جاري إرسال الإعدادات:', data);
      
      // تحويل جميع الأرقام من strings إلى numbers
      const normalizedData = {
        ...data,
        baseFee: data.baseFee ? parseFloat(data.baseFee).toString() : '0',
        perKmFee: data.perKmFee ? parseFloat(data.perKmFee).toString() : '0',
        minFee: data.minFee ? parseFloat(data.minFee).toString() : '0',
        maxFee: data.maxFee ? parseFloat(data.maxFee).toString() : '0',
        freeDeliveryThreshold: data.freeDeliveryThreshold ? parseFloat(data.freeDeliveryThreshold).toString() : '0',
        storeLat: data.storeLat ? parseFloat(data.storeLat).toString() : '',
        storeLng: data.storeLng ? parseFloat(data.storeLng).toString() : '',
      };
      
      console.log('✅ البيانات المحضرة للإرسال:', normalizedData);
      
      const response = await apiRequest('POST', '/api/delivery-fees/settings', normalizedData);
      console.log('📥 الرد من الخادم:', response.status);
      
      const jsonData = await response.json();
      console.log('📋 البيانات المستقبلة:', jsonData);
      
      if (!response.ok) {
        console.error('❌ فشل الحفظ:', jsonData);
        throw new Error(jsonData.message || jsonData.error || 'فشل حفظ الإعدادات');
      }
      
      return jsonData;
    },
    onSuccess: (data: any) => {
      console.log('🎉 تم الحفظ بنجاح!', data);
      toast({ 
        title: 'تم حفظ الإعدادات بنجاح ✅',
        description: data.message || 'تم تطبيق الإعدادات الجديدة',
        duration: 5000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/settings'] });
    },
    onError: (error: any) => {
      console.error('💥 خطأ في حفظ الإعدادات:', error);
      
      let errorMessage = 'حدث خطأ غير متوقع';
      let errorDetails = '';
      
      // محاولة استخراج رسالة الخطأ التفصيلية
      if (error.response) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        if (errorData.validationErrors) {
          errorDetails = errorData.validationErrors
            .map((e: any) => `• ${e.field}: ${e.message}`)
            .join('\n');
        } else if (errorData.details) {
          if (typeof errorData.details === 'string') {
            errorDetails = errorData.details;
          } else if (errorData.details.issue) {
            errorDetails = errorData.details.issue;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('📋 تفاصيل الخطأ:', {
        message: errorMessage,
        details: errorDetails,
        fullError: error
      });
      
      // عرض الخطأ في Toast مع التفاصيل
      if (errorDetails) {
        toast({ 
          title: 'خطأ في حفظ الإعدادات ❌', 
          description: `${errorMessage}\n\n${errorDetails}`,
          variant: 'destructive',
          duration: 8000
        });
      } else {
        toast({ 
          title: 'خطأ في حفظ الإعدادات ❌', 
          description: errorMessage,
          variant: 'destructive',
          duration: 6000
        });
      }
    }
  });

  // إضافة منطقة
  const addZoneMutation = useMutation({
    mutationFn: async (data: typeof newZone) => {
      const response = await apiRequest('POST', '/api/delivery-fees/zones', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تمت إضافة المنطقة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/zones'] });
      setIsAddZoneOpen(false);
      setNewZone({
        name: '',
        description: '',
        minDistance: '0',
        maxDistance: '',
        deliveryFee: '',
        estimatedTime: ''
      });
    },
    onError: () => {
      toast({ title: 'خطأ في إضافة المنطقة', variant: 'destructive' });
    }
  });

  // حذف منطقة
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/delivery-fees/zones/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم حذف المنطقة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/zones'] });
    },
    onError: () => {
      toast({ title: 'خطأ في حذف المنطقة', variant: 'destructive' });
    }
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة رسوم التوصيل</h1>
          <p className="text-muted-foreground">تحكم في طريقة حساب رسوم التوصيل</p>
        </div>
        <Truck className="h-8 w-8 text-primary" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات العامة
          </TabsTrigger>
          <TabsTrigger value="zones" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            مناطق المسافات
          </TabsTrigger>
          <TabsTrigger value="geo-zones" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            المناطق الجغرافية
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            القواعد الديناميكية
          </TabsTrigger>
          <TabsTrigger value="discounts" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            الخصومات
          </TabsTrigger>
        </TabsList>

        {/* إعدادات رسوم التوصيل */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>طريقة حساب رسوم التوصيل</CardTitle>
              <CardDescription>
                اختر كيفية حساب رسوم التوصيل للطلبات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* نوع الحساب */}
              <div className="space-y-2">
                <Label>نوع الحساب</Label>
                <Select 
                  value={formSettings.type} 
                  onValueChange={(value: DeliveryFeeSettings['type']) => 
                    setFormSettings(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">رسوم ثابتة</SelectItem>
                    <SelectItem value="per_km">حسب المسافة (لكل كيلومتر)</SelectItem>
                    <SelectItem value="zone_based">حسب المناطق</SelectItem>
                    <SelectItem value="restaurant_custom">حسب إعدادات المطعم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* الرسوم الأساسية */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الرسوم الأساسية (ريال)</Label>
                  <Input
                    type="number"
                    value={formSettings.baseFee}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, baseFee: e.target.value }))}
                    placeholder="5"
                  />
                </div>

                {formSettings.type === 'per_km' && (
                  <div className="space-y-2">
                    <Label>رسوم لكل كيلومتر (ريال)</Label>
                    <Input
                      type="number"
                      value={formSettings.perKmFee}
                      onChange={(e) => setFormSettings(prev => ({ ...prev, perKmFee: e.target.value }))}
                      placeholder="2"
                    />
                  </div>
                )}
              </div>

              {/* الحد الأدنى والأقصى */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الحد الأدنى للرسوم (ريال)</Label>
                  <Input
                    type="number"
                    value={formSettings.minFee}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, minFee: e.target.value }))}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأقصى للرسوم (ريال)</Label>
                  <Input
                    type="number"
                    value={formSettings.maxFee}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, maxFee: e.target.value }))}
                    placeholder="50"
                  />
                </div>
              </div>

              {/* حد التوصيل المجاني */}
              <div className="space-y-2">
                <Label>حد التوصيل المجاني (ريال)</Label>
                <Input
                  type="number"
                  value={formSettings.freeDeliveryThreshold}
                  onChange={(e) => setFormSettings(prev => ({ ...prev, freeDeliveryThreshold: e.target.value }))}
                  placeholder="0 = معطل"
                />
                <p className="text-xs text-muted-foreground">
                  إذا كان المجموع الفرعي للطلب أكبر من هذا المبلغ، يكون التوصيل مجاني. اتركه 0 لتعطيل هذه الميزة.
                </p>
              </div>

              {/* موقع المتجر الرئيسي */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">موقع المتجر الرئيسي</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  يتم استخدام هذا الموقع كنقطة انطلاق لحساب مسافة التوصيل للعميل.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>خط العرض (Latitude)</Label>
                    <Input
                      type="text"
                      value={formSettings.storeLat}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>خط الطول (Longitude)</Label>
                    <Input
                      type="text"
                      value={formSettings.storeLng}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={() => setIsMapOpen(true)}
                  className="w-full gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  تحديد الموقع على الخريطة
                </Button>
              </div>

              {/* معادلة الحساب */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4" />
                    <span className="font-medium">معادلة الحساب</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formSettings.type === 'fixed' && (
                      <>رسوم التوصيل = {formSettings.baseFee} ريال (ثابت)</>
                    )}
                    {formSettings.type === 'per_km' && (
                      <>رسوم التوصيل = {formSettings.baseFee} + (المسافة × {formSettings.perKmFee}) ريال</>
                    )}
                    {formSettings.type === 'zone_based' && (
                      <>رسوم التوصيل = حسب منطقة التوصيل المحددة</>
                    )}
                    {formSettings.type === 'restaurant_custom' && (
                      <>رسوم التوصيل = حسب إعدادات كل مطعم</>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Button 
                onClick={() => saveSettingsMutation.mutate(formSettings)}
                disabled={saveSettingsMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* المناطق الجغرافية */}
        <TabsContent value="geo-zones" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>المناطق الجغرافية (Geo-Zones)</CardTitle>
                <CardDescription>تحديد مناطق جغرافية دقيقة باستخدام الإحداثيات</CardDescription>
              </div>
              <Dialog open={isAddGeoZoneOpen} onOpenChange={setIsAddGeoZoneOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />إضافة منطقة جغرافية</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>إضافة منطقة جغرافية جديدة</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم المنطقة</Label>
                      <Input value={newGeoZone.name} onChange={(e) => setNewGeoZone(prev => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>الإحداثيات (JSON)</Label>
                      <Input value={newGeoZone.coordinates} onChange={(e) => setNewGeoZone(prev => ({ ...prev, coordinates: e.target.value }))} placeholder='[{"lat": 15.1, "lng": 44.1}, ...]' />
                    </div>
                    <Button onClick={() => addGeoZoneMutation.mutate(newGeoZone)} disabled={addGeoZoneMutation.isPending} className="w-full">حفظ المنطقة</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {geoZonesLoading ? <p>جاري التحميل...</p> : (
                <div className="space-y-4">
                  {geoZones.map(zone => (
                    <Card key={zone.id} className="p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{zone.name}</h4>
                        <p className="text-xs text-muted-foreground">{zone.coordinates.substring(0, 50)}...</p>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => apiRequest('DELETE', `/api/delivery-fees/geo-zones/${zone.id}`, {}).then(() => queryClient.invalidateQueries({queryKey: ['/api/delivery-fees/geo-zones']}))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* القواعد الديناميكية */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>القواعد الديناميكية</CardTitle>
                <CardDescription>قواعد مخصصة لحساب الرسوم بناءً على شروط معينة</CardDescription>
              </div>
              <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />إضافة قاعدة</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>إضافة قاعدة جديدة</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم القاعدة</Label>
                      <Input value={newRule.name} onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>نوع القاعدة</Label>
                      <Select value={newRule.ruleType} onValueChange={(v: any) => setNewRule(prev => ({ ...prev, ruleType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="distance">حسب المسافة</SelectItem>
                          <SelectItem value="order_value">حسب قيمة الطلب</SelectItem>
                          <SelectItem value="zone">حسب المنطقة الجغرافية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الرسوم (ريال)</Label>
                      <Input type="number" value={newRule.fee} onChange={(e) => setNewRule(prev => ({ ...prev, fee: e.target.value }))} />
                    </div>
                    {newRule.ruleType === 'zone' && (
                      <div className="space-y-2">
                        <Label>المنطقة الجغرافية</Label>
                        <Select value={newRule.geoZoneId} onValueChange={(v) => setNewRule(prev => ({ ...prev, geoZoneId: v }))}>
                          <SelectTrigger><SelectValue placeholder="اختر منطقة" /></SelectTrigger>
                          <SelectContent>
                            {geoZones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={() => addRuleMutation.mutate(newRule)} disabled={addRuleMutation.isPending} className="w-full">حفظ القاعدة</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {rulesLoading ? <p>جاري التحميل...</p> : (
                <div className="space-y-4">
                  {deliveryRules.map(rule => (
                    <Card key={rule.id} className="p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-primary font-bold">{rule.fee} ريال</p>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => apiRequest('DELETE', `/api/delivery-fees/rules/${rule.id}`, {}).then(() => queryClient.invalidateQueries({queryKey: ['/api/delivery-fees/rules']}))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* الخصومات */}
        <TabsContent value="discounts" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>خصومات التوصيل</CardTitle>
                <CardDescription>عروض وخصومات على رسوم التوصيل</CardDescription>
              </div>
              <Dialog open={isAddDiscountOpen} onOpenChange={setIsAddDiscountOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />إضافة خصم</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>إضافة خصم جديد</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم الخصم</Label>
                      <Input value={newDiscount.name} onChange={(e) => setNewDiscount(prev => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>نوع الخصم</Label>
                        <Select value={newDiscount.discountType} onValueChange={(v: any) => setNewDiscount(prev => ({ ...prev, discountType: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">نسبة مئوية</SelectItem>
                            <SelectItem value="fixed_amount">مبلغ ثابت</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>القيمة</Label>
                        <Input type="number" value={newDiscount.discountValue} onChange={(e) => setNewDiscount(prev => ({ ...prev, discountValue: e.target.value }))} />
                      </div>
                    </div>
                    <Button onClick={() => addDiscountMutation.mutate(newDiscount)} disabled={addDiscountMutation.isPending} className="w-full">حفظ الخصم</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {discountsLoading ? <p>جاري التحميل...</p> : (
                <div className="space-y-4">
                  {discounts.map(discount => (
                    <Card key={discount.id} className="p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{discount.name}</h4>
                        <p className="text-sm font-bold text-green-600">
                          {discount.discountType === 'percentage' ? `${discount.discountValue}%` : `${discount.discountValue} ريال`}
                        </p>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => apiRequest('DELETE', `/api/delivery-fees/discounts/${discount.id}`, {}).then(() => queryClient.invalidateQueries({queryKey: ['/api/delivery-fees/discounts']}))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <GoogleMapPicker
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={{
          lat: parseFloat(formSettings.storeLat || '24.7136'),
          lng: parseFloat(formSettings.storeLng || '46.6753')
        }}
      />
    </div>
  );
}
