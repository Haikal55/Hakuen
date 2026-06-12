const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
  // Unified Save for all sessions
  useEffect(() => {
    if (currentUser && activeSessionId && activeView !== 'history') {
`;

code = code.replace(
  /\/\/ Unified Save for all sessions\r?\n\s*useEffect\(\(\) => \{\r?\n\s*if \(currentUser && activeSessionId\) \{/,
  replacement.trim()
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed History overwrite bug');
