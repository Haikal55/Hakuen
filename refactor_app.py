import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { useState, useRef, useEffect } from 'react';",
    "import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';\nimport { useState, useRef, useEffect } from 'react';"
)

# 2. Main component rename
content = content.replace("export default function App() {", "function AppContent() {")

# 3. Add router wrapper
content += """

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
      <Route path="/c/:sessionId" element={<AppContent />} />
    </Routes>
  );
}
"""

# 4. Message states
states_block = """  // States
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [researchMessages, setResearchMessages] = useState<any[]>([]);
  const [calendarMessages, setCalendarMessages] = useState<any[]>([]);
  const [notesMessages, setNotesMessages] = useState<any[]>([]);
  const [kanbanMessages, setKanbanMessages] = useState<any[]>([]);
  const [visualizerMessages, setVisualizerMessages] = useState<any[]>([]);"""

content = content.replace(states_block, "  // States\n  const [messages, setMessages] = useState<any[]>([]);")

# 5. Remove dynamic message getters
getters_block = """  const messages = (activeView === 'research' ? researchMessages : activeView === 'calendar' ? calendarMessages : activeView === 'notes' ? notesMessages : activeView === 'kanban' ? kanbanMessages : activeView === 'visualizer' ? visualizerMessages : chatMessages) || [];
  const setMessages = activeView === 'research' ? setResearchMessages : activeView === 'calendar' ? setCalendarMessages : activeView === 'notes' ? setNotesMessages : activeView === 'kanban' ? setKanbanMessages : activeView === 'visualizer' ? setVisualizerMessages : setChatMessages;"""

content = content.replace(getters_block, "")

# 6. Add useParams and useNavigate inside AppContent
content = content.replace(
    "const [activeView, setActiveView] = useState<'chat' | 'research' | 'calendar' | 'notes' | 'kanban' | 'visualizer' | 'history'>('chat');",
    "const [activeView, setActiveView] = useState<'chat' | 'research' | 'calendar' | 'notes' | 'kanban' | 'visualizer' | 'history'>('chat');\n  const { sessionId } = useParams();\n  const navigate = useNavigate();\n  const location = useLocation();"
)

# 7. Rewrite loadSession to just take id
load_session_block_old = """  const loadSession = (id: any) => {
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
  };"""

load_session_block_new = """  const loadSession = (id: any) => {
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(id);
      
      // We do NOT change activeView on load unless the user is jumping from history
      // Wait, if it's from history, it might be good to jump to its primary type
      // but let's just respect the session's primary type when loading from history
      const type = session.type || 'chat';
      setActiveView(type);
      
      setMessages(session.messages || []);
      
      const d = session.data || {};
      setKanbanTasks(d.kanban || []);
      setAgendas(d.agendas || []);
      setNotes(d.notes || []);
      setCharts(d.charts || []);
      
      if (currentUser) api.setData(currentUser.id, 'activeSessionId', id);
    } else {
      // If session not found but id exists, it might be a new URL or deleted
      // We can reset or navigate to /
    }
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };"""

content = content.replace(load_session_block_old, load_session_block_new)

# 8. Rewrite handleNewSession to use navigate
handle_new_session_block_old = """  const handleNewSession = (type: any = 'chat') => {
    setInput('');
    setSelectedFile(null);
    
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
  };"""

handle_new_session_block_new = """  const handleNewSession = (type: any = 'chat') => {
    // New chat just navigates to / and resets everything
    navigate('/');
    setActiveView(type);
    setMessages([]);
    setKanbanTasks([]);
    setAgendas([]);
    setNotes([]);
    setCharts([]);
    setActiveSessionId(null);
    setInput('');
    setSelectedFile(null);
    if (currentUser) {
      api.setData(currentUser.id, 'activeSessionId', null);
    }
  };"""

content = content.replace(handle_new_session_block_old, handle_new_session_block_new)


# 9. Rewrite handleSidebarClick
handle_sidebar_click_old = """  const handleSidebarClick = (type: any) => {
    if (activeView === type) {
      handleNewSession(type);
      return;
    }
    
    // Find the most recent session of the target type first
    const recentSession = chatSessions.find(s => (s.type || 'chat') === type);

    if (activeSessionId) {
      const currentSession = chatSessions.find(s => s.id === activeSessionId);
      if (!currentSession) {
         // Current session is empty/transient.
         if (recentSession) {
           // If a recent session exists for the target type, load it!
           loadSession(recentSession.id);
           return;
         } else {
           // Otherwise morph the current empty session into the target type
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
    }

    if (recentSession) {
      loadSession(recentSession.id);
    } else {
      handleNewSession(type);
    }
  };"""

handle_sidebar_click_new = """  const handleSidebarClick = (type: any) => {
    // Just change the view! We are keeping the same session seamlessly.
    setActiveView(type);
  };"""

content = content.replace(handle_sidebar_click_old, handle_sidebar_click_new)


# 10. Fix Initial Load UseEffect logic
# We need to observe `sessionId` from URL.
initial_load_old = """  // Load Initial Data
  useEffect(() => {
    if (currentUser) {
      const loadAll = async () => {
        try {
          const sessions = await api.getSessions(currentUser.id);
          setChatSessions(sessions);
          
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

          setResearchMessages(await api.getData(currentUser.id, 'research', []));
          setAgendas(await api.getData(currentUser.id, 'agendas', []));
          setNotes(await api.getData(currentUser.id, 'notes', []));
          setKanbanTasks(await api.getData(currentUser.id, 'kanban', []));
          setCharts(await api.getData(currentUser.id, 'charts', []));"""

initial_load_new = """  // Load Initial Data
  useEffect(() => {
    if (currentUser) {
      const loadAll = async () => {
        try {
          const sessions = await api.getSessions(currentUser.id);
          setChatSessions(sessions);
          
          // We rely on URL sessionId if present
          // Otherwise, we load activeId from DB, and IF it exists, redirect to it.
          // Wait, the user wants new chat at /, so if we go to /, we don't want to redirect!
          // So if we are at / (no sessionId), we don't load an active session. We just stay at /
          
          if (!sessionId) {
            // New session at /
            setActiveSessionId(null);
            setMessages([]);
            setKanbanTasks([]);
            setAgendas([]);
            setNotes([]);
            setCharts([]);
          }

          setAgendas(await api.getData(currentUser.id, 'agendas', []));
          setNotes(await api.getData(currentUser.id, 'notes', []));
          setKanbanTasks(await api.getData(currentUser.id, 'kanban', []));
          setCharts(await api.getData(currentUser.id, 'charts', []));"""

content = content.replace(initial_load_old, initial_load_new)


# 11. Add a useEffect to listen to sessionId changes
session_observer = """  // Listen to sessionId changes
  useEffect(() => {
    if (sessionId && chatSessions.length > 0 && activeSessionId !== sessionId) {
      loadSession(sessionId);
    } else if (!sessionId && activeSessionId) {
      // we navigated back to /
      setActiveSessionId(null);
      setMessages([]);
      setKanbanTasks([]);
      setAgendas([]);
      setNotes([]);
      setCharts([]);
    }
  }, [sessionId, chatSessions, activeSessionId]);
"""

# Insert it before the Unified Save effect
content = content.replace("  // Unified Save for all sessions", session_observer + "\n  // Unified Save for all sessions")

# 12. Fix history sidebar click
history_click_old = """onClick={() => loadSession(s.id)}"""
history_click_new = """onClick={() => navigate(`/c/${s.id}`)}"""
content = content.replace(history_click_old, history_click_new)


# 13. Fix handleSend new session logic
handle_send_new_session_old = """    if (activeSessionId) {
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
    }"""

handle_send_new_session_new = """    let currentSessionId = activeSessionId;
    const title = userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : '');

    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      setActiveSessionId(currentSessionId);
      
      const newSession = { 
        id: currentSessionId, 
        title, 
        messages: newMessages, 
        type: activeView, 
        data: {
          kanban: kanbanTasks,
          notes: notes,
          agendas: agendas,
          charts: charts
        }, 
        updatedAt: new Date().toISOString() 
      };
      if (currentUser) api.saveSession(currentUser.id, newSession);
      setChatSessions(prev => [newSession, ...prev]);
      
      // Navigate to the new session URL seamlessly
      navigate(`/c/${currentSessionId}`);
    } else {
      setChatSessions(prev => {
        const exists = prev.find(s => s.id === currentSessionId);
        if (exists && currentMessages.length === 0) {
           const updated = { ...exists, title, messages: newMessages, updatedAt: new Date().toISOString() };
           if (currentUser) api.saveSession(currentUser.id, updated);
           return prev.map(s => s.id === currentSessionId ? updated : s);
        }
        return prev;
      });
    }"""

content = content.replace(handle_send_new_session_old, handle_send_new_session_new)

# 14. Fix the unified save effect where it does activeView === 'kanban' ? kanbanTasks : ... 
# We should save ALL widgets regardless of activeView!
unified_save_old = """            newSessions[idx].data = {
              kanban: activeView === 'kanban' ? kanbanTasks : newSessions[idx].data?.kanban || [],
              notes: activeView === 'notes' ? notes : newSessions[idx].data?.notes || [],
              agendas: activeView === 'calendar' ? agendas : newSessions[idx].data?.agendas || [],
              charts: activeView === 'visualizer' ? charts : newSessions[idx].data?.charts || []
            };"""

unified_save_new = """            newSessions[idx].data = {
              kanban: kanbanTasks,
              notes: notes,
              agendas: agendas,
              charts: charts
            };"""

content = content.replace(unified_save_old, unified_save_new)

# Same for transient session in the save effect
transient_save_old = """              data: {
                kanban: activeView === 'kanban' ? kanbanTasks : [],
                notes: activeView === 'notes' ? notes : [],
                agendas: activeView === 'calendar' ? agendas : [],
                charts: activeView === 'visualizer' ? charts : []
              },"""

transient_save_new = """              data: {
                kanban: kanbanTasks,
                notes: notes,
                agendas: agendas,
                charts: charts
              },"""

content = content.replace(transient_save_old, transient_save_new)

# Fix empty spam check 
has_data_old = """          const hasData = (activeView === 'kanban' && kanbanTasks.length > 0) || 
                          (activeView === 'notes' && notes.length > 0) || 
                          (activeView === 'calendar' && agendas.length > 0) || 
                          (activeView === 'visualizer' && charts.length > 0);"""

has_data_new = """          const hasData = kanbanTasks.length > 0 || notes.length > 0 || agendas.length > 0 || charts.length > 0;"""

content = content.replace(has_data_old, has_data_new)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("done")
