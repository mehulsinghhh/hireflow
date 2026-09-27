import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

type SocketUser = {
  userId: string;
  role: "CANDIDATE" | "RECRUITER" | "ADMIN";
};

type TokenPayload = {
  userId?: unknown;
  role?: unknown;
};

let io: Server | null = null;

const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => {
  throw new Error("JWT_SECRET is not configured");
})();

function getSocketUser(token: unknown): SocketUser {
  if (typeof token !== "string" || !token) {
    throw new Error("Authentication token required");
  }

  const payload = jwt.verify(token, JWT_SECRET);

  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    throw new Error("Invalid token payload");
  }

  const typedPayload = payload as TokenPayload;

  if (
    typeof typedPayload.userId !== "string" ||
    !["CANDIDATE", "RECRUITER", "ADMIN"].includes(
      typedPayload.role as string
    )
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: typedPayload.userId,
    role: typedPayload.role as SocketUser["role"],
  };
}

export function initializeSocketServer(
  httpServer: HttpServer
): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? "*",
    },
  });

  io.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;

const header = socket.handshake.headers.authorization;

const headerToken = header?.startsWith("Bearer ")
  ? header.slice(7)
  : undefined;

const token = authToken ?? headerToken;

const user = getSocketUser(token);

      socket.data.user = user;

      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;

    const room = `user:${user.userId}`;

    socket.join(room);

    console.log(
      `Socket connected: ${user.userId} (${user.role})`
    );

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${user.userId} (${reason})`
      );
    });
  });

  return io;
}

export function emitNotificationToUser(
  userId: string,
  notification: {
    id: string;
    type:
      | "APPLICATION_CREATED"
      | "APPLICATION_STATUS_CHANGED";
    message: string;
    applicationId: string;
    readAt: Date | null;
    createdAt: Date;
  }
): void {
  if (!io) {
    console.warn(
      "Socket.IO is not initialized; notification was not emitted"
    );
    return;
  }

  io.to(`user:${userId}`).emit(
    "notification:new",
    notification
  );
}