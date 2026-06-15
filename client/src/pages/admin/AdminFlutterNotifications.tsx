import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Send, Smartphone, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DeviceToken {
  id: string;
  token: string;
  platform: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SendNotificationData {
  title: string;
  message: string;
  type: string;
}

async function fetchDeviceTokens(): Promise<{ tokens: DeviceToken[]; count: number }> {
  const res = await fetch('/api/flutter/device-tokens');
  if (!res.ok) throw new Error('فشل في جلب الأجهزة');
  return res.json();
}

async function sendFlutterNotification(data: SendNotificationData) {
  const res = await fetch('/api/flutter/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('فشل في إرسال الإشعار');
  return res.json();
}

export default function AdminFlutterNotifications() {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', message: '', type: 'info' });

  const { data: devicesData, isLoading: loadingDevices } = useQuery({
    queryKey: ['/api/flutter/device-tokens'],
    queryFn: fetchDeviceTokens,
    refetchInterval: 30000,
  });

  const sendMutation = useMutation({
    mutationFn: sendFlutterNotification,
    onSuccess: () => {
      toast({
        title: 'تم إرسال الإشعار ✅',
        description: `سيتلقى التطبيق الإشعار في المرة القادمة التي يتصل فيها بالخادم`,
      });
      setForm({ title: '', message: '', type: 'info' });
    },
    onError: () => {
      toast({
        title: 'خطأ في الإرسال',
        description: 'تعذّر إرسال الإشعار، يرجى المحاولة مجدداً',
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({
        title: 'بيانات ناقصة',
        description: 'يرجى إدخال عنوان ومحتوى الإشعار',
        variant: 'destructive',
      });
      return;
    }
    sendMutation.mutate(form);
  };

  const notificationTypes = [
    { value: 'info', label: 'معلومات', color: 'bg-blue-100 text-blue-800' },
    { value: 'offer', label: 'عرض خاص', color: 'bg-orange-100 text-orange-800' },
    { value: 'order', label: 'طلب', color: 'bg-green-100 text-green-800' },
    { value: 'alert', label: 'تنبيه', color: 'bg-red-100 text-red-800' },
  ];

  const devices = devicesData?.tokens ?? [];
  const androidCount = devices.filter(d => d.platform === 'android').length;
  const iosCount = devices.filter(d => d.platform === 'ios').length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <Bell className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إشعارات تطبيق الجوال</h1>
          <p className="text-gray-500 text-sm">أرسل إشعارات لمستخدمي تطبيق طمطوم مباشرةً عبر الخادم</p>
        </div>
      </div>

      {/* إحصاء الأجهزة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-green-100">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إجمالي الأجهزة</p>
                <p className="text-3xl font-bold text-green-600">
                  {loadingDevices ? '...' : devicesData?.count ?? 0}
                </p>
              </div>
              <Users className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Android</p>
                <p className="text-3xl font-bold text-gray-800">
                  {loadingDevices ? '...' : androidCount}
                </p>
              </div>
              <Smartphone className="h-10 w-10 text-gray-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">iOS</p>
                <p className="text-3xl font-bold text-gray-800">
                  {loadingDevices ? '...' : iosCount}
                </p>
              </div>
              <Smartphone className="h-10 w-10 text-gray-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* آلية عمل الإشعارات */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-semibold">كيف تعمل الإشعارات؟</p>
              <p>عند إرسال إشعار، يُحفظ في قاعدة البيانات. تطبيق الجوال يتحقق من الإشعارات الجديدة كل 30 ثانية تلقائياً ويعرضها كإشعارات محلية على الجهاز.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إرسال إشعار */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            إرسال إشعار جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* نوع الإشعار */}
          <div className="space-y-2">
            <Label>نوع الإشعار</Label>
            <div className="flex flex-wrap gap-2">
              {notificationTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setForm(f => ({ ...f, type: type.value }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                    form.type === type.value
                      ? 'border-green-500 ' + type.color
                      : 'border-transparent bg-gray-100 text-gray-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* عنوان الإشعار */}
          <div className="space-y-2">
            <Label htmlFor="notif-title">عنوان الإشعار *</Label>
            <Input
              id="notif-title"
              placeholder="مثال: عرض خاص اليوم فقط!"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* محتوى الإشعار */}
          <div className="space-y-2">
            <Label htmlFor="notif-message">محتوى الإشعار *</Label>
            <Textarea
              id="notif-message"
              placeholder="مثال: احصل على خصم 20% على جميع الخضار الطازجة اليوم..."
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              className="text-right min-h-[100px]"
              dir="rtl"
            />
          </div>

          {/* معاينة الإشعار */}
          {(form.title || form.message) && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-400 mb-2">معاينة</p>
              <div className="bg-white rounded-lg p-3 shadow-sm flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-white text-xs">🛒</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {form.title || 'عنوان الإشعار'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {form.message || 'محتوى الإشعار...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            {sendMutation.isPending ? (
              <>جارٍ الإرسال...</>
            ) : (
              <>
                <Send className="h-4 w-4" />
                إرسال الإشعار لجميع مستخدمي التطبيق
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* قائمة الأجهزة المسجّلة */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              الأجهزة المسجّلة ({devices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {devices.map(device => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500 font-mono">
                      {device.token.substring(0, 20)}...
                    </span>
                  </div>
                  <Badge variant={device.platform === 'ios' ? 'secondary' : 'default'}>
                    {device.platform}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
