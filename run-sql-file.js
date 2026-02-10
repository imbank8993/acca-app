const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSql(filePath) {
    const env = {};
    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.join('=').trim();
            }
        });
    } catch (e) {
        console.error('Cannot read .env.local');
        return;
    }

    const client = new Client({
        connectionString: env.SUPABASE_DB_URL || env.DATABASE_URL
    });

    try {
        await client.connect();
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`Running SQL from ${filePath}...`);
        const res = await client.query(sql);
        console.log('Success!', res.command);
    } catch (err) {
        console.error('Error executing SQL', err);
    } finally {
        await client.end();
    }
}

const target = process.argv[2];
if (target) {
    runSql(target);
} else {
    console.log('Usage: node run-sql-file.js <path-to-sql>');
}
