import pino from "pino";

export function createLogger(destination?: pino.DestinationStream): pino.Logger {
  const options = {
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: [
        "*.authorization",
        "*.cookie",
        "*.set-cookie",
        "*.password",
        "*.token",
        "*.secret",
        "authorization",
        "cookie",
        "set-cookie",
        "password",
        "token",
        "secret"
      ],
      censor: "[REDACTED]"
    }
  };
  return destination === undefined ? pino(options) : pino(options, destination);
}

export const logger = createLogger();

export function scenarioLogger(scenarioId: string, workerId?: string): pino.Logger {
  return logger.child({
    scenarioId,
    ...(workerId === undefined ? {} : { workerId })
  });
}
