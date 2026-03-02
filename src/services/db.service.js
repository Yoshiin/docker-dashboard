import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class DbService {
    constructor(dbPath = 'data/dashboard.db') {
        // Ensure data directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.init();
    }

    init() {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS image_cache
          (
              image_id TEXT PRIMARY KEY,
              status TEXT,
              last_check INTEGER
          );
          CREATE TABLE IF NOT EXISTS users
          (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE,
              password_hash TEXT
          );
          CREATE TABLE IF NOT EXISTS sessions
          (
              id TEXT PRIMARY KEY,
              user_id INTEGER,
              expires_at INTEGER,
              FOREIGN KEY (user_id) REFERENCES users (id)
          );
          CREATE TABLE IF NOT EXISTS settings
          (
              key TEXT PRIMARY KEY,
              value TEXT
          );
        `);

        // Default Admin User
        const DEFAULT_USER = process.env.ADMIN_USER || 'admin';
        const DEFAULT_PASS = process.env.ADMIN_PASSWORD || 'admin';

        const userExists = this.db.prepare('SELECT count(*) as count FROM users').get();
        if (userExists.count === 0) {
            const hash = bcrypt.hashSync(DEFAULT_PASS, 10);
            this.db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(DEFAULT_USER, hash);

            console.log("-----------------------------------------");
            console.log(`Initial account created: ${DEFAULT_USER}`);
            console.log(`Password: ${process.env.ADMIN_PASSWORD ? '********' : DEFAULT_PASS}`);
            console.log("-----------------------------------------");
        }

        // Default Settings
        const settings = [
            { key: 'refresh_time', value: process.env.REFRESH_TIME || '10' },
            { key: 'cache_time', value: process.env.CACHE_TIME || '30' }
        ];

        const insertSetting = this.db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
        settings.forEach(s => insertSetting.run(s.key, s.value));
    }

    // --- Settings ---
    getSetting(key) {
        return this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value;
    }

    updateSetting(key, value) {
        return this.db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);
    }

    getAllSettings() {
        const rows = this.db.prepare('SELECT key, value FROM settings').all();
        return rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
    }

    // --- Users & Authentication ---
    getUserByUsername(username) {
        return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }

    getUserById(id) {
        return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }

    updateUserPassword(userId, newHash) {
        return this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
    }

    countUsers() {
        return this.db.prepare('SELECT count(*) as count FROM users').get().count;
    }

    createUser(username, passwordHash) {
        return this.db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
    }

    // --- Sessions ---
    createSession(id, userId, expiresAt) {
        return this.db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, expiresAt);
    }

    getSession(id, now) {
        return this.db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').get(id, now);
    }

    deleteSession(id) {
        return this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    }

    // --- Image Cache ---
    getCachedImage(imageId) {
        return this.db.prepare('SELECT * FROM image_cache WHERE image_id = ?').get(imageId);
    }

    updateImageCache(imageId, status, lastCheck) {
        return this.db.prepare('INSERT OR REPLACE INTO image_cache (image_id, status, last_check) VALUES (?, ?, ?)')
            .run(imageId, status, lastCheck);
    }
}
