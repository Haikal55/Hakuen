import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add framer-motion and tanstack imports + Interfaces
imports_addition = """import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useRef, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface User { id: number; username: string; email: string; }
export interface Message { id: string; role: 'user' | 'assistant'; content: string; isStreaming?: boolean; }
export interface KanbanTask { id: string; text: string; column: string; }
export interface Agenda { dateStr: string; time: string; title: string; }
export interface NoteTask { text: string; done: boolean; }
export interface Note { title: string; type: 'text' | 'todo'; content: string; tasks?: NoteTask[]; date: string; }
export interface ChartData { name: string; value: number; color?: string; }
export interface Chart { id: string; type: 'bar' | 'line' | 'pie'; title: string; data: ChartData[]; }
export interface Session { id: string; title: string; type: string; messages: Message[]; data: any; updatedAt: string; }"""

content = re.sub(r"import \{ Routes, Route, useParams, useNavigate.*?from 'react';", imports_addition, content, flags=re.DOTALL)

# Replace 'any' in widgets
content = content.replace("agendas: any[], setAgendas: (a: any[]) => void", "agendas: Agenda[], setAgendas: (a: Agenda[]) => void")
content = content.replace("notes: any[], setNotes: (n: any[]) => void", "notes: Note[], setNotes: (n: Note[]) => void")
content = content.replace("charts: any[], setCharts: (data: any[]) => void", "charts: Chart[], setCharts: (data: Chart[]) => void")
content = content.replace("tasks: { id: string; text: string; column: string }[], setTasks: (t: any[]) => void", "tasks: KanbanTask[], setTasks: (t: KanbanTask[]) => void")

# Replace any in states
content = content.replace("const [messages, setMessages] = useState<any[]>([]);", "const [messages, setMessages] = useState<Message[]>([]);")
content = content.replace("const [kanbanTasks, setKanbanTasks] = useState<any[]>([]);", "const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);")
content = content.replace("const [notes, setNotes] = useState<any[]>([]);", "const [notes, setNotes] = useState<Note[]>([]);")
content = content.replace("const [agendas, setAgendas] = useState<any[]>([]);", "const [agendas, setAgendas] = useState<Agenda[]>([]);")
content = content.replace("const [charts, setCharts] = useState<any[]>([]);", "const [charts, setCharts] = useState<Chart[]>([]);")
content = content.replace("const [chatSessions, setChatSessions] = useState<any[]>([]);", "const [chatSessions, setChatSessions] = useState<Session[]>([]);")
content = content.replace("const [currentUser, setCurrentUser] = useState<any>(null);", "const [currentUser, setCurrentUser] = useState<User | null>(null);")

# Update AuthScreen types
content = content.replace("function AuthScreen({ onLogin }: { onLogin: (user: any) => void })", "function AuthScreen({ onLogin }: { onLogin: (user: User) => void })")

# Replace LazyMessage with Framer Motion version
lazy_msg_old = """const LazyMessage = React.memo(({ msg, avatar, activeView, markdownComponents, isLatest }: any) => {"""

lazy_msg_new = """const LazyMessage = React.memo(({ msg, avatar, activeView, markdownComponents, isLatest, style }: any) => {
  // style is from virtualization
  // For framer motion, we wrap the content
"""
content = content.replace(lazy_msg_old, lazy_msg_new)

# Update return inside LazyMessage to be motion.div
lazy_msg_return_old = """  return (
    <div ref={ref} className={`message-row ${msg.role}`}>"""

lazy_msg_return_new = """  return (
    <motion.div
      ref={ref}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`message-row ${msg.role}`}
    >"""
content = content.replace(lazy_msg_return_old, lazy_msg_return_new)
content = content.replace("</div>\n    );\n  }\n\n  let finalContent", "</motion.div>\n    );\n  }\n\n  let finalContent")

lazy_msg_final_return_old = """  return (
    <div ref={ref} className={`message-row ${msg.role}`}>"""
lazy_msg_final_return_new = """  return (
    <motion.div
      ref={ref}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`message-row ${msg.role}`}
    >"""
content = content.replace(lazy_msg_final_return_old, lazy_msg_final_return_new)

# Need to replace the final </div> of the message row
# It's better to just regex or string replace the specific closing div.
content = content.replace("        </div>\n      </div>\n    </div>\n  );\n});", "        </div>\n      </div>\n    </motion.div>\n  );\n});")


# Update the map function in chat rendering to use useVirtualizer
chat_render_old = """          <div className="messages" ref={messagesEndRef} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {messages.length === 0 ? (
"""

chat_render_new = """          <div className="messages" ref={messagesEndRef} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {messages.length === 0 ? ("""
            
# We actually need to inject useVirtualizer hook.
virtual_hook = """  // Virtualizer for messages
  const messagesParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => messagesParentRef.current,
    estimateSize: () => 100, // estimated height of a message
    overscan: 5,
  });

  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && messagesParentRef.current) {
      messagesParentRef.current.scrollTop = messagesParentRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

"""

# Insert inside AppContent just before states
content = content.replace("  // States", virtual_hook + "  // States")

# Replace messages container with virtualizer container
messages_container_old = """          <div className="messages" ref={messagesEndRef} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {messages.length === 0 ? ("""

messages_container_new = """          <div 
            className="messages" 
            ref={messagesParentRef} 
            style={{ flex: 1, overflowY: 'auto', padding: '24px' }}
            onScroll={(e) => {
               const target = e.target as HTMLDivElement;
               const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
               setAutoScroll(isAtBottom);
            }}
          >
            {messages.length === 0 ? ("""

content = content.replace(messages_container_old, messages_container_new)

messages_map_old = """              messages.map((msg: any, idx: number) => (
                <LazyMessage key={idx} msg={msg} avatar={currentUser?.avatar} activeView={activeView} markdownComponents={markdownComponents} isLatest={idx === messages.length - 1} />
              ))
            )}"""

messages_map_new = """              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const msg = messages[virtualItem.index];
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualItem.index}
                    >
                      <LazyMessage 
                        msg={msg} 
                        avatar={currentUser?.avatar} 
                        activeView={activeView} 
                        markdownComponents={markdownComponents} 
                        isLatest={virtualItem.index === messages.length - 1} 
                      />
                    </div>
                  );
                })}
              </div>
            )}"""

content = content.replace(messages_map_old, messages_map_new)

# Add logout functionality to Auth handler and UI
header_profile_old = """              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginTop: 'auto', cursor: 'pointer', transition: 'background 0.2s' }}>"""
header_profile_new = """              <div onClick={() => { api.logout(); setCurrentUser(null); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginTop: 'auto', cursor: 'pointer', transition: 'background 0.2s' }}>"""
content = content.replace(header_profile_old, header_profile_new)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("done")
