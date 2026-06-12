import Database from 'better-sqlite3';
import { join } from 'path';

const dbDir = join(process.cwd(), 'data');
const db = new Database(join(dbDir, 'hakuen.db'));

try {
  // Run the alters
  try { db.exec("ALTER TABLE notes ADD COLUMN color TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE notes ADD COLUMN bg_image TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE notes ADD COLUMN tags TEXT"); } catch (e) {}

  const info = db.pragma('table_info(notes)');
  console.log("Notes columns:", info.map(c => c.name).join(', '));
  
  const users = db.prepare('SELECT id, username FROM users').all();
  console.log("Users:", users);
} catch(e) {
  console.error("DB Error:", e.message);
}
