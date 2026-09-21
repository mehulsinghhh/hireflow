import app from "./app.js";
import { connectRedis, redis } from "./lib/redis.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectRedis();

    console.log("Redis connected");

    const server = app.listen(PORT, () => {
      console.log(`HireFlow API running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        try {
          await redis.quit();
          console.log("Redis connection closed");
          process.exit(0);
        } catch (error) {
          console.error("Error while closing Redis:", error);
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