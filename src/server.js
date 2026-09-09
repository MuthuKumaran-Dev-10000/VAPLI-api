const app = require('./app');
const db = require('./config/database');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  await db.initPool();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 VAPLI Greenfield Node.js API Server running on 0.0.0.0:${PORT}`);
    console.log(`====================================================`);
  });
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('[FATAL SERVER START ERROR]', err);
    process.exit(1);
  });
}

module.exports = { startServer };
