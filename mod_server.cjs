const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Update schema definition in server.js to ensure new setups have it
code = code.replace(
  /messages TEXT NOT NULL, -- JSON string\r?\n\s+updated_at DATETIME DEFAULT CURRENT_TIMESTAMP/,
  `messages TEXT NOT NULL, -- JSON string
    type TEXT DEFAULT 'chat',
    data TEXT DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`
);

// Update GET sessions
code = code.replace(
  /res\.json\(sessions\.map\(s => \(\{ \.\.\.s, messages: JSON\.parse\(s\.messages\) \}\)\)\);/,
  `res.json(sessions.map(s => ({ ...s, messages: JSON.parse(s.messages), data: JSON.parse(s.data || '{}') })));`
);

// Update POST sessions
code = code.replace(
  /const \{ id, title, messages \} = req\.body;/,
  `const { id, title, messages, type = 'chat', data = {} } = req.body;`
);

code = code.replace(
  /const msgStr = JSON\.stringify\(messages\);/,
  `const msgStr = JSON.stringify(messages);
    const dataStr = JSON.stringify(data);`
);

code = code.replace(
  /db\.prepare\('UPDATE chat_sessions SET messages = \?, updated_at = CURRENT_TIMESTAMP WHERE id = \?'\)\.run\(msgStr, id\);/,
  `db.prepare('UPDATE chat_sessions SET messages = ?, type = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(msgStr, type, dataStr, id);`
);

code = code.replace(
  /db\.prepare\('INSERT INTO chat_sessions \(id, user_id, title, messages\) VALUES \(\?, \?, \?, \?\)'\)\.run\(id, userId, title, msgStr\);/,
  `db.prepare('INSERT INTO chat_sessions (id, user_id, title, messages, type, data) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, title, msgStr, type, dataStr);`
);

fs.writeFileSync('server.js', code);
console.log('server.js updated');
