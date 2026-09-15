// Idempotent cleanup: removes legacy admin/accountant accounts that predate
// the triple-partner-only access model. Safe to run on every deploy —
// does nothing once those accounts are already gone, and does nothing on a
// brand new database where the users table doesn't have any such rows yet.
const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[cleanup] No DATABASE_URL set, skipping.");
    return;
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query(
      `DELETE FROM users WHERE role IN ('admin', 'accountant') RETURNING username`
    );
    if (result.rowCount && result.rowCount > 0) {
      console.log(
        `[cleanup] Removed ${result.rowCount} legacy account(s): ${result.rows
          .map((r) => r.username)
          .join(", ")}`
      );
    } else {
      console.log("[cleanup] No legacy admin/accountant accounts found.");
    }
  } catch (err) {
    // If the users table doesn't exist yet (very first deploy, before push),
    // just skip quietly — nothing to clean up.
    console.log(
      "[cleanup] Skipped (table may not exist yet):",
      err instanceof Error ? err.message : err
    );
  } finally {
    await client.end();
  }
}

main();
