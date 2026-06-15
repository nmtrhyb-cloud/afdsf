import { storage } from "./storage";
import type { InsertNotification, Notification } from "../../shared/schema";

type MessageType = "info" | "offer" | "order" | "alert" | "system" | "payment"
  | "driver_assigned" | "order_status_update" | "scheduled_order_ready"
  | "new_wasalni_request" | "wasalni_status_update";

type RecipientType = "customer" | "driver" | "admin" | "all" | "flutter";

export interface SendNotificationInput {
  type: MessageType;
  title: string;
  message: string;
  recipientType: RecipientType;
  recipientId?: string | null;
  orderId?: string | null;
}

let wsBroadcast: ((type: string, payload: any) => void) | null = null;
let wsSendToDriver: ((driverId: string, type: string, payload: any) => void) | null = null;
let wsSendToAdmin: ((type: string, payload: any) => void) | null = null;
let wsSendToUser: ((userId: string, type: string, payload: any) => void) | null = null;

export function setNotificationWsHandlers(handlers: {
  broadcast: (type: string, payload: any) => void;
  sendToDriver: (driverId: string, type: string, payload: any) => void;
  sendToAdmin: (type: string, payload: any) => void;
  sendToUser: (userId: string, type: string, payload: any) => void;
}) {
  wsBroadcast = handlers.broadcast;
  wsSendToDriver = handlers.sendToDriver;
  wsSendToAdmin = handlers.sendToAdmin;
  wsSendToUser = handlers.sendToUser;
}

export async function sendNotification(input: SendNotificationInput): Promise<Notification> {
  const { type, title, message, recipientType, recipientId, orderId } = input;

  const notification = await storage.createNotification({
    type,
    title,
    message,
    recipientType,
    recipientId: recipientId ?? undefined,
    orderId: orderId ?? undefined,
    isRead: false,
  });

  if (wsBroadcast) {
    const payload: any = { notification };

    if (recipientType === "customer" || recipientType === "all" || recipientType === "flutter") {
      if (!recipientId || recipientId === "all") {
        wsBroadcast("NEW_NOTIFICATION", payload);
      } else {
        if (wsSendToUser) {
          wsSendToUser(recipientId, "NEW_NOTIFICATION", payload);
        }
        if (orderId && wsBroadcast) {
          wsBroadcast("NEW_NOTIFICATION", payload);
        }
      }
    } else if (recipientType === "driver") {
      if (recipientId && wsSendToDriver) {
        wsSendToDriver(recipientId, "NEW_NOTIFICATION", payload);
      }
      if (wsSendToAdmin) {
        wsSendToAdmin("NEW_NOTIFICATION", payload);
      }
    } else if (recipientType === "admin") {
      if (wsSendToAdmin) {
        wsSendToAdmin("NEW_NOTIFICATION", payload);
      }
    }
  }

  return notification;
}
