const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const logger = require('../utils/logger');

const dbPool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'DhruvDev001',
  database: process.env.DB_NAME || 'vapli_db',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  timezone: '+00:00'
});

dbPool.getConnection()
  .then(conn => {
    logger.info('Successfully connected to MySQL database: ' + (process.env.DB_NAME || 'vapli_db'));
    conn.release();
  })
  .catch(err => {
    logger.error('Failed to connect to MySQL database', { error: err.message, stack: err.stack });
  });

module.exports = dbPool;
