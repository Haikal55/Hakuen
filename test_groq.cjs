const { Groq } = require('groq-sdk');
const groq = new Groq({ 
  apiKey: 'ollama', 
  baseURL: 'http://127.0.0.1:11434/v1',
  fetch: async (url, init) => {
    console.log("FETCH URL:", url);
    return fetch(url, init);
  }
});
async function run() {
  try {
    const res = await groq.chat.completions.create({ model: 'deepseek-coder:1.3b', messages: [{role: 'user', content: 'test'}], max_tokens: 10 });
    console.log("Success:", res.choices[0].message.content);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
