import Database from 'better-sqlite3';
import { join } from 'path';

const appDataDir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share');
const dbDir = join(appDataDir, 'odysseus');
const db = new Database(join(dbDir, 'hakuen.db'));

try {
  const users = db.prepare('SELECT id, username FROM users').all();
  console.log(JSON.stringify(users, null, 2));
} catch(e) {
  console.error(e.message);
}
