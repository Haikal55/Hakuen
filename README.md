# Hakuen AI Web App

Hakuen is a powerful, seamless AI assistant web application featuring unified chat history, intelligent routing, and an array of built-in tools. With Hakuen, you can conduct deep research, manage your kanban projects, schedule agendas, manage notes, visualize data, and parse PDF/Images all through natural conversation.

## 🌟 Key Features
- **Seamless Unified Chat**: Experience fluid URL routing where all tools (Kanban, Calendar, Notes, etc.) share the same conversational context and memory.
- **Dynamic Notes & Kanban Board**: Create notes in a grid or list view, manage to-do lists, and plan projects directly via AI generation. Notes open in a full-screen, responsive markdown-enabled viewer.
- **Deep Research Agent**: Scrapes the web and generates comprehensive markdown documents dynamically.
- **Dynamic Calendar & Agenda**: Manage your schedule, ask about specific dates, and visually see your tasks.
- **Data Visualizer**: Supply numerical data or tables, and the AI will generate beautiful interactive graphics.
- **Image OCR & PDF Parsing**: Upload images or PDFs directly into the chat; the AI can read and extract text from them instantly.
- **Fast Local Database**: Uses an Express + SQLite backend to save your chat sessions and documents locally and privately.



## 🚀 Installation Guide

This application requires **Node.js** (v18.0.0 or higher recommended). Please follow the instructions for your specific Operating System below.

### 🐧 Linux
1. **Install Node.js & npm**:
   If you haven't installed Node.js, you can install it via your package manager. For Debian/Ubuntu:
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```
2. **Clone the repository**:
   ```bash
   git clone https://github.com/Haikal55/Hakuen.git
   cd hakuen
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

### 🍎 macOS
1. **Install Node.js & npm**:
   The easiest way to install Node.js on macOS is via [Homebrew](https://brew.sh/):
   ```bash
   brew install node
   ```
2. **Clone the repository**:
   ```bash
   git clone https://github.com/Haikal55/Hakuen.git
   cd hakuen
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

### 🪟 Windows
1. **Install Node.js & npm**:
   Download the official Windows Installer (`.msi`) from [Node.js Official Website](https://nodejs.org/). Run the installer and follow the standard setup (make sure "npm" and "Add to PATH" are selected).
2. **Clone the repository**:
   Open Command Prompt, PowerShell, or Git Bash:
   ```cmd
   git clone https://github.com/Haikal55/Hakuen.git
   cd hakuen
   ```
3. **Install dependencies**:
   ```cmd
   npm install
   ```



## 💻 Running the Application

This app uses an Express + SQLite backend to save your chat sessions and a Vite + React frontend for the UI. You will need to run both servers.

1. **Start both Backend and Frontend Servers**:
   Open a terminal in the project root and run:
   ```bash
   npm start
   ```
   *This command uses `concurrently` to automatically run both the Express backend server (port 3001) and Vite frontend server (port 5173).*

2. **Accessing from Mobile / Local Network**:
   If you want to open the app from your phone (connected to the same Wi-Fi), run:
   ```bash
   npm run start:host
   ```
   *Vite will provide a "Network" IP address (e.g., `http://192.168.1.100:5173/`). Type that IP address into your phone's browser!*

3. **Open the App**:
   Navigate to `http://localhost:5173` in your web browser. You can create an account locally, enter your Groq API key in the settings panel, and start chatting!



## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, React Router DOM, Recharts, React Markdown
- **Backend**: Node.js, Express
- **Database**: SQLite (`better-sqlite3`)
- **AI Integration**: Groq SDK / OpenAI SDK
- **Utilities**: Tesseract.js (OCR), PDF.js (PDF parsing), Lucide React (Icons)
