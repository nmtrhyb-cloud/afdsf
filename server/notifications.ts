import { storage } from "./storage";
import type { SendNotificationInput, Notification } from "./notificationService";
import { emitNotification } from "./notificationEvents";

export async function sendSystemNotification(input: SendNotificationInput): Promise<Notification> {
  const notification = await storage.createNotification({
    type: input.type,
    title: input.title,
    message: input.message,
    recipientType: input.recipientType,
    recipientId: input.recipientId,
    orderId: input.orderId,
    isRead: false,
    createdAt: new Date(),
  });

  emitNotification(notification);

  return notification;
}
