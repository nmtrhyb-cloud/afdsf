import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Package, ChevronLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function CustomerNotificationsPanel({ userPhone, userId }: { userPhone?: string; userId?: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications/customer', userPhone || userId],
    queryFn: async () => {
      const url = new URL('/api/notifications/customer', window.location.origin);
      if (userPhone) url.searchParams.set('phone', userPhone);
      else if (userId) url.searchParams.set('customerId', userId);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    enabled: open,
    staleTime: 0,
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length || 0;

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/customer/mark-all-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: userPhone, customerId: userId }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
    },
  });

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'order':
      case 'order_status_update':
      case 'scheduled_order_ready':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'driver_assigned':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'offer':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'payment':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'alert':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      info: 'معلومات',
      offer: 'عرض',
      order: 'طلب',
      alert: 'تنبيه',
      system: 'نظام',
      payment: 'دفع',
      driver_assigned: 'تعيين سائق',
      order_status_update: 'تحديث الطلب',
      scheduled_order_ready: 'طلب مجدول',
      new_wasalni_request: 'طلب توصيل',
      wasalni_status_update: 'تحديث التوصيل',
    };
    return map[type] || type;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="h-6 w-6 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-black border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between text-right">
            <span>الإشعارات</span>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-bold"
              >
                <CheckCheck className="h-4 w-4 ml-2" />
                تعليم الكل كمقروء
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3 max-h-[calc(100vh-100px)] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">لا توجد إشعارات</p>
            </div>
          ) : (
            notifications
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((n: any) => (
                <Card
                  key={n.id}
                  className={`cursor-pointer transition-all ${
                    !n.isRead ? 'border-blue-200 bg-blue-50/30 shadow-sm' : 'border-gray-100'
                  }`}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n.id);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl border ${getStatusColor(n.type)}`}>
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm text-gray-900 truncate">{n.title}</h4>
                          {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {getTypeLabel(n.type)}
                          </Badge>
                          <span className="text-[10px] text-gray-400 font-bold">
                            {new Date(n.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
