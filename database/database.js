const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./mydatabase.db', (err) => {
    if (err) {
        console.log('Error opening DB: ', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

db.run("PRAGMA foreign_keys = ON;");

db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT)');

    db.run(`
        CREATE TABLE IF NOT EXISTS exercise (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            duration INTEGER NOT NULL,
            description TEXT NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id)
        )`)
});


process.on('exit', () => {
    db.close();
});

module.exports = db;