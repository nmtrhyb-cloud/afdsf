import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Send, Trash2, Filter, Smartphone, Bell, BarChart3, Users } from 'lucide-react';

export default function AdminFlutterNotifications() {
  const Select = ({ value, onValueChange, children, className = '' }: any) => (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none ${className}`}
    >
      {children}
    </select>
  );

  const [tab, setTab] = useState('send');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [recipientType, setRecipientType] = useState('all');
  const [filterType, setFilterType] = useState('');
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('send');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [recipientType, setRecipientType] = useState('all');
  const [filterType, setFilterType] = useState('');
  const queryClient = useQueryClient();

  const { data: history = [] } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?recipientType=all');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    enabled: tab === 'history',
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/flutter/notifications/stats'],
    queryFn: async () => {
      const res = await fetch('/api/flutter/notifications/stats');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    enabled: tab === 'stats',
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['/api/flutter/device-tokens'],
    queryFn: async () => {
      const res = await fetch('/api/flutter/device-tokens');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    enabled: tab === 'devices',
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/flutter/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type, recipientType }),
      });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    onSuccess: () => {
      setTitle('');
      setMessage('');
      toast({ title: '✅ تم إرسال الإشعار بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: () => {
      toast({ title: '❌ فشل الإرسال', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({ title: '✅ تم حذف الإشعار' });
    },
  });

  const getTypeColor = (n: string) => {
    switch (n) {
      case 'order':
      case 'order_status_update': return 'bg-blue-50 text-blue-700';
      case 'offer': return 'bg-orange-50 text-orange-700';
      case 'driver_assigned': return 'bg-purple-50 text-purple-700';
      case 'payment': return 'bg-green-50 text-green-700';
      case 'alert': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const filteredHistory = filterType ? history.filter((n: any) => n.type === filterType) : history;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="send" className="data-[state=active]:bg-[#388e3c] data-[state=active]:text-white">
            <Send className="h-4 w-4 ml-2" />
            إرسال إشعار
          </TabsTrigger>
          <TabsTrigger value="marketing" className="data-[state=active]:bg-[#388e3c] data-[state=active]:text-white">
            <Users className="h-4 w-4 ml-2" />
            تسويق ذكي
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-[#388e3c] data-[state=active]:text-white">
            <Bell className="h-4 w-4 ml-2" />
            سجل الإشعارات
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-[#388e3c] data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 ml-2" />
            إحصائيات
          </TabsTrigger>
          <TabsTrigger value="devices" className="data-[state=active]:bg-[#388e3c] data-[state=active]:text-white">
            <Smartphone className="h-4 w-4 ml-2" />
            الأجهزة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card>
            <CardHeader><CardTitle>إرسال إشعار جديد</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 mb-1 uppercase">المستلم</label>
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <option value="all">الجميع</option>
                    <option value="customer">العملاء</option>
                    <option value="driver">السائقين</option>
                    <option value="flutter">أجهزة التطبيق</option>
                    <option value="admin">الإدارة</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 mb-1 uppercase">نوع الإشعار</label>
                  <Select value={type} onValueChange={setType}>
                    <option value="info">معلومات</option>
                    <option value="order">طلب</option>
                    <option value="order_status_update">تحديث الطلب</option>
                    <option value="offer">عرض</option>
                    <option value="driver_assigned">تعيين سائق</option>
                    <option value="payment">دفع</option>
                    <option value="alert">تنبيه</option>
                    <option value="system">نظام</option>
                    <option value="new_wasalni_request">طلب توصيل</option>
                    <option value="wasalni_status_update">تحديث التوصيل</option>
                    <option value="scheduled_order_ready">طلب مجدول</option>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 mb-1 uppercase">العنوان</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-bold" placeholder="عنوان الإشعار" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 mb-1 uppercase">المحتوى</label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="font-bold" placeholder="نص الإشعار" rows={3} />
              </div>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !title || !message}
                className="w-full bg-[#388e3c] hover:bg-[#2e7d32] text-white font-black py-3"
              >
                <Send className="h-4 w-4 ml-2" />
                إرسال الإشعار
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing">
          <Card>
            <CardHeader><CardTitle>تسويق ذكي</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 font-bold">يتم استهداف عملاء غير نشطين (1/3/7/14/30 يوم)</p>
              <Button
                onClick={async () => {
                  const res = await fetch('/api/admin/marketing/send-mass-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'عرض خاص!', message: 'نستعيدك!', inactiveDays: 7 }),
                  });
                  if (!res.ok) return toast({ title: '❌ فشل الإرسال', variant: 'destructive' });
                  toast({ title: '✅ تم إرسال التسويق' });
                  queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
                }}
                className="mt-4 w-full bg-[#388e3c] hover:bg-[#2e7d32] text-white font-black"
              >
                إرسال لعملاء غير نشطين (7 أيام)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                سجل الإشعارات
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <option value="">كل الأنواع</option>
                    <option value="info">معلومات</option>
                    <option value="order">طلب</option>
                    <option value="offer">عرض</option>
                    <option value="alert">تنبيه</option>
                    <option value="driver_assigned">تعيين سائق</option>
                    <option value="payment">دفع</option>
                    <option value="scheduled_order_ready">طلب مجدول</option>
                    <option value="new_wasalni_request">طلب واصل لي</option>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredHistory.length === 0 && <p className="text-center text-gray-500 font-bold py-8">لا توجد إشعارات</p>}
              {filteredHistory.map((n: any) => (
                <div key={n.id} className={`p-4 rounded-2xl border ${getTypeColor(n.type)} relative`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-sm">{n.title}</h4>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {n.recipientType}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-2 font-bold">
                        {new Date(n.createdAt).toLocaleString('ar-SA')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate(n.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader><CardTitle>إحصائيات الإشعارات</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 p-4 rounded-xl overflow-auto">
                {stats ? JSON.stringify(stats, null, 2) : 'جاري تحميل الإحصائيات...'}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                الأجهزة المسجّلة
                <Badge>{devices?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(!devices || devices.length === 0) ? (
                <p className="text-center text-gray-500 font-bold py-8">لا توجد أجهزة مسجّلة</p>
              ) : devices.map((device: any) => (
                <div key={device.id} className={`p-3 rounded-xl border ${device.isActive ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black">{device.token?.slice(0, 20)}...</p>
                      <p className="text-xs text-gray-500 font-bold">{device.platform} • {device.isActive ? 'نشط' : 'معطّل'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
