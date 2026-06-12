const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/handleNewSession\('chat'\);/g, "handleSidebarClick('chat');");
code = code.replace(/handleNewSession\('research'\);/g, "handleSidebarClick('research');");
code = code.replace(/handleNewSession\('calendar'\);/g, "handleSidebarClick('calendar');");
code = code.replace(/handleNewSession\('notes'\);/g, "handleSidebarClick('notes');");
code = code.replace(/handleNewSession\('kanban'\);/g, "handleSidebarClick('kanban');");
code = code.replace(/handleNewSession\('visualizer'\);/g, "handleSidebarClick('visualizer');");

fs.writeFileSync('src/App.tsx', code);
console.log('Sidebar navigation patched completely');
