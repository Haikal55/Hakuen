import fs from 'fs';
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function run() {
  const base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const res = await fetch('http://localhost:3001/api/notes/image/1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, filename: 'test.png' })
  });
  const data = await res.json();
  console.log("Upload response:", data);
  
  if (data.success) {
    const res2 = await fetch('http://localhost:3001/api/notes/image/file/' + data.filename);
    console.log("Get image status:", res2.status);
    console.log("Get image headers:", res2.headers.get('content-type'));
  }
}
run();
