import pino, { Logger as PinoLogger, destination } from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  [key: string]: unknown;
}

interface LoggerConfig {
  level?: LogLevel;
  logDir?: string;
  logFile?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

export function getContext(): LogContext {
  return asyncLocalStorage.getStore() ?? {};
}

export function runWithContext<T>(context: LogContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

export function setContextValue(key: string, value: unknown): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store[key] = value;
  }
}

const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const baseConfig: pino.LoggerOptions = {
  level: LOG_LEVEL,
  base: { env: process.env.NODE_ENV || 'development' },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin: () => getContext(),
};

let baseLogger: PinoLogger;

if (IS_PRODUCTION) {
  // In production / containers: stdout only — let the orchestrator handle log collection
  baseLogger = pino(baseConfig);
} else {
  // Dev: pretty-print + local file for convenience
  const LOG_DIR = process.env.LOG_DIR || 'logs';
  const LOG_FILE = process.env.LOG_FILE || 'app.log';

  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }

  const fileDestination = destination({
    dest: path.join(LOG_DIR, LOG_FILE),
    sync: false,
    mkdir: true,
  });

  let prettyStream: NodeJS.WritableStream;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pinoPretty = require('pino-pretty');
    prettyStream = pinoPretty({
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    });
  } catch {
    prettyStream = process.stdout;
  }

  baseLogger = pino(
    baseConfig,
    pino.multistream([{ stream: prettyStream }, { stream: fileDestination }])
  );

  process.on('beforeExit', () => {
    fileDestination.flushSync();
  });
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => baseLogger.debug(data ?? {}, msg),

  info: (msg: string, data?: Record<string, unknown>) => baseLogger.info(data ?? {}, msg),

  warn: (msg: string, data?: Record<string, unknown>) => baseLogger.warn(data ?? {}, msg),

  error: (msg: string, error?: Error | Record<string, unknown>, data?: Record<string, unknown>) => {
    if (error instanceof Error) {
      baseLogger.error({ ...data, err: error }, msg);
    } else {
      baseLogger.error(error ?? data ?? {}, msg);
    }
  },

  fatal: (msg: string, error?: Error | Record<string, unknown>, data?: Record<string, unknown>) => {
    if (error instanceof Error) {
      baseLogger.fatal({ ...data, err: error }, msg);
    } else {
      baseLogger.fatal(error ?? data ?? {}, msg);
    }
  },

  child: (context: Record<string, unknown>) => baseLogger.child(context),
};

export function createLogger(serviceName: string) {
  const child = baseLogger.child({ service: serviceName });

  return {
    debug: (msg: string, data?: Record<string, unknown>) => child.debug(data ?? {}, msg),

    info: (msg: string, data?: Record<string, unknown>) => child.info(data ?? {}, msg),

    warn: (msg: string, data?: Record<string, unknown>) => child.warn(data ?? {}, msg),

    error: (
      msg: string,
      error?: Error | Record<string, unknown>,
      data?: Record<string, unknown>
    ) => {
      if (error instanceof Error) {
        child.error({ ...data, err: error }, msg);
      } else {
        child.error(error ?? data ?? {}, msg);
      }
    },

    fatal: (
      msg: string,
      error?: Error | Record<string, unknown>,
      data?: Record<string, unknown>
    ) => {
      if (error instanceof Error) {
        child.fatal({ ...data, err: error }, msg);
      } else {
        child.fatal(error ?? data ?? {}, msg);
      }
    },
  };
}

export interface RequestWithContext extends Request {
  requestId: string;
}

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const startTime = Date.now();

    const context: LogContext = {
      requestId,
      method: req.method,
      path: req.path,
    };

    runWithContext(context, () => {
      (req as RequestWithContext).requestId = requestId;
      res.setHeader('x-request-id', requestId);

      logger.info('Request started', {
        query: Object.keys(req.query).length ? req.query : undefined,
      });

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logFn = res.statusCode >= 400 ? logger.warn : logger.info;

        logFn('Request completed', {
          statusCode: res.statusCode,
          duration,
        });
      });

      next();
    });
  };
}

export function attachUserContext(userId: string, organizationId?: string): void {
  setContextValue('userId', userId);
  if (organizationId) {
    setContextValue('organizationId', organizationId);
  }
}

export type { LogLevel, LogContext, LoggerConfig };
