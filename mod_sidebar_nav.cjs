const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const handleSidebarClick = `
  const handleSidebarClick = (type) => {
    if (activeView === type) return;
    
    // If currently in a transient empty session, just change its type
    if (activeSessionId) {
      const currentSession = chatSessions.find(s => s.id === activeSessionId);
      if (!currentSession) {
         setActiveView(type);
         if (type === 'research') setResearchMessages([]);
         else if (type === 'calendar') { setCalendarMessages([]); setAgendas([]); }
         else if (type === 'notes') { setNotesMessages([]); setNotes([]); }
         else if (type === 'kanban') { setKanbanMessages([]); setKanbanTasks([]); }
         else if (type === 'visualizer') { setVisualizerMessages([]); setCharts([]); }
         else setChatMessages([]);
         return;
      }
    }

    // Find the most recent session of this type
    const recentSession = chatSessions.find(s => s.type === type);
    if (recentSession) {
      loadSession(recentSession.id);
    } else {
      handleNewSession(type);
    }
  };

  const handleNewSession = (type = 'chat') => {
`;

code = code.replace(
  /const handleNewSession = \(type = 'chat'\) => \{/,
  handleSidebarClick.trim()
);

code = code.replace(/onClick=\{\(\) => handleNewSession\('chat'\)\}/g, "onClick={() => handleSidebarClick('chat')}");
code = code.replace(/onClick=\{\(\) => handleNewSession\('research'\)\}/g, "onClick={() => handleSidebarClick('research')}");
code = code.replace(/onClick=\{\(\) => handleNewSession\('calendar'\)\}/g, "onClick={() => handleSidebarClick('calendar')}");
code = code.replace(/onClick=\{\(\) => handleNewSession\('notes'\)\}/g, "onClick={() => handleSidebarClick('notes')}");
code = code.replace(/onClick=\{\(\) => handleNewSession\('kanban'\)\}/g, "onClick={() => handleSidebarClick('kanban')}");
code = code.replace(/onClick=\{\(\) => handleNewSession\('visualizer'\)\}/g, "onClick={() => handleSidebarClick('visualizer')}");

// Note: Ensure the "+" button in the header STILL uses handleNewSession!
// The "+" button uses: onClick={() => handleNewSession(activeView)}
// Our regex replaced specific string literals, so it didn't touch the "+" button!

fs.writeFileSync('src/App.tsx', code);
console.log('Sidebar navigation patched');
