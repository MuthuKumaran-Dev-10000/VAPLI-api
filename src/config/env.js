const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
    path: path.join(__dirname, '.env')
});

const config = {
    port: process.env.PORT || 8081,
    version: process.env.VERSION,
    minimumSupportedVersion: process.env.MINIMUM_SUPPORTED_VERSION,
    encryptionKey: process.env.ENCRYPTION_KEY,
    dbHost : process.env.DB_HOST,
    dbUser : process.env.DB_USER,
    dbPass : process.env.DB_PASSWORD,
    dbName : process.env.DB_NAME,
    dbPort : process.env.DB_PORT
};

module.exports = config;