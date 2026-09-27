import { createServer } from "node:http";

import app from "./app.js";
import { connectRedis, redis } from "./lib/redis.js";
import { initializeSocketServer } from "./realtime/socketServer.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectRedis();
    console.log("Redis connected");

    const httpServer = createServer(app);

    initializeSocketServer(httpServer);
    console.log("Socket.IO initialized");

    const { applicationWorker } =
      await import("./workers/applicationWorker.js");

    await applicationWorker.waitUntilReady();
    console.log("Application worker ready");

    httpServer.listen(PORT, () => {
      console.log(`HireFlow API running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down...`);

      httpServer.close(async () => {
        try {
          await applicationWorker.close();
          await redis.quit();

          console.log("Application worker closed");
          console.log("Redis connection closed");

          process.exit(0);
        } catch (error) {
          console.error("Error during shutdown:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start HireFlow API:", error);
    process.exit(1);
  }
}

startServer();