const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newLogic = `
  const handleNewSession = (type = 'chat') => {
    // 1. Check if current active session is completely empty
    if (activeSessionId) {
      const currentSession = chatSessions.find(s => s.id === activeSessionId);
      if (currentSession) {
         const hasMsgs = currentSession.messages?.length > 0;
         const hasData = Object.values(currentSession.data || {}).some(arr => arr && arr.length > 0);
         if (!hasMsgs && !hasData) {
            // Current session is completely empty! Reuse it to avoid spam
            setActiveView(type);
            const initialTitle = 'New ' + (type.charAt(0).toUpperCase() + type.slice(1));
            setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, type, title: initialTitle } : s));
            
            // Clear states just in case
            if (type === 'research') setResearchMessages([]);
            else if (type === 'calendar') { setCalendarMessages([]); setAgendas([]); }
            else if (type === 'notes') { setNotesMessages([]); setNotes([]); }
            else if (type === 'kanban') { setKanbanMessages([]); setKanbanTasks([]); }
            else if (type === 'visualizer') { setVisualizerMessages([]); setCharts([]); }
            else setChatMessages([]);
            
            if (currentUser) {
               api.saveSession(currentUser.id, { ...currentSession, type, title: initialTitle });
            }
            return;
         }
      }
    }

    const id = Date.now().toString();
    setActiveSessionId(id);
    setActiveView(type);
    
    // Clear states for the new session
    if (type === 'research') setResearchMessages([]);
    else if (type === 'calendar') { setCalendarMessages([]); setAgendas([]); }
    else if (type === 'notes') { setNotesMessages([]); setNotes([]); }
    else if (type === 'kanban') { setKanbanMessages([]); setKanbanTasks([]); }
    else if (type === 'visualizer') { setVisualizerMessages([]); setCharts([]); }
    else setChatMessages([]);
    
    const initialTitle = 'New ' + (type.charAt(0).toUpperCase() + type.slice(1));
    const newSession = { id, title: initialTitle, messages: [], type, data: {}, updatedAt: new Date().toISOString() };
    setChatSessions(prev => [newSession, ...prev]);
    
    if (currentUser) {
      api.saveSession(currentUser.id, newSession);
      api.setData(currentUser.id, 'activeSessionId', id);
    }
  };
`;

code = code.replace(
  /const handleNewSession = \(type = 'chat'\) => \{[\s\S]*?api\.setData\(currentUser\.id, 'activeSessionId', id\);\r?\n\s*\}\r?\n\s*\};/,
  newLogic.trim()
);

fs.writeFileSync('src/App.tsx', code);
console.log('handleNewSession updated');
