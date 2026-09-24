const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const appLogStream = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' });

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
}

const logger = {
  debug: (message, meta) => {
    const formatted = formatMessage('DEBUG', message, meta);
    process.stdout.write(formatted);
    appLogStream.write(formatted);
  },
  info: (message, meta) => {
    const formatted = formatMessage('INFO', message, meta);
    process.stdout.write(formatted);
    appLogStream.write(formatted);
  },
  warn: (message, meta) => {
    const formatted = formatMessage('WARN', message, meta);
    process.stderr.write(formatted);
    appLogStream.write(formatted);
  },
  error: (message, meta) => {
    const formatted = formatMessage('ERROR', message, meta);
    process.stderr.write(formatted);
    appLogStream.write(formatted);
    errorLogStream.write(formatted);
  }
};

module.exports = logger;
