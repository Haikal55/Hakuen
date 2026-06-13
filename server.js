import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENCRYPTION_KEY = crypto.scryptSync('hakuen-super-secret-key-2026', 'salt', 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return text;
    const iv = Buffer.from(textParts.shift(), 'hex');
    if (iv.length !== 16) return text;
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text;
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const appDataDir = join(__dirname, 'data');
const dbDir = appDataDir;
const libDir = join(dbDir, 'library');
const notesImgDir = join(dbDir, 'notes_images');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}
if (!fs.existsSync(notesImgDir)) {
  fs.mkdirSync(notesImgDir, { recursive: true });
}

const db = new Database(join(dbDir, 'hakuen.db'));

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    messages TEXT NOT NULL, -- JSON string
    type TEXT DEFAULT 'chat',
    data TEXT DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL, -- JSON string
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id TEXT,
    filename TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    tasks TEXT,
    is_pinned BOOLEAN DEFAULT 0,
    is_archived BOOLEAN DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    dateStr TEXT NOT NULL,
    time TEXT NOT NULL,
    title TEXT NOT NULL,
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

try { db.exec("ALTER TABLE notes ADD COLUMN color TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE notes ADD COLUMN bg_image TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE notes ADD COLUMN tags TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE notes ADD COLUMN bg_position TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE calendar_events ADD COLUMN color TEXT"); } catch (e) {}

// Migration script: Move old JSON notes from chat_sessions to notes table
try {
  const sessionsWithData = db.prepare('SELECT user_id, data FROM chat_sessions').all();
  if (sessionsWithData.length > 0) {
    const insertNote = db.prepare('INSERT INTO notes (id, user_id, title, type, content, tasks, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)');
    let migrationCount = 0;
    
    db.transaction(() => {
      for (const row of sessionsWithData) {
        try {
          const dataObj = JSON.parse(row.data);
          if (dataObj && Array.isArray(dataObj.notes) && dataObj.notes.length > 0) {
            dataObj.notes.forEach((note, idx) => {
              const noteId = crypto.randomUUID();
              insertNote.run(
                noteId,
                row.user_id,
                note.title || 'Untitled',
                note.type || 'text',
                note.content || '',
                JSON.stringify(note.tasks || []),
                idx
              );
              migrationCount++;
            });
            // Optional: Remove notes from session data to prevent duplicate migrations if script runs again
            // But we can just leave it since the migration checks if we need to run it? 
            // Wait, if it runs every time the server starts, it will duplicate notes!
            // We must update the chat_sessions to remove the notes.
            delete dataObj.notes;
            db.prepare('UPDATE chat_sessions SET data = ? WHERE user_id = ? AND data LIKE ?').run(JSON.stringify(dataObj), row.user_id, row.data);
          }
        } catch (e) {}
      }
    })();
    if (migrationCount > 0) {
      console.log(`Migrated ${migrationCount} notes to the new notes table.`);
    }
  }
} catch (error) {
  console.error("Migration error:", error);
}

// API Routes
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const info = stmt.run(username, email, password);
    res.json({ success: true, user: { id: info.lastInsertRowid, username, email } });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username or Email already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT id, username, email FROM users WHERE email = ? AND password = ?').get(email, password);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  try {
    const user = db.prepare('SELECT password FROM users WHERE email = ?').get(email);
    if (user) {
      res.json({ success: true, password: user.password });
    } else {
      res.status(404).json({ error: 'User with this email not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  try {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// QR Login In-Memory Tokens and Handlers
const qrTokens = new Map();

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName of Object.keys(interfaces)) {
    const ifaceList = interfaces[interfaceName];
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.post('/api/users/generate-qr-token', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
    qrTokens.set(token, { userId, expiresAt });
    const localIp = getLocalIp();
    res.json({ token, localIp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/login-by-token', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  try {
    const tokenData = qrTokens.get(token);
    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired QR code' });
    }
    if (tokenData.expiresAt < Date.now()) {
      qrTokens.delete(token);
      return res.status(400).json({ error: 'QR code has expired' });
    }
    qrTokens.delete(token);
    const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(tokenData.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});

// Generic Data Key-Value Store for kanban, etc.
app.get('/api/data/:userId/:key', (req, res) => {
  const { userId, key } = req.params;
  try {
    const row = db.prepare('SELECT value FROM user_data WHERE user_id = ? AND key = ?').get(userId, key);
    let value = null;
    if (row) {
      let raw = row.value;
      if (key === 'apiKey') raw = decrypt(raw);
      value = JSON.parse(raw);
    }
    res.json({ value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/data/:userId/:key', (req, res) => {
  const { userId, key } = req.params;
  try {
    let value = JSON.stringify(req.body.value);
    if (key === 'apiKey') value = encrypt(value);
    db.prepare('INSERT INTO user_data (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = ?').run(userId, key, value, value);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notes Routes
app.get('/api/notes/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const notes = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY is_pinned DESC, order_index ASC, created_at DESC').all(userId);
    res.json(notes.map(n => ({ ...n, tasks: JSON.parse(n.tasks || '[]'), is_pinned: !!n.is_pinned, is_archived: !!n.is_archived })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes/:userId', (req, res) => {
  const { userId } = req.params;
  const { title, type, content, tasks, is_pinned, is_archived, order_index, color, bg_image, tags, bg_position } = req.body;
  
  try {
    const noteId = crypto.randomUUID();
    db.prepare('INSERT INTO notes (id, user_id, title, type, content, tasks, is_pinned, is_archived, order_index, color, bg_image, tags, bg_position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      noteId, userId, title || 'Untitled', type || 'text', content || '', JSON.stringify(tasks || []), is_pinned ? 1 : 0, is_archived ? 1 : 0, order_index || 0, color || null, bg_image || null, tags || null, bg_position || null
    );
    res.json({ success: true, id: noteId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notes/:userId/:id', (req, res) => {
  const { userId, id } = req.params;
  const { title, type, content, tasks, is_pinned, is_archived, order_index, color, bg_image, tags, bg_position } = req.body;
  
  try {
    const updates = [];
    const values = [];
    
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (type !== undefined) { updates.push('type = ?'); values.push(type); }
    if (content !== undefined) { updates.push('content = ?'); values.push(content); }
    if (tasks !== undefined) { updates.push('tasks = ?'); values.push(JSON.stringify(tasks)); }
    if (is_pinned !== undefined) { updates.push('is_pinned = ?'); values.push(is_pinned ? 1 : 0); }
    if (is_archived !== undefined) { updates.push('is_archived = ?'); values.push(is_archived ? 1 : 0); }
    if (order_index !== undefined) { updates.push('order_index = ?'); values.push(order_index); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (bg_image !== undefined) { 
      const oldNote = db.prepare('SELECT bg_image FROM notes WHERE id = ? AND user_id = ?').get(id, userId);
      if (oldNote && oldNote.bg_image && oldNote.bg_image !== bg_image) {
        try { fs.unlinkSync(join(notesImgDir, oldNote.bg_image)); } catch (e) {}
      }
      updates.push('bg_image = ?'); values.push(bg_image); 
    }
    if (bg_position !== undefined) { updates.push('bg_position = ?'); values.push(bg_position); }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(tags); }
    
    if (updates.length > 0) {
      values.push(id, userId);
      db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notes/:userId/reorder', (req, res) => {
  const { userId } = req.params;
  const { orderedIds } = req.body; // Array of note IDs in order
  try {
    db.transaction(() => {
      const stmt = db.prepare('UPDATE notes SET order_index = ? WHERE id = ? AND user_id = ?');
      orderedIds.forEach((id, index) => {
        stmt.run(index, id, userId);
      });
    })();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notes/:userId/:id', (req, res) => {
  const { userId, id } = req.params;
  try {
    const note = db.prepare('SELECT bg_image FROM notes WHERE id = ? AND user_id = ?').get(id, userId);
    if (note && note.bg_image) {
      try { fs.unlinkSync(join(notesImgDir, note.bg_image)); } catch (e) {}
    }
    db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes/image/:userId', (req, res) => {
  const { userId } = req.params;
  const { base64, filename } = req.body;
  try {
    const fileId = crypto.randomUUID();
    if (base64) {
      const filePath = join(notesImgDir, `${fileId}_${filename}`);
      const base64Data = base64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
      fs.writeFileSync(filePath, base64Data, 'base64');
      res.json({ success: true, filename: `${fileId}_${filename}` });
    } else {
      res.status(400).json({ error: 'No image data provided' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notes/image/file/:filename', (req, res) => {
  try {
    const filePath = join(notesImgDir, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Image not found');
    }
  } catch (error) {
    res.status(500).send('Error reading image');
  }
});

// Calendar Routes
app.get('/api/calendar/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const events = db.prepare('SELECT * FROM calendar_events WHERE user_id = ? ORDER BY dateStr ASC, time ASC').all(userId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendar/:userId', (req, res) => {
  const { userId } = req.params;
  const { dateStr, time, title, color } = req.body;
  try {
    const eventId = crypto.randomUUID();
    db.prepare('INSERT INTO calendar_events (id, user_id, dateStr, time, title, color) VALUES (?, ?, ?, ?, ?, ?)').run(
      eventId, userId, dateStr, time, title, color || null
    );
    res.json({ success: true, id: eventId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/calendar/:userId/:id', (req, res) => {
  const { userId, id } = req.params;
  const { dateStr, time, title, color } = req.body;
  try {
    db.prepare('UPDATE calendar_events SET dateStr = ?, time = ?, title = ?, color = ? WHERE id = ? AND user_id = ?').run(
      dateStr, time, title, color || null, id, userId
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/calendar/:userId/:id', (req, res) => {
  const { userId, id } = req.params;
  try {
    db.prepare('DELETE FROM calendar_events WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat Sessions
app.get('/api/sessions/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const sessions = db.prepare('SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
    res.json(sessions.map(s => ({ ...s, messages: JSON.parse(s.messages), data: JSON.parse(s.data || '{}') })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sessions/:userId', (req, res) => {
  const { userId } = req.params;
  const { id, title, messages, type = 'chat', data = {} } = req.body;
  try {
    const msgStr = JSON.stringify(messages);
    const dataStr = JSON.stringify(data);
    
    const existing = db.prepare('SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?').get(id, userId);
    if (existing) {
      db.prepare('UPDATE chat_sessions SET messages = ?, type = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(msgStr, type, dataStr, id);
    } else {
      db.prepare('INSERT INTO chat_sessions (id, user_id, title, messages, type, data) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, title, msgStr, type, dataStr);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sessions/:userId', (req, res) => {
  const { userId } = req.params;
  db.prepare('DELETE FROM chat_sessions WHERE user_id = ?').run(userId);
  res.json({ success: true });
});

app.delete('/api/sessions/:userId/:sessionId', (req, res) => {
  const { userId, sessionId } = req.params;
  db.prepare('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?').run(sessionId, userId);
  res.json({ success: true });
});

// Documents (Library)
app.get('/api/library/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const docs = db.prepare('SELECT id, session_id, filename, type, content, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/library/:userId', (req, res) => {
  const { userId } = req.params;
  const { id, session_id, filename, type, content, base64 } = req.body;
  
  try {
    const docId = id || crypto.randomUUID();
    let filePath = null;
    
    // Save physical file if base64 is provided
    if (base64) {
      filePath = join(libDir, `${docId}_${filename}`);
      const base64Data = base64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
      fs.writeFileSync(filePath, base64Data, 'base64');
    }

    db.prepare('INSERT INTO documents (id, user_id, session_id, filename, type, content, path) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      docId, userId, session_id || null, filename, type, content, filePath
    );
    res.json({ success: true, id: docId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/library/file/:id', (req, res) => {
  const { id } = req.params;
  try {
    const doc = db.prepare('SELECT path, type, filename FROM documents WHERE id = ?').get(id);
    if (!doc || !doc.path || !fs.existsSync(doc.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    res.setHeader('Content-Type', doc.type);
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    const fileStream = fs.createReadStream(doc.path);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/library/:userId/:id', (req, res) => {
  const { userId, id } = req.params;
  try {
    const doc = db.prepare('SELECT path FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
    if (doc) {
      if (doc.path && fs.existsSync(doc.path)) {
        fs.unlinkSync(doc.path);
      }
      db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(id, userId);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/library/:userId/:id', (req, res) => {
  const { userId, id } = req.params;
  const { filename } = req.body;
  try {
    db.prepare('UPDATE documents SET filename = ? WHERE id = ? AND user_id = ?').run(filename, id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Hakuen backend running on http://localhost:${PORT}`);
});
