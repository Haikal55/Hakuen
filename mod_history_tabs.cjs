const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/import \{ ChevronDown, Send, /, 'import { Clock, ChevronDown, Send, ');

const historyViewComponent = `
  const [historyTab, setHistoryTab] = useState('chat');
  const HistoryView = () => {
    const tabs = [
      { id: 'chat', icon: <MessageSquare size={16}/>, label: 'Chat' },
      { id: 'research', icon: <Search size={16}/>, label: 'Research' },
      { id: 'calendar', icon: <Calendar size={16}/>, label: 'Calendar' },
      { id: 'notes', icon: <FileText size={16}/>, label: 'Notes' },
      { id: 'kanban', icon: <Layout size={16}/>, label: 'Kanban' },
      { id: 'visualizer', icon: <PieChartIcon size={16}/>, label: 'Visualizer' }
    ];
    const filteredSessions = chatSessions.filter(s => (s.type || 'chat') === historyTab);

    return (
      <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 24px', fontFamily: 'Outfit', fontWeight: 600 }}>Your History</h2>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {tabs.map(t => (
            <button 
              key={t.id} 
              onClick={() => setHistoryTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: historyTab === t.id ? 'var(--accent)' : 'var(--panel)', color: historyTab === t.id ? '#000' : 'var(--fg)', fontWeight: historyTab === t.id ? 600 : 400, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', alignContent: 'start', paddingBottom: '24px' }}>
          {filteredSessions.length === 0 ? (
            <div style={{ color: 'var(--muted)', gridColumn: '1 / -1', textAlign: 'center', marginTop: '10vh' }}>No history found for {tabs.find(t=>t.id===historyTab)?.label}.</div>
          ) : (
            filteredSessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => loadSession(session.id)}
                style={{ background: 'var(--panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s', position: 'relative' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontWeight: 600, fontSize: '15px', paddingRight: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{new Date(session.updatedAt || Date.now()).toLocaleDateString()}</span>
                  <span>{session.messages?.length || 0} msgs</span>
                </div>
                <button 
                  onClick={(e) => deleteChatSession(session.id, e)} 
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                  title="Delete Session"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };
`;

code = code.replace(
  /return \(\r?\n\s*<div className="app-container">/,
  historyViewComponent + '\n\n  return (\n    <div className="app-container">'
);

code = code.replace(
  /\{activeView === 'calendar' \|\| activeView === 'research' \|\| activeView === 'notes' \|\| activeView === 'kanban' \|\| activeView === 'visualizer' \? \(/,
  `{activeView === 'history' ? (
          <HistoryView />
        ) : activeView === 'calendar' || activeView === 'research' || activeView === 'notes' || activeView === 'kanban' || activeView === 'visualizer' ? (`
);

const newMenuButton = `
          <li className={\`menu-item \${activeView === 'visualizer' ? 'active' : ''}\`} onClick={() => { handleNewSession('visualizer'); if(window.innerWidth <= 768) setIsSidebarOpen(false); }}>
            <PieChartIcon size={18} /> Data Visualizer
          </li>
          <li className={\`menu-item \${activeView === 'history' ? 'active' : ''}\`} onClick={() => { setActiveView('history'); if(window.innerWidth <= 768) setIsSidebarOpen(false); }} style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <Clock size={18} /> History
          </li>
`;
code = code.replace(
  /<li className=\{\`menu-item \$\{activeView === 'visualizer' \? 'active' : ''\}\`\} onClick=\{\(\) => \{ handleNewSession\('visualizer'\); if\(window\.innerWidth <= 768\) setIsSidebarOpen\(false\); \}\}>\r?\n\s*<PieChartIcon size=\{18\} \/> Data Visualizer\r?\n\s*<\/li>/,
  newMenuButton
);

const startStr = '<div className="recent-chats"';
const endStr = '<div style={{ padding: \'16px\', borderTop: \'1px solid var(--border)\'';
const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);
if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + code.substring(endIdx);
}

fs.writeFileSync('src/App.tsx', code);
console.log('Done!');
