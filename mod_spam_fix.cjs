const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newUseEffect = `
  // Unified Save for all sessions
  useEffect(() => {
    if (currentUser && activeSessionId) {
      const timeoutId = setTimeout(() => {
        setChatSessions(prev => {
          let newSessions = [...prev];
          const idx = newSessions.findIndex(s => s.id === activeSessionId);
          
          const hasMsgs = messages && messages.length > 0;
          const hasData = (activeView === 'kanban' && kanbanTasks.length > 0) || 
                          (activeView === 'notes' && notes.length > 0) || 
                          (activeView === 'calendar' && agendas.length > 0) || 
                          (activeView === 'visualizer' && charts.length > 0);

          if (idx !== -1) {
            newSessions[idx].messages = messages;
            newSessions[idx].data = {
              kanban: activeView === 'kanban' ? kanbanTasks : newSessions[idx].data?.kanban || [],
              notes: activeView === 'notes' ? notes : newSessions[idx].data?.notes || [],
              agendas: activeView === 'calendar' ? agendas : newSessions[idx].data?.agendas || [],
              charts: activeView === 'visualizer' ? charts : newSessions[idx].data?.charts || []
            };
            newSessions[idx].updatedAt = new Date().toISOString();
            api.saveSession(currentUser.id, newSessions[idx]);
          } else if (hasMsgs || hasData) {
            // Create transient session if it has data but wasn't saved yet
            const initialTitle = 'New ' + (activeView.charAt(0).toUpperCase() + activeView.slice(1));
            const newSession = {
              id: activeSessionId,
              title: initialTitle,
              type: activeView,
              messages: messages,
              data: {
                kanban: activeView === 'kanban' ? kanbanTasks : [],
                notes: activeView === 'notes' ? notes : [],
                agendas: activeView === 'calendar' ? agendas : [],
                charts: activeView === 'visualizer' ? charts : []
              },
              updatedAt: new Date().toISOString()
            };
            newSessions.unshift(newSession);
            api.saveSession(currentUser.id, newSession);
          }
          return newSessions;
        });
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, kanbanTasks, notes, agendas, charts, currentUser, activeView, activeSessionId]);
`;

code = code.replace(
  /\/\/ Unified Save for all sessions\r?\n\s*useEffect\(\(\) => \{[\s\S]*?return \(\) => clearTimeout\(timeoutId\);\r?\n\s*\}\r?\n\s*\}, \[messages, kanbanTasks, notes, agendas, charts, currentUser, activeView, activeSessionId\]\);/,
  newUseEffect.trim()
);

const newHandleNewSession = `
  const handleNewSession = (type = 'chat') => {
    // If we are currently in a transient session (not saved yet), just change its type
    if (activeSessionId) {
      const exists = chatSessions.find(s => s.id === activeSessionId);
      if (!exists) {
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
    
    // We DO NOT save to chatSessions or API yet to prevent empty spam!
    if (currentUser) {
      api.setData(currentUser.id, 'activeSessionId', id);
    }
  };
`;

code = code.replace(
  /const handleNewSession = \(type = 'chat'\) => \{[\s\S]*?api\.setData\(currentUser\.id, 'activeSessionId', id\);\r?\n\s*\}\r?\n\s*\};/,
  newHandleNewSession.trim()
);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched for spam issue');
