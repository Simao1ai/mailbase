import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import trackingRouter from "./routes/tracking";
import { logger } from "./lib/logger";
import { apiKeyAuth } from "./middleware/apiKey";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tracking & unsubscribe endpoints are hit by email clients — no auth required
app.use("/track", trackingRouter);
app.use("/unsubscribe", trackingRouter);

// All /api routes require a valid x-api-key header
app.use("/api", apiKeyAuth, router);

export default app;
