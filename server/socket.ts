import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./viteServer";
import { storage } from "./storage";
import { registerNotificationHandlers, emitNotification } from "./notificationEvents";

export interface SocketMessage {
  type: string;
  payload: any;
}

interface UserConnection {
  ws: WebSocket;
  userId: string;
  userType?: string;
  connectionKey: string;
  orderId?: string;
  isAlive: boolean;
}

export function setupWebSockets(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const clients = new Map<string, UserConnection>();
  const userConnections = new Map<string, WebSocket[]>();
  const orderTrackers = new Map<string, WebSocket[]>();

  registerNotificationHandlers({
    broadcast: (type, payload) => {
      const message = JSON.stringify({ type, payload });
      wss.clients.forEach((client) => {
        if ((client as any).readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
    sendToDriver: (driverId, type, payload) => {
      const connections = userConnections.get(`driver_${driverId}`) || [];
      const message = JSON.stringify({ type, payload });
      connections.forEach((client) => {
        if ((client as any).readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
    sendToAdmin: (type, payload) => {
      const connections = userConnections.get("admin_dashboard") || [];
      const message = JSON.stringify({ type, payload });
      connections.forEach((client) => {
        if ((client as any).readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
    sendToUser: (userId, type, payload) => {
      const connections = userConnections.get(userId) || [];
      const message = JSON.stringify({ type, payload });
      connections.forEach((client) => {
        if ((client as any).readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("connection", (ws: any, req) => {
    log(`New WS connection from ${req.socket.remoteAddress}`);
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (data) => {
      try {
        const message: SocketMessage = JSON.parse(data.toString());
        handleMessage(ws, message, clients, userConnections, orderTrackers, wss);
      } catch (err) {
        log(`Failed to parse WS message: ${err}`);
      }
    });

    ws.on("close", () => {
      for (const [id, connection] of clients.entries()) {
        if (connection.ws === ws) {
          const connectionKey = connection.connectionKey;
          const orderId = connection.orderId;

          clients.delete(id);

          const connections = userConnections.get(connectionKey) || [];
          const index = connections.indexOf(ws);
          if (index > -1) {
            connections.splice(index, 1);
          }

          if (connections.length === 0) {
            userConnections.delete(connectionKey);
          }

          if (orderId) {
            const trackers = orderTrackers.get(orderId) || [];
            const tIndex = trackers.indexOf(ws);
            if (tIndex > -1) {
              trackers.splice(tIndex, 1);
            }
            if (trackers.length === 0) {
              orderTrackers.delete(orderId);
            }
          }
          break;
        }
      }
    });
  });

  return {
    broadcast: (type: string, payload: any) => {
      const message = JSON.stringify({ type, payload });
      wss.clients.forEach((client) => {
        if ((client as any).readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });

      if (type === "order_update" && payload.orderId) {
        const trackers = orderTrackers.get(payload.orderId) || [];
        trackers.forEach((client) => {
          if ((client as any).readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    },
    sendToUser: (userId: string, type: string, payload: any) => {
      const connections = userConnections.get(userId) || [];
      const message = JSON.stringify({ type, payload });

      connections.forEach((client) => {
        if ((client as any).readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
    sendToDriver: (driverId: string, type: string, payload: any) => {
      const connections = userConnections.get(`driver_${driverId}`) || [];
      const message = JSON.stringify({ type, payload });

      connections.forEach((client) => {
        if ((client as any).readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
    sendToAdmin: (type: string, payload: any) => {
      const connections = userConnections.get("admin_dashboard") || [];
      const message = JSON.stringify({ type, payload });

      connections.forEach((client) => {
        if ((client as any).readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    },
  };
}

async function handleMessage(
  ws: WebSocket,
  message: SocketMessage,
  clients: Map<string, UserConnection>,
  userConnections: Map<string, WebSocket[]>,
  orderTrackers: Map<string, WebSocket[]>,
  wss: WebSocketServer
) {
  switch (message.type) {
    case "auth":
      if (message.payload.userId) {
        const userId = message.payload.userId;
        const userType = message.payload.userType || "customer";

        const connectionKey = userType === "driver" ? `driver_${userId}` : userId;

        clients.set(`${userId}_${Date.now()}`, {
          ws,
          userId,
          userType,
          connectionKey,
        });

        const connections = userConnections.get(connectionKey) || [];
        connections.push(ws);
        userConnections.set(connectionKey, connections);

        log(`User ${userId} (${userType}) authenticated via WS with key ${connectionKey}`);
      }
      break;

    case "track_order":
      if (message.payload.orderId) {
        const orderId = message.payload.orderId;

        for (const [id, connection] of clients.entries()) {
          if (connection.ws === ws) {
            connection.orderId = orderId;
            break;
          }
        }

        const trackers = orderTrackers.get(orderId) || [];
        if (!trackers.includes(ws)) {
          trackers.push(ws);
        }
        orderTrackers.set(orderId, trackers);
        log(`Client tracking order ${orderId} via WS`);
      }
      break;

    case "location_update":
      const { driverId, latitude, longitude } = message.payload;
      if (driverId && latitude && longitude) {
        const broadcastMsg = JSON.stringify({
          type: "driver_location",
          payload: { driverId, latitude, longitude, timestamp: Date.now() },
        });

        wss.clients.forEach((client) => {
          if ((client as any).readyState === WebSocket.OPEN) {
            client.send(broadcastMsg);
          }
        });
      }
      break;

    case "driver_assigned":
      const payload = message.payload;
      const orderId = payload.orderId;
      const assignedDriverId = payload.driverId;
      const driverName = payload.driverName;
      if (orderId && assignedDriverId) {
        const notificationMsg = JSON.stringify({
          type: "new_order_assigned",
          payload: {
            orderId,
            driverId: assignedDriverId,
            driverName,
            timestamp: Date.now(),
          },
        });

        const driverConnections = userConnections.get(`driver_${assignedDriverId}`) || [];
        driverConnections.forEach((client) => {
          if ((client as any).readyState === WebSocket.OPEN) {
            client.send(notificationMsg);
          }
        });
      }
      break;

    case "order_update":
      const updatePayload = message.payload;
      const updateOrderId = updatePayload.orderId;
      const status = updatePayload.status;
      const updateMessage = updatePayload.message;
      if (updateOrderId && status) {
        const updateMsg = JSON.stringify({
          type: "order_status_changed",
          payload: {
            orderId: updateOrderId,
            status,
            message: updateMessage,
            timestamp: Date.now(),
          },
        });

        wss.clients.forEach((client) => {
          if ((client as any).readyState === WebSocket.OPEN) {
            client.send(updateMsg);
          }
        });
      }
      break;

    case "send_chat_message":
      const msgPayload = message.payload;
      const msgOrderId = msgPayload.orderId;
      const senderId = msgPayload.senderId;
      const senderType = msgPayload.senderType;
      const receiverId = msgPayload.receiverId;
      const receiverType = msgPayload.receiverType;
      const content = msgPayload.content;

      if (msgOrderId && senderId && receiverId && content) {
        try {
          const newMessage = await storage.createMessage({
            orderId: msgOrderId,
            senderId,
            senderType: senderType || "customer",
            receiverId,
            receiverType: receiverType || "driver",
            content,
            isRead: false,
          });

          const chatMsg = JSON.stringify({
            type: "new_chat_message",
            payload: newMessage,
          });

          const receiverKey = receiverType === "driver" ? `driver_${receiverId}` : receiverId;
          const receiverConnections = userConnections.get(receiverKey) || [];
          receiverConnections.forEach((client) => {
            if ((client as any).readyState === WebSocket.OPEN) {
              client.send(chatMsg);
            }
          });

          const senderKey = senderType === "driver" ? `driver_${senderId}` : senderId;
          const senderConnections = userConnections.get(senderKey) || [];
          senderConnections.forEach((client) => {
            if ((client as any).readyState === WebSocket.OPEN && client !== ws) {
              client.send(chatMsg);
            }
          });

          ws.send(
            JSON.stringify({
              type: "chat_message_sent",
              payload: { tempId: message.payload.tempId, messageId: newMessage.id },
            })
          );
        } catch (err) {
          log(`Failed to process chat message: ${err}`);
          ws.send(
            JSON.stringify({
              type: "chat_message_error",
              payload: { tempId: message.payload.tempId, error: "Failed to send message" },
            })
          );
        }
      }
      break;
  }
}
