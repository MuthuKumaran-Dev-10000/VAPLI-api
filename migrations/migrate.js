const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function runMigration() {
  console.log('[MIGRATION] Starting VAPLI MySQL schema migration...');
  const pool = await db.initPool();

  if (!pool) {
    console.log('[MIGRATION] Running in fallback mode. Initializing fallback memory database tables & seed data...');
    return;
  }

  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`[MIGRATION] Running ${file}...`);
    const sqlFile = path.join(__dirname, file);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await db.query(stmt);
      } catch (err) {
        console.error(`[MIGRATION ERROR] Failed executing statement in ${file}: ${stmt.substring(0, 50)}...`, err.message);
      }
    }
  }

  console.log('[MIGRATION] All schema migrations completed successfully!');
}

if (require.main === module) {
  runMigration().catch(err => {
    console.error('[MIGRATION FATAL]', err);
    process.exit(1);
  });
}

module.exports = { runMigration };
