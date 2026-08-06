import Database from 'better-sqlite3';
import path from 'path';

// Adjust to match your SQLite database file path (e.g., ./dev.db or ./prisma/dev.db)
const dbPath = path.resolve(__dirname, 'dev.db'); 
const db = new Database(dbPath);

console.log('Inserting seed data into SQLite directly...');

// Example query: replace table and columns with your own schema
const insert = db.prepare(`
  INSERT INTO User (email, name) VALUES (?, ?)
`);

// Execute seed transaction
const seedData = [
  ['admin@example.com', 'Admin User'],
  ['user@example.com', 'Standard User']
];

const transaction = db.transaction((users) => {
  for (const user of users) {
    insert.run(user[0], user[1]);
  }
});

transaction(seedData);
console.log('Seeding completed successfully!');
