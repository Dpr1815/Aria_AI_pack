import { Router, Request, Response } from "express";
import { IDatabase } from "../connectors/database/IDatabase";
import { ICacheConnector } from "../connectors/cache/ICacheConnector";

export interface HealthRouterDependencies {
  db: IDatabase;
  cache: ICacheConnector;
}

type CheckResult = { status: string; latencyMs?: number; error?: string };

async function checkDependency(
  name: string,
  fn: () => Promise<unknown>,
): Promise<[string, CheckResult]> {
  try {
    const start = Date.now();
    await fn();
    return [name, { status: "healthy", latencyMs: Date.now() - start }];
  } catch (error) {
    return [
      name,
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    ];
  }
}

export const createHealthRouter = (deps: HealthRouterDependencies): Router => {
  const router = Router();
  const { db, cache } = deps;

  router.get("/", (_req: Request, res: Response) => {
    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/ready", async (_req: Request, res: Response) => {
    const results = await Promise.all([
      checkDependency("database", () => db.ping()),
      checkDependency("cache", () => cache.ping()),
    ]);

    const checks = Object.fromEntries(results);

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
