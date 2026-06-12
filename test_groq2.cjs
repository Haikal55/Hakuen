const { Groq } = require('groq-sdk');
const groq = new Groq({ 
  apiKey: 'ollama', 
  baseURL: 'https://openrouter.ai/api/v1',
  fetch: async (url, init) => {
    console.log("FETCH URL:", url);
    return fetch(url, init);
  }
});
async function run() {
  try {
    const res = await groq.chat.completions.create({ model: 'gpt-4', messages: [{role: 'user', content: 'test'}], max_tokens: 10 });
    console.log("Success:", res.choices[0].message.content);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
