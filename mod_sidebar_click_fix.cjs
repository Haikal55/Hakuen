const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newLogic = `
  const handleSidebarClick = (type) => {
    if (activeView === type) {
      handleNewSession(type);
      return;
    }
`;

code = code.replace(
  /const handleSidebarClick = \(type\) => \{\s*if \(activeView === type\) return;/,
  newLogic.trim()
);

fs.writeFileSync('src/App.tsx', code);
console.log('Sidebar navigation updated to create new session on double click');
