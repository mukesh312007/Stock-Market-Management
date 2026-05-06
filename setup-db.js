const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('Attempting to setup database...');
    
    // Initial connection without database selected
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
    });

    try {
        // Create Database
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'stock_app'}`);
        console.log(`Database '${process.env.DB_NAME || 'stock_app'}' checked/created.`);

        await connection.query(`USE ${process.env.DB_NAME || 'stock_app'}`);

        // Read and execute schema.sql
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split by semicolon to run multiple queries (basic split)
        const queries = schema.split(';').filter(q => q.trim().length > 0);
        
        for (let query of queries) {
            await connection.query(query);
        }

        console.log('Tables created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Setup failed!');
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

setupDatabase();
