import { Router, Request, Response } from "express";
import { IDatabase } from "../connectors/database/IDatabase";

export interface HealthRouterDependencies {
  db: IDatabase;
}

export const createHealthRouter = (deps: HealthRouterDependencies): Router => {
  const router = Router();
  const { db } = deps;

  router.get("/", (_req: Request, res: Response) => {
    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/ready", async (_req: Request, res: Response) => {
    const checks: Record<
      string,
      { status: string; latencyMs?: number; error?: string }
    > = {};

    try {
      const start = Date.now();
      await db.ping();
      checks.database = {
        status: "healthy",
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      checks.database = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const isReady = Object.values(checks).every(
      (check) => check.status === "healthy",
    );

    res.status(isReady ? 200 : 503).json({
      success: isReady,
      status: isReady ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  router.get("/live", (_req: Request, res: Response) => {
    res.json({
      success: true,
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  return router;
};
