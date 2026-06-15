import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SocketMessage } from '@/server/socket';

export function useNotificationSync(userId?: string, userType = 'customer') {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const disconnect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (typeof window === 'undefined') return;

    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/ws`;

    const connect = () => {
      try {
        disconnect();
      } catch {}

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        ws.send(
          JSON.stringify({
            type: 'auth',
            payload: { userId, userType },
          })
        );
      });

      ws.addEventListener('message', (event) => {
        try {
          const message: SocketMessage = JSON.parse(event.data);
          if (message.type === 'NEW_NOTIFICATION') {
            const key = ['/api/notifications/customer', userType === 'driver' ? userId : undefined, userType === 'customer' ? userId : undefined];
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          }
          if (message.type === 'notifications_updated') {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
          }
          if (message.type === 'order_status_changed' || message.type === 'order_update') {
            queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          }
        } catch {}
      });

      ws.addEventListener('close', () => {
        reconnectTimerRef.current = setTimeout(connect, 2000);
      });

      ws.addEventListener('error', () => {
        reconnectTimerRef.current = setTimeout(connect, 2000);
      });
    };

    connect();

    return () => {
      disconnect();
    };
  }, [userId, userType, queryClient, disconnect]);

  return { ws: wsRef.current };
}
