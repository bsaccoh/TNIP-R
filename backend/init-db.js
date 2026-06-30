import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'tnipr',
    multipleStatements: true,
  });

  console.log('Connected to DB');

  const files = [
    '../db/schema.sql',
    '../db/seed.sql',
    '../db/seed_demo.sql'
  ];

  for (const file of files) {
    const filePath = path.join(__dirname, file);
    console.log(`Executing ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await connection.query(sql);
    console.log(`Finished ${file}`);
  }

  await connection.end();
  console.log('Database initialized successfully!');
}

run().catch(console.error);
