const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const handleSendReplacement = `
    let currentId = activeSessionId;
    if (activeSessionId) {
      setChatSessions(prev => {
        const exists = prev.find(s => s.id === activeSessionId);
        const title = userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : '');
        
        if (!exists) {
           const newSession = { 
             id: activeSessionId, 
             title, 
             messages: newMessages, 
             type: activeView, 
             data: {
                kanban: activeView === 'kanban' ? kanbanTasks : [],
                notes: activeView === 'notes' ? notes : [],
                agendas: activeView === 'calendar' ? agendas : [],
                charts: activeView === 'visualizer' ? charts : []
             }, 
             updatedAt: new Date().toISOString() 
           };
           if (currentUser) api.saveSession(currentUser.id, newSession);
           return [newSession, ...prev];
        } else if (currentMessages.length === 0) {
           // Update title on first message if session was created without messages
           const updated = { ...exists, title, messages: newMessages, updatedAt: new Date().toISOString() };
           if (currentUser) api.saveSession(currentUser.id, updated);
           return prev.map(s => s.id === activeSessionId ? updated : s);
        }
        return prev;
      });
    }
`;

code = code.replace(
  /let currentId = activeSessionId;\r?\n\s*if \(\!currentId\) \{[\s\S]*?api\.saveSession\(currentUser\.id, newSession\);\r?\n\s*\}\r?\n\s*\}/,
  handleSendReplacement.trim()
);

fs.writeFileSync('src/App.tsx', code);
console.log('Title fix applied');
