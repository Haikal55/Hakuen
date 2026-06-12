const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace New Chat button
code = code.replace(
  /onClick=\{handleNewChat\}[\s\S]*?<Plus size=\{16\} \/> New Chat\r?\n\s*<\/button>/,
  `onClick={() => handleNewSession(activeView)} style={{ width: '100%', padding: '12px', background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}>
              <Plus size={16} /> New Session
            </button>`
);

// Replace menu list onClick
code = code.replace(/setActiveView\('chat'\);\s*if\(window\.innerWidth <= 768\) setIsSidebarOpen\(false\);/g, "handleNewSession('chat'); if(window.innerWidth <= 768) setIsSidebarOpen(false);");
code = code.replace(/setActiveView\('research'\);\s*if\s*\(window\.innerWidth <= 768\) setIsSidebarOpen\(false\);/g, "handleNewSession('research'); if(window.innerWidth <= 768) setIsSidebarOpen(false);");
code = code.replace(/setActiveView\('calendar'\);\s*if\(window\.innerWidth <= 768\) setIsSidebarOpen\(false\);/g, "handleNewSession('calendar'); if(window.innerWidth <= 768) setIsSidebarOpen(false);");
code = code.replace(/setActiveView\('notes'\);\s*if\(window\.innerWidth <= 768\) setIsSidebarOpen\(false\);/g, "handleNewSession('notes'); if(window.innerWidth <= 768) setIsSidebarOpen(false);");
code = code.replace(/setActiveView\('kanban'\);\s*if\(window\.innerWidth <= 768\) setIsSidebarOpen\(false\);/g, "handleNewSession('kanban'); if(window.innerWidth <= 768) setIsSidebarOpen(false);");
code = code.replace(/setActiveView\('visualizer'\);\s*if\(window\.innerWidth <= 768\) setIsSidebarOpen\(false\);/g, "handleNewSession('visualizer'); if(window.innerWidth <= 768) setIsSidebarOpen(false);");

// Replace Recent Chats text to History
code = code.replace(/Recent Chats/g, "History");

// Add icon to history based on session type
code = code.replace(
  /<span style=\{\{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 \}\}>\{session\.title\}<\/span>/,
  `<span style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                {session.type === 'research' ? <Search size={14} /> : session.type === 'calendar' ? <Calendar size={14} /> : session.type === 'notes' ? <FileText size={14} /> : session.type === 'kanban' ? <Layout size={14} /> : session.type === 'visualizer' ? <PieChartIcon size={14} /> : <MessageSquare size={14} />}
                {session.title}
              </span>`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Sidebar UI replaced');
