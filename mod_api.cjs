const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

code = code.replace(
  /async saveSession\(userId, id, title, messages\) \{/,
  `async saveSession(userId, id, title, messages, type = 'chat', data = {}) {`
);

code = code.replace(
  /body: JSON\.stringify\(\{ id, title, messages \}\)/,
  `body: JSON.stringify({ id, title, messages, type, data })`
);

fs.writeFileSync('src/api.ts', code);
console.log('api.ts updated');
