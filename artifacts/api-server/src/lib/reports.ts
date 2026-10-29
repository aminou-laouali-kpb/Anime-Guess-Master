import { logger } from "./logger";
import { databaseEnabled, hashToken, loadDb } from "./database";

// Reports of players / free questions (Apple guideline 1.2). Always logged;
// stored in the `reports` table when the database is enabled so a moderator
// can review them. Profiles are stored as hashes, never as tokens.
export function saveReport(report: {
  reporterToken: string;
  reportedToken: string;
  reason: string;
  roomCode: string;
  questions: string[];
}): void {
  const reporterHash = hashToken(report.reporterToken);
  const reportedHash = hashToken(report.reportedToken);
  logger.warn(
    {
      reason: report.reason,
      roomCode: report.roomCode,
      reported: reportedHash.slice(0, 12),
      questions: report.questions,
    },
    "Player reported",
  );
  if (!databaseEnabled) return;
  void loadDb()
    .then(({ db, reportsTable }) =>
      db.insert(reportsTable).values({
        reporterHash,
        reportedHash,
        reason: report.reason,
        roomCode: report.roomCode,
        content: JSON.stringify(report.questions),
      }),
    )
    .catch((err) => logger.error({ err }, "Failed to store report"));
}
