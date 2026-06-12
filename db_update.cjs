const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data', 'hakuen.db'));
try {
  db.exec("ALTER TABLE chat_sessions ADD COLUMN type TEXT DEFAULT 'chat'");
} catch(e) {}
try {
  db.exec("ALTER TABLE chat_sessions ADD COLUMN data TEXT DEFAULT '{}'");
} catch(e) {}
console.log('DB Updated');
