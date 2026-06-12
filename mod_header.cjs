const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /import \{ Send, /g,
  `import { ChevronDown, Send, `
);

code = code.replace(
  /<div className="header-title">Hakuen<\/div>/,
  `<div className="header-title" style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowModelDropdown(!showModelDropdown)}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    {aiModels.find(m => m.id === activeModelId)?.name || 'Hakuen'} <ChevronDown size={18} />
  </div>
  {showModelDropdown && (
    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '12px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', zIndex: 100, width: '220px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      {aiModels.map(m => (
        <div key={m.id} onClick={(e) => { e.stopPropagation(); setActiveModelId(m.id); if (currentUser) api.setData(currentUser.id, 'activeModelId', m.id); setShowModelDropdown(false); }} style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', background: activeModelId === m.id ? 'var(--accent)' : 'transparent', color: activeModelId === m.id ? '#000' : 'var(--fg)', fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: activeModelId === m.id ? 600 : 400 }}>
          {m.name}
        </div>
      ))}
      <div onClick={(e) => { e.stopPropagation(); setShowModelDropdown(false); setShowSettings(true); setSettingsTab('models'); }} style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', color: 'var(--accent)', fontSize: '14px', borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Settings size={14} /> Manage Models
      </div>
    </div>
  )}
</div>`
);
fs.writeFileSync('src/App.tsx', code);
