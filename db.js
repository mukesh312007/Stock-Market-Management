const mysql = require('mysql2');
require('dotenv').config();
const mockDb = require('./mock-db');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'stock_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


const db = {
    query: async (sql, params) => {
        try {
            const [rows] = await pool.promise().query(sql, params);
            return [rows];
        } catch (err) {
            const fallbackCodes = [
                'ER_ACCESS_DENIED_ERROR', 
                'ECONNREFUSED', 
                'ER_BAD_DB_ERROR', 
                'ER_NO_SUCH_TABLE', 
                'ENOTFOUND',
                'PROTOCOL_CONNECTION_LOST'
            ];
            
            if (fallbackCodes.includes(err.code)) {
                console.warn(`[DB] MySQL Error (${err.code}). Falling back to In-Memory Mock Database.`);
                return await mockDb.query(sql, params);
            }
            console.error('[DB] Critical Database Error:', err);
            throw err;
        }
    },
    promise: () => db
};

module.exports = db;
