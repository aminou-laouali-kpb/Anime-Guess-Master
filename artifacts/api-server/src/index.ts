import { logger } from "./lib/logger";
import { createGameServer } from "./server";
import { loadCharacterImages } from "./lib/character-images";
import { initStats } from "./lib/stats";
import characters from "./data/characters.json" with { type: "json" };

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const { httpServer } = createGameServer();

// Once the server is up, games live in memory: a crash would end every match
// in progress, so unexpected errors are logged and the process keeps running.
// Before that point (startup), any error must fail loudly with a non-zero
// exit code so Replit's supervisor sees it.
let listening = false;

function fatal(err: unknown, message: string): never {
  logger.fatal({ err }, message);
  process.exit(1);
}

process.on("uncaughtException", (err) => {
  if (!listening) fatal(err, "Uncaught exception during startup");
  logger.error({ err }, "Uncaught exception");
});
process.on("unhandledRejection", (reason) => {
  if (!listening) fatal(reason, "Unhandled rejection during startup");
  logger.error({ err: reason }, "Unhandled promise rejection");
});

// e.g. EADDRINUSE: the port is taken, there is nothing useful to keep alive.
httpServer.on("error", (err) => fatal(err, "HTTP server error"));

httpServer.listen(port, () => {
  listening = true;
  logger.info({ port }, "Server listening");
  // In the background: the game is playable right away, cards just show
  // initials until the portraits are found.
  void loadCharacterImages(characters).catch((err) =>
    logger.warn({ err }, "Character image loading failed"),
  );
  void initStats().catch((err) =>
    logger.error({ err }, "Could not set up the stats database"),
  );
});
