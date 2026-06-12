const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /\/\/ Save chat histories when they change\r?\n\s*useEffect\(\(\) => \{[\s\S]*?if \(activeSessionId === id\) \{\r?\n\s*handleNewChat\(\);\r?\n\s*\}\r?\n\s*\};/,
  `// Unified Save for all sessions
  useEffect(() => {
    if (currentUser && activeSessionId && chatSessions.length > 0) {
      const timeoutId = setTimeout(() => {
        setChatSessions(prev => {
          let newSessions = [...prev];
          const idx = newSessions.findIndex(s => s.id === activeSessionId);
          
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
          }
          return newSessions;
        });
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, kanbanTasks, notes, agendas, charts, currentUser, activeView, activeSessionId]);

  const handleNewSession = (type = 'chat') => {
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

  const loadSession = (id) => {
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(id);
      const type = session.type || 'chat';
      setActiveView(type);
      
      const msgs = session.messages || [];
      if (type === 'research') setResearchMessages(msgs);
      else if (type === 'calendar') setCalendarMessages(msgs);
      else if (type === 'notes') setNotesMessages(msgs);
      else if (type === 'kanban') setKanbanMessages(msgs);
      else if (type === 'visualizer') setVisualizerMessages(msgs);
      else setChatMessages(msgs);
      
      const d = session.data || {};
      if (type === 'kanban') setKanbanTasks(d.kanban || []);
      if (type === 'calendar') setAgendas(d.agendas || []);
      if (type === 'notes') setNotes(d.notes || []);
      if (type === 'visualizer') setCharts(d.charts || []);
      
      if (currentUser) api.setData(currentUser.id, 'activeSessionId', id);
    }
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const deleteChatSession = async (id, e) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (!window.confirm('Delete this session?')) return;
    
    await api.deleteSession(currentUser.id, id);
    setChatSessions(prev => prev.filter(s => s.id !== id));
    
    if (activeSessionId === id) {
      handleNewSession('chat');
    }
  };`
);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx sessions replaced');
