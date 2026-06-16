const ids = [
  'f32bdc70-4435-4aa7-92c4-f2e6184fc6b2', // 5 film terbaik
  'f7230345-10aa-49e0-901c-67ef2dca6c30', // Calico FIlm Emulation
  '013b2661-c5b2-4a67-89a1-56769c60e3c9', // Readme.md
  '4ba0af32-1784-416b-b7fe-d3bbb38594eb'  // SPMB
];

fetch('http://localhost:3001/api/notes/1/reorder', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderedIds: ids })
}).then(r => r.json()).then(data => {
  console.log("API response:", data);
  import('better-sqlite3').then(dbMod => {
    const db = new dbMod.default('./data/hakuen.db');
    const notes = db.prepare('SELECT id, title, order_index FROM notes').all();
    console.log("Updated notes:", notes);
  });
}).catch(console.error);
