const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const handleSendFix = `
    let currentId = activeSessionId;
    if (!currentId) {
      currentId = Date.now().toString();
      setActiveSessionId(currentId);
      if (currentUser) {
        api.setData(currentUser.id, 'activeSessionId', currentId);
        const title = userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : '');
        const newSession = { id: currentId, title, messages: newMessages, type: activeView, data: {}, updatedAt: new Date().toISOString() };
        setChatSessions(prev => {
          const exists = prev.find(s => s.id === currentId);
          if (!exists) return [newSession, ...prev];
          return prev;
        });
        api.saveSession(currentUser.id, newSession);
      }
    }
`;

code = code.replace(
  /let currentId = activeSessionId;\r?\n\s*if \(activeView === 'chat' && !currentId\) \{[\s\S]*?api\.saveSession\(currentUser\.id, newSession\);\r?\n\s*\}\r?\n\s*\}/,
  handleSendFix.trim()
);

const loadAllFix = `
          const activeId = await api.getData(currentUser.id, 'activeSessionId', null);
          setActiveSessionId(activeId);
          if (activeId) {
            const activeSession = sessions.find((s: any) => s.id === activeId);
            if (activeSession) {
               const type = activeSession.type || 'chat';
               setActiveView(type);
               const msgs = activeSession.messages || [];
               if (type === 'research') setResearchMessages(msgs);
               else if (type === 'calendar') setCalendarMessages(msgs);
               else if (type === 'notes') setNotesMessages(msgs);
               else if (type === 'kanban') setKanbanMessages(msgs);
               else if (type === 'visualizer') setVisualizerMessages(msgs);
               else setChatMessages(msgs);
               
               const d = activeSession.data || {};
               if (type === 'kanban') setKanbanTasks(d.kanban || []);
               if (type === 'calendar') setAgendas(d.agendas || []);
               if (type === 'notes') setNotes(d.notes || []);
               if (type === 'visualizer') setCharts(d.charts || []);
            }
          }
`;

code = code.replace(
  /const activeId = await api\.getData\(currentUser\.id, 'activeSessionId', null\);\r?\n\s*setActiveSessionId\(activeId\);\r?\n\s*if \(activeId\) \{[\s\S]*?setChatMessages\(await api\.getData\(currentUser\.id, 'chat', \[\]\)\);\r?\n\s*\}/,
  loadAllFix.trim()
);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched');
