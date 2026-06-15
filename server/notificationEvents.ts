import type { Notification } from "../../shared/schema";

type NotifyHandler = (type: string, payload: any) => void;

let broadcastHandler: NotifyHandler | null = null;
let sendToDriverHandler: ((driverId: string, type: string, payload: any) => void) | null = null;
let sendToAdminHandler: NotifyHandler | null = null;
let sendToUserHandler: ((userId: string, type: string, payload: any) => void) | null = null;

export function registerNotificationHandlers(handlers: {
  broadcast: NotifyHandler;
  sendToDriver: (driverId: string, type: string, payload: any) => void;
  sendToAdmin: NotifyHandler;
  sendToUser: (userId: string, type: string, payload: any) => void;
}) {
  broadcastHandler = handlers.broadcast;
  sendToDriverHandler = handlers.sendToDriver;
  sendToAdminHandler = handlers.sendToAdmin;
  sendToUserHandler = handlers.sendToUser;
}

export async function emitNotification(notification: Notification) {
  const payload = { notification };

  if (notification.recipientType === "customer" || notification.recipientType === "all" || notification.recipientType === "flutter") {
    if (!notification.recipientId || notification.recipientId === "all") {
      broadcastHandler?.("NEW_NOTIFICATION", payload);
    } else {
      sendToUserHandler?.(notification.recipientId, "NEW_NOTIFICATION", payload);
      if (notification.orderId) {
        broadcastHandler?.("NEW_NOTIFICATION", payload);
      }
    }
  } else if (notification.recipientType === "driver") {
    if (notification.recipientId) {
      sendToDriverHandler?.(notification.recipientId, "NEW_NOTIFICATION", payload);
    }
    sendToAdminHandler?.("NEW_NOTIFICATION", payload);
  } else if (notification.recipientType === "admin") {
    sendToAdminHandler?.("NEW_NOTIFICATION", payload);
  }
}
