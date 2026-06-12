const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const \[aiModel, setAiModel\] = useState\('llama3-8b-8192'\);/,
  `const [aiModels, setAiModels] = useState([{ id: 'default', name: 'Hakuen 20b', model: 'openai/gpt-oss-20b' }]);
  const [activeModelId, setActiveModelId] = useState('default');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [settingsTab, setSettingsTab] = useState('api');`
);

code = code.replace(
  /const dbModel = await api\.getData\(currentUser\.id, 'aiModel', null\);\s*if \(dbModel !== null\) setAiModel\(dbModel\);/,
  `const dbModels = await api.getData(currentUser.id, 'aiModels', null);
          if (dbModels !== null) setAiModels(dbModels);
          const dbActive = await api.getData(currentUser.id, 'activeModelId', null);
          if (dbActive !== null) setActiveModelId(dbActive);`
);

code = code.replace(
  /api\.setData\(currentUser\.id, 'aiModel', aiModel\);/,
  `api.setData(currentUser.id, 'aiModels', aiModels);`
);

code = code.replace(
  /setAiModel\(await api\.getData\(currentUser\.id, 'aiModel', 'llama3-8b-8192'\)\);/g,
  `const dbModels = await api.getData(currentUser.id, 'aiModels', null);
      if (dbModels) setAiModels(dbModels);`
);

code = code.replace(
  /setAiModel\('llama3-8b-8192'\);/,
  `setAiModels([{ id: 'default', name: 'Hakuen 20b', model: 'openai/gpt-oss-20b' }]);`
);

code = code.replace(
  /model: aiModel \|\| 'llama3-8b-8192',/g,
  `model: (aiModels.find(m => m.id === activeModelId)?.model || 'openai/gpt-oss-20b'),`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Done 1-5');
