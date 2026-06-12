import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';


export interface User { id: number; username: string; email: string; }
export interface Message { id?: string; role: 'user' | 'assistant' | 'system' | 'tool'; content: string; isStreaming?: boolean; internalContent?: string; tool_calls?: any[]; timestamp?: string; executionTime?: number; tokens?: number; }
export interface KanbanTask { id: string; text: string; column: string; }
export interface Agenda { dateStr: string; time: string; title: string; }
export interface NoteTask { text: string; done: boolean; }
export interface Note { id: string; title: string; type: 'text' | 'todo'; content: string; tasks?: any[]; is_pinned?: boolean; is_archived?: boolean; order_index?: number; created_at?: string; color?: string; bg_image?: string; bg_position?: string; tags?: string; }
export interface ChartData { name: string; value: number; color?: string; }
export interface Chart { id: string; type: 'bar' | 'line' | 'pie'; title: string; data: ChartData[]; }
export interface Session { id: string; title: string; type: string; messages: Message[]; data: any; updatedAt: string; }
import Groq from 'groq-sdk';
import { Clock, ChevronDown, Send, Settings, User, Loader2, MessageSquare, Search, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Edit2, Eye, FileText, CheckCircle, Calendar, ChevronLeft, ChevronRight, Paperclip, Trash2, Plus, Layout, PieChart as PieChartIcon, Upload, Download, Folder, Archive, CheckSquare, Check, X, Move, Image as ImageIcon, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import html2pdf from 'html2pdf.js';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import './index.css';
import { api } from './api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Tesseract from 'tesseract.js';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const preprocessLaTeX = (content: any) => {
  if (typeof content !== 'string') return '';
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
};

const extractFileContent = async (file: File): Promise<{ text: string, base64?: string }> => {
  const fileType = file.type;
  
  if (fileType === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = '';
    // Limit to first 10 pages for speed/token limits
    const numPages = Math.min(pdf.numPages, 10);
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return { text: `[PDF Content of ${file.name}]:\n${text}` };
  } 
  
  if (fileType.startsWith('image/')) {
    let base64 = '';
    try {
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject('Failed to read');
        reader.readAsDataURL(file);
      });
    } catch(e) {}

    let textResult = `[Image attached: ${file.name}]`;
    try {
      const result = await Tesseract.recognize(file, 'eng+ind');
      if (result.data.text.trim()) {
         textResult = `[Text extracted from image ${file.name}]:\n${result.data.text}`;
      }
    } catch (e) {}

    return { text: textResult, base64 };
  }
  
  // Default text fallback (html, txt, md, csv, etc)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ text: `[Content of ${file.name}]:\n${e.target?.result}` });
    reader.onerror = () => resolve({ text: `[Failed to read file ${file.name}]` });
    reader.readAsText(file);
  });
};

const CodeBlock = ({ node, inline, className, children, setPreviewHtml, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');
  const isHtml = match && match[1] === 'html';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div style={{ position: 'relative', background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden', margin: '16px 0', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2d2d2d', padding: '8px 16px', color: '#a0a0a0', fontSize: '12px' }}>
          <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{match[1]}</span>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={handleCopy} style={{ cursor: 'pointer', background: 'transparent', border: 'none', color: copied ? '#22c55e' : '#a0a0a0', display: 'flex', alignItems: 'center', gap: '4px' }}>
               {copied ? <CheckCircle size={14} /> : <FileText size={14} />} {copied ? 'Copied!' : 'Copy'}
             </button>
             {isHtml && (
               <button onClick={() => setPreviewHtml(codeString)} style={{ cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <Layout size={14} /> Run HTML
               </button>
             )}
          </div>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: '16px', background: 'transparent', fontSize: '14px' }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    );
  }
  return <code className={className} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }} {...props}>{children}</code>;
};

function CalendarWidget({ agendas, setAgendas, selectedDateStr, setSelectedDateStr }: { agendas: Agenda[], setAgendas: (a: Agenda[]) => void, selectedDateStr: string, setSelectedDateStr: (d: string) => void }) {
  const [time, setTime] = useState(new Date());
  const [viewOffset, setViewOffset] = useState(0);
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaTime, setNewAgendaTime] = useState('09:00');
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const currentMonth = time.getMonth();
  const currentYear = time.getFullYear();
  const todayDate = time.getDate();

  const viewDate = new Date(currentYear, currentMonth + viewOffset, 1);
  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const isCurrentView = viewOffset === 0;

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const days = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`;
    days.push({ date: daysInPrevMonth - i, isCurrentMonth: false, isToday: false, dateStr: dStr, hasAgenda: agendas.some(a => a.dateStr === dStr) });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ date: i, isCurrentMonth: true, isToday: isCurrentView && i === todayDate, dateStr: dStr, hasAgenda: agendas.some(a => a.dateStr === dStr) });
  }
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ date: i, isCurrentMonth: false, isToday: false, dateStr: dStr, hasAgenda: agendas.some(a => a.dateStr === dStr) });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <div style={{ padding: '32px 24px', background: 'var(--bg)', borderRadius: '24px', border: '1px solid var(--border)', textAlign: 'center', width: '100%' }}>
        <Calendar size={28} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
        <div style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 'bold', color: 'var(--heading)', fontFamily: 'monospace', letterSpacing: 2, lineHeight: 1 }}>
          {timeStr}
        </div>
        
        <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button className="icon-btn" onClick={() => setViewOffset(prev => prev - 1)}>
              <ChevronLeft size={20} />
            </button>
            <div key={`title-${viewOffset}`} style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--heading)', animation: 'fadeIn 0.3s ease-out' }}>
              {viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </div>
            <button className="icon-btn" onClick={() => setViewOffset(prev => prev + 1)}>
              <ChevronRight size={20} />
            </button>
          </div>
          <div key={`grid-${viewOffset}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', animation: 'fadeIn 0.3s ease-out' }}>
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <div key={day} style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b8a94', paddingBottom: '8px' }}>
                {day}
              </div>
            ))}
            {days.map((d, i) => (
              <div key={i} onClick={() => setSelectedDateStr(d.dateStr)} style={{
                padding: '6px',
                borderRadius: '8px',
                background: d.isToday ? 'var(--accent)' : (d.isCurrentMonth ? 'rgba(255,255,255,0.03)' : 'transparent'),
                color: d.isToday ? '#000' : (d.isCurrentMonth ? 'var(--heading)' : 'rgba(255,255,255,0.2)'),
                fontWeight: d.isToday ? 'bold' : 'normal',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                aspectRatio: '1/1',
                boxShadow: d.isToday ? '0 4px 12px rgba(var(--accent-rgb), 0.4)' : 'none',
                cursor: 'pointer',
                border: selectedDateStr === d.dateStr ? '1px solid var(--accent)' : '1px solid transparent',
                opacity: (!d.isCurrentMonth && !d.hasAgenda) ? 0.5 : 1
              }}>
                <span>{d.date}</span>
                {d.hasAgenda && <div style={{ width: 4, height: 4, borderRadius: '50%', background: d.isToday ? '#000' : 'var(--accent)', marginTop: 2 }} />}
              </div>
            ))}
          </div>

          {/* Agenda Details */}
          <div style={{ marginTop: 24, textAlign: 'left', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ color: 'var(--heading)', margin: 0, fontSize: 14 }}>
                Agendas for {selectedDateStr || '...'}
              </h4>
              {selectedDateStr && (
                <button 
                  onClick={() => setIsAddingAgenda(true)}
                  style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>

            {isAddingAgenda && (
              <div style={{ marginBottom: 16, background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8 }}>
                 <input type="time" value={newAgendaTime} onChange={e => setNewAgendaTime(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)' }} />
                 <input type="text" placeholder="Agenda Title" value={newAgendaTitle} onChange={e => setNewAgendaTitle(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)' }} />
                 <div style={{ display: 'flex', gap: 8 }}>
                   <button onClick={() => {
                     if (!newAgendaTitle || !newAgendaTime) return;
                     setAgendas([...agendas, { dateStr: selectedDateStr, time: newAgendaTime, title: newAgendaTitle }]);
                     setIsAddingAgenda(false);
                     setNewAgendaTitle('');
                     setNewAgendaTime('09:00');
                   }} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, padding: '6px 12px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                   <button onClick={() => setIsAddingAgenda(false)} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                 </div>
              </div>
            )}

            {selectedDateStr && agendas.filter(a => a.dateStr === selectedDateStr).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 8, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: 13 }}>{a.time}</div>
                  <div style={{ color: 'var(--fg)', fontSize: 13 }}>{a.title}</div>
                </div>
                <button onClick={() => {
                  setAgendas(agendas.filter(item => item !== a));
                }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {(!selectedDateStr || agendas.filter(a => a.dateStr === selectedDateStr).length === 0) && !isAddingAgenda && (
              <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                {selectedDateStr ? "Tidak ada agenda." : "Pilih tanggal untuk melihat detail."}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}


function NotesWidget({ currentUser, onGenerateAI }: { currentUser: User; onGenerateAI?: (title: string, type: 'text'|'todo', onUpdate?: (chunk: string) => void) => Promise<string | void> }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAdding, setIsAdding] = useState<'text' | 'todo' | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingExpandedNote, setIsEditingExpandedNote] = useState(false);
  
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [editContentValue, setEditContentValue] = useState('');
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editBgImage, setEditBgImage] = useState<string | null>(null);
  const [editBgPosition, setEditBgPosition] = useState<string>('center');
  const [isPositioningBg, setIsPositioningBg] = useState(false);
  const [bgPosPct, setBgPosPct] = useState({ x: 50, y: 50 });
  const [editTags, setEditTags] = useState('');

  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchNotes();
  }, [currentUser]);

  const fetchNotes = async () => {
    try {
      const data = await api.getNotes(currentUser.id);
      if (Array.isArray(data)) setNotes(data);
      else setNotes([]);
    } catch (e) { setNotes([]); }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    try {
      await api.updateNote(currentUser.id, id, updates);
      await fetchNotes();
    } catch (e) { console.error(e); }
  };

  const deleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.deleteNote(currentUser.id, id);
      await fetchNotes();
    } catch (e) { console.error(e); }
  };

  const toggleTodo = async (noteId: string, taskIndex: number) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.tasks) return;
    const newTasks = [...note.tasks];
    newTasks[taskIndex].done = !newTasks[taskIndex].done;
    await handleUpdateNote(noteId, { tasks: newTasks });
  };

  const handleAdd = async () => {
    if (!isAdding) return;
    if (!newTitle.trim() && !newContent.trim()) { setIsAdding(null); return; }
    let tasks: any[] = [];
    if (isAdding === 'todo') {
      tasks = newContent.split('\n').filter(t => t.trim()).map(t => ({ text: t.replace(/^[-*\[\]\s]+/, ''), done: false }));
    }
    try {
      await api.createNote(currentUser.id, {
        title: newTitle.trim() || 'Untitled',
        type: isAdding,
        content: isAdding === 'text' ? newContent : '',
        tasks,
        tags: newTags
      });
      setIsAdding(null);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      await fetchNotes();
    } catch (e) {}
  };

  const appendTask = async (noteId: string) => {
    if (!newTaskText.trim()) { return; }
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const newTasks = [...(note.tasks || []), { text: newTaskText.trim(), done: false }];
    await handleUpdateNote(noteId, { tasks: newTasks });
    setNewTaskText('');
  };

  const handleExpandNote = (note: Note) => {
    if (expandedNote === note.id) {
      setExpandedNote(null);
    } else {
      setExpandedNote(note.id);
      setEditTitleValue(note.title);
      setEditContentValue(note.content || '');
      setEditColor(note.color || null);
      setEditBgImage(note.bg_image || null);
      setEditBgPosition(note.bg_position || 'center');
      setIsPositioningBg(false);
      setEditTags(note.tags || '');
      setIsEditingExpandedNote(false);
    }
  };

  const saveExpandedNote = async (noteId: string) => {
    await handleUpdateNote(noteId, {
      title: editTitleValue,
      content: editContentValue,
      color: editColor,
      bg_image: editBgImage,
      bg_position: editBgPosition,
      tags: editTags
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const res = await api.uploadNoteImage(currentUser.id, base64, file.name);
        setEditBgImage(res.filename);
        setEditBgPosition('center');
        setBgPosPct({ x: 50, y: 50 });
        setEditColor(null);
      } catch (err) { console.error("Upload failed", err); }
    };
    reader.readAsDataURL(file);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => { e.stopPropagation(); setDraggedNoteId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!draggedNoteId || draggedNoteId === targetId) return;
    const sourceIdx = notes.findIndex(n => n.id === draggedNoteId);
    const targetIdx = notes.findIndex(n => n.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const newNotes = [...notes];
    const [removed] = newNotes.splice(sourceIdx, 1);
    newNotes.splice(targetIdx, 0, removed);
    setNotes(newNotes);
    try { await api.reorderNotes(currentUser.id, newNotes.map(n => n.id)); } catch(err) { fetchNotes(); }
    setDraggedNoteId(null);
  };

  const allTags = Array.from(new Set(notes.flatMap(n => (n.tags || '').split(' ').filter((t: string) => t.startsWith('#')))));
  const filterOptions = ['All', 'Default', 'Reminders', 'Archive', ...allTags];

  const displayedNotes = notes.filter(n => {
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    if (activeFilter === 'All') return !n.is_archived;
    if (activeFilter === 'Archive') return n.is_archived;
    if (activeFilter === 'Reminders') return n.is_pinned;
    if (activeFilter === 'Default') return !n.is_pinned && !n.is_archived && (!n.tags || n.tags.trim() === '');
    if (activeFilter.startsWith('#')) return n.tags && n.tags.includes(activeFilter);
    return true;
  });

  const palette = ['transparent', '#e57373', '#f06292', '#ba68c8', '#9575cd', '#7986cb', '#64b5f6', '#4fc3f7', '#4dd0e1', '#4db6ac', '#81c784', '#aed581', '#ff8a65', '#d4e157', '#ffd54f', '#ffb74d'];

  function renderNoteCard(note: Note) {
    const isExpanded = expandedNote === note.id;
    const currentBgImage = isExpanded ? editBgImage : note.bg_image;
    const currentColor = isExpanded ? editColor : note.color;
    const currentBgPos = isExpanded ? editBgPosition : (note.bg_position || 'center');
    const hasImage = !!currentBgImage;
    const resolvedColor = currentColor && currentColor !== 'transparent' ? currentColor : 'rgba(255,255,255,0.03)';

    return (
      <div className={`note-card-wrapper ${viewMode === 'list' ? 'list-mode' : ''}`} key={note.id}>
        <div 
          draggable={true}
          onDragStart={(e) => handleDragStart(e, note.id)}
          onDragEnd={() => setDraggedNoteId(null)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, note.id)}
          style={{ 
            backgroundColor: hasImage ? 'transparent' : resolvedColor,
            backgroundImage: hasImage ? `url("http://${window.location.hostname}:3001/api/notes/image/file/${encodeURIComponent(currentBgImage as string)}")` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: currentBgPos,
            border: draggedNoteId === note.id ? '1px dashed var(--accent)' : `1px solid ${note.color && note.color !== 'transparent' ? note.color : 'var(--border)'}`, 
            borderRadius: '12px', 
            padding: '16px',
            transition: 'all 0.2s', 
            position: 'relative', 
            opacity: draggedNoteId === note.id ? 0.5 : 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
        >
          {hasImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 0 }} />}

          <div style={{ position: 'relative', zIndex: 1, cursor: 'pointer' }} onClick={() => handleExpandNote(note)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: hasImage ? '#fff' : 'var(--heading)' }}>{note.title}</span>
              {note.is_pinned && <span style={{ transform: 'rotate(45deg)', display: 'inline-block', fontSize: 14 }}>📌</span>}
            </div>
            
            {note.type === 'text' ? (
              <div className="markdown-body" style={{ fontSize: '14px', opacity: 0.9, color: hasImage ? '#ddd' : 'var(--fg)', maxHeight: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{preprocessLaTeX(note.content || '')}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {note.tasks && note.tasks.slice(0, 5).map((task, tIdx) => (
                  <div key={tIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: 13 }}>
                    <div onClick={(e) => { e.stopPropagation(); toggleTodo(note.id, tIdx); }} style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${task.done ? 'var(--accent)' : 'var(--muted)'}`, background: task.done ? 'var(--accent)' : 'transparent', marginTop: 2 }}>
                      {task.done && <Check size={10} color="#000" />}
                    </div>
                    <span style={{ color: task.done ? 'var(--muted)' : (hasImage ? '#ddd' : 'var(--fg)'), textDecoration: task.done ? 'line-through' : 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.text}</span>
                  </div>
                ))}
                {note.tasks && note.tasks.length > 5 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>+ {note.tasks.length - 5} more items</div>}
              </div>
            )}
            
            {(note.tags || note.created_at) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {note.tags && note.tags.split(' ').map((t: string, i: number) => t.startsWith('#') ? <span key={i} style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', color: hasImage ? '#fff' : 'var(--accent)' }}>{t}</span> : null)}
                </div>
                <div style={{ fontSize: 11, color: hasImage ? 'rgba(255,255,255,0.6)' : 'var(--muted)' }}>{new Date(note.created_at || Date.now()).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <style>{`
        .notes-masonry { column-count: 1; column-gap: 16px; padding: 24px; }
        @media (min-width: 768px) { .notes-masonry { column-count: 2; } }
        @media (min-width: 1200px) { .notes-masonry { column-count: 3; } }
        @media (min-width: 1600px) { .notes-masonry { column-count: 4; } }
        .note-card-wrapper { break-inside: avoid; page-break-inside: avoid; margin-bottom: 16px; }
        .notes-list-view { display: flex; flexDirection: column; gap: 16px; padding: 24px; max-width: 1000px; margin: 0 auto; width: 100%; }
        .note-card-wrapper.list-mode { width: 100%; }
        
        .notes-header-container { position: sticky; top: 0; z-index: 10; background: var(--bg); border-bottom: 1px solid var(--border); }
        .notes-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; gap: 16px; }
        .notes-header-left { display: flex; align-items: center; gap: 24px; flex: 1; }
        .notes-header-right { display: flex; align-items: center; gap: 12px; }
        .notes-search { flex: 1; max-width: 600px; position: relative; }
        .notes-search input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 10px 16px 10px 40px; border-radius: 8px; color: var(--fg); font-size: 14px; outline: none; }
        .notes-search svg { position: absolute; left: 12px; top: 10px; color: var(--muted); }
        .filter-pill { padding: 6px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; white-space: nowrap; }
        .filter-pill.active { background: rgba(255,255,255,0.1); color: var(--accent); border-color: var(--accent); }
        @media (max-width: 768px) {
          .notes-header { flex-direction: column; align-items: stretch; padding: 16px 16px 12px; }
          .notes-header-left { flex-direction: column; align-items: stretch; gap: 12px; }
          .notes-header-right { justify-content: space-between; width: 100%; }
          .notes-search { max-width: none; }
          .notes-masonry { padding: 16px; }
          .notes-list-view { padding: 16px; }
        }
      `}</style>
      
      <div className="notes-header-container">
        <div className="notes-header">
          <div className="notes-header-left">
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: 20 }}><FileText size={20} color="var(--accent)" /> Notes</h2>
            <div className="notes-search">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search notes... (Press Enter)" 
                value={searchInput} 
                onChange={e => {
                  setSearchInput(e.target.value);
                  if (e.target.value === '') setSearchQuery('');
                }} 
                onKeyDown={e => {
                  if (e.key === 'Enter') setSearchQuery(searchInput);
                }} 
              />
            </div>
          </div>
          <div className="notes-header-right">
            <button className="btn btn-secondary" onClick={() => setActiveFilter(activeFilter === 'Archive' ? 'All' : 'Archive')} style={{ background: activeFilter === 'Archive' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeFilter === 'Archive' ? 'var(--accent)' : 'var(--fg)', flex: 1, justifyContent: 'center' }}><Archive size={16} style={{marginRight: 6}}/> Archive</button>
          </div>
        </div>

        <div style={{ padding: '0 24px 16px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {filterOptions.map(f => (
            <div key={f} className={`filter-pill ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>
              {f === 'Reminders' && <span style={{marginRight: 4}}>📌</span>}
              {f}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 24px 0', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" style={{ padding: '8px', background: isAdding === 'todo' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', border: 'none', color: isAdding === 'todo' ? '#fff' : 'inherit' }} onClick={() => setIsAdding(isAdding === 'todo' ? null : 'todo')} title="Add To-Do"><CheckSquare size={16} /></button>
          <input 
            type="text" 
            placeholder="Take a note..." 
            value={newTitle}
            onChange={e => { setNewTitle(e.target.value); if(!isAdding) setIsAdding('text'); }}
            onFocus={() => { if(!isAdding) setIsAdding('text'); }}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--fg)', fontSize: '15px', outline: 'none' }}
          />
          {onGenerateAI && newTitle.trim() && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px', background: isGenerating ? 'var(--bg)' : 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--accent)' }} 
              onClick={async () => {
                if(isGenerating) return;
                setIsGenerating(true);
                const type = isAdding === 'todo' ? 'todo' : 'text';
                setIsAdding(type);
                setNewContent("");
                await onGenerateAI(newTitle, type, (chunk) => {
                  setNewContent(prev => prev + chunk);
                });
                setIsGenerating(false);
              }} 
              title="Generate with AI"
            >
              {isGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            </button>
          )}
          <button className="btn btn-secondary" style={{ padding: '8px', background: isAdding === 'text' ? 'var(--accent)' : 'transparent', border: 'none', color: isAdding === 'text' ? '#fff' : 'inherit' }} onClick={() => setIsAdding(isAdding === 'text' ? null : 'text')} title="New Note"><FileText size={16} /></button>
        </div>

        {isAdding && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--accent)', padding: '16px', marginTop: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'fadeIn 0.2s' }}>
            <textarea
              placeholder={isAdding === 'todo' ? "List tasks (one per line)..." : "Write your note here..."}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              autoFocus
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--fg)', minHeight: '100px', resize: 'vertical', outline: 'none', fontSize: '14px', fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <input type="text" placeholder="#tags" value={newTags} onChange={e => setNewTags(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--fg)', fontSize: 13, outline: 'none', width: '150px' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setIsAdding(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAdd}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {displayedNotes.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: '60px' }}>
          <FileText size={48} opacity={0.2} style={{ margin: '0 auto 16px', display: 'block' }} />
          <p>No notes found for this filter.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'notes-masonry' : 'notes-list-view'}>
          {displayedNotes.map(note => renderNoteCard(note))}
        </div>
      )}

      {expandedNote && (() => {
        const note = notes.find(n => n.id === expandedNote);
        if (!note) return null;
        const currentBgImage = editBgImage;
        const currentColor = editColor;
        const currentBgPos = editBgPosition;
        const hasImage = !!currentBgImage;
        const resolvedColor = currentColor && currentColor !== 'transparent' ? currentColor : 'var(--bg)';
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ 
              width: '90vw', maxWidth: '800px', height: '85vh', maxHeight: '900px',
              backgroundColor: hasImage ? 'transparent' : resolvedColor,
              backgroundImage: hasImage ? `url("http://${window.location.hostname}:3001/api/notes/image/file/${encodeURIComponent(currentBgImage as string)}")` : undefined,
              backgroundSize: 'cover', backgroundPosition: currentBgPos,
              borderRadius: '16px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              position: 'relative', animation: 'fadeIn 0.2s'
            }}>
              {hasImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 0 }} />}
              
              <div style={{ padding: '32px', flex: 1, position: 'relative', zIndex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {!isEditingExpandedNote ? (
                  <>
                    <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'inherit', flexShrink: 0 }}>
                      {editTitleValue || 'Untitled'}
                    </h2>
                    {note.type === 'text' ? (
                      <div className="markdown-body" style={{ color: '#fff', fontSize: '15px', lineHeight: 1.6, fontFamily: 'inherit' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {preprocessLaTeX(editContentValue || '')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {note.tasks && note.tasks.map((task, tIdx) => (
                          <div key={tIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: 14 }}>
                            <div onClick={() => toggleTodo(note.id, tIdx)} style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${task.done ? 'var(--accent)' : 'rgba(255,255,255,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: task.done ? 'var(--accent)' : 'transparent', marginTop: 2 }}>
                              {task.done && <Check size={12} color="#000" />}
                            </div>
                            <span style={{ color: task.done ? 'rgba(255,255,255,0.5)' : '#fff', textDecoration: task.done ? 'line-through' : 'none', flex: 1 }}>{task.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <input 
                      type="text" 
                      value={editTitleValue}
                      onChange={e => setEditTitleValue(e.target.value)}
                      placeholder="Title"
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', fontWeight: 600, outline: 'none', marginBottom: '16px', fontFamily: 'inherit', flexShrink: 0 }}
                    />
                    
                    {note.type === 'text' ? (
                      <textarea
                        autoFocus
                        value={editContentValue}
                        onChange={e => setEditContentValue(e.target.value)}
                        placeholder="Write something..."
                        style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '15px', resize: 'none', outline: 'none', flex: 1, minHeight: '150px', overflowY: 'auto', lineHeight: 1.6, fontFamily: 'inherit' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {note.tasks && note.tasks.map((task, tIdx) => (
                          <div key={tIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: 14 }}>
                            <div onClick={() => toggleTodo(note.id, tIdx)} style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${task.done ? 'var(--accent)' : 'rgba(255,255,255,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: task.done ? 'var(--accent)' : 'transparent', marginTop: 2 }}>
                              {task.done && <Check size={12} color="#000" />}
                            </div>
                            <span style={{ color: task.done ? 'rgba(255,255,255,0.5)' : '#fff', textDecoration: task.done ? 'line-through' : 'none', flex: 1 }}>{task.text}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <input type="text" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') appendTask(note.id); }} placeholder="Add task..." style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 16px', borderRadius: '8px', fontSize: 14, outline: 'none' }} />
                          <button className="btn btn-secondary" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none' }} onClick={() => appendTask(note.id)}>Add</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div style={{ background: '#1e1e24', borderTop: '1px solid #333', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                {!isEditingExpandedNote ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', fontSize: 13, padding: '8px 16px' }} onClick={() => { handleUpdateNote(note.id, { is_archived: !note.is_archived }); setExpandedNote(null); }}><Archive size={16} style={{marginRight: 6}}/> {note.is_archived ? 'Unarchive' : 'Archive'}</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px', background: 'var(--accent)', color: '#000', border: 'none' }} onClick={() => setIsEditingExpandedNote(true)}><Edit2 size={16} style={{marginRight: 6}}/> Edit Note</button>
                      <button className="btn btn-secondary" style={{ background: 'transparent', border: '1px solid #555', fontSize: 13, padding: '8px 16px' }} onClick={() => setExpandedNote(null)}><X size={16} style={{marginRight: 6}}/> Close</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', transition: 'background 0.2s' }} title="Add background image">
                          <ImageIcon size={18} color="rgba(255,255,255,0.7)" />
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>
                        {editBgImage && (
                          <>
                            <div style={{ position: 'relative' }}>
                              <button className="btn btn-secondary" style={{ width: 36, height: 36, padding: 0, borderRadius: 8, background: isPositioningBg ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: isPositioningBg ? '#000' : 'var(--muted)', border: 'none' }} title="Adjust Position" onClick={() => setIsPositioningBg(!isPositioningBg)}>
                                <Move size={18} />
                              </button>
                              {isPositioningBg && (
                                <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px', background: 'var(--panel)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 10, width: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                  <div style={{ fontSize: 13, color: 'var(--heading)', fontWeight: 500 }}>Background Position</div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Horizontal (X)</div>
                                    <input type="range" min="0" max="100" value={bgPosPct.x} onChange={e => { const newX = parseFloat(e.target.value); setBgPosPct(p => ({...p, x: newX})); setEditBgPosition(`${newX}% ${bgPosPct.y}%`); }} style={{ width: '100%' }} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Vertical (Y)</div>
                                    <input type="range" min="0" max="100" value={bgPosPct.y} onChange={e => { const newY = parseFloat(e.target.value); setBgPosPct(p => ({...p, y: newY})); setEditBgPosition(`${bgPosPct.x}% ${newY}%`); }} style={{ width: '100%' }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {palette.slice(0, 8).map(c => (
                          <div key={c} onClick={() => { setEditColor(c); setEditBgImage(null); }} style={{ width: 20, height: 20, borderRadius: '50%', background: c === 'transparent' ? '#333' : c, cursor: 'pointer', border: editColor === c ? '2px solid #fff' : '2px solid transparent', transition: 'border 0.2s' }} />
                        ))}
                      </div>
                      
                      <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="#tag1 #tag2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: 'var(--accent)', padding: '8px 16px', borderRadius: '20px', fontSize: 13, outline: 'none', width: '140px' }} />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', fontSize: 13, padding: '8px 16px', color: 'var(--danger)' }} onClick={(e) => { deleteNote(note.id, e); setExpandedNote(null); }}><Trash2 size={16} style={{marginRight: 6}}/> Delete</button>
                      <button className="btn btn-secondary" style={{ background: 'transparent', border: '1px solid #555', fontSize: 13, padding: '8px 16px' }} onClick={() => setIsEditingExpandedNote(false)}><X size={16} style={{marginRight: 6}}/> Cancel</button>
                      <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px', background: '#3b3b4f', color: '#fff', border: '1px solid #555' }} onClick={() => { saveExpandedNote(note.id); setIsEditingExpandedNote(false); }}><Check size={16} style={{marginRight: 6}}/> Update</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


function KanbanWidget({ tasks, setTasks }: { tasks: KanbanTask[], setTasks: (t: KanbanTask[]) => void }) {
  const [newTaskText, setNewTaskText] = useState('');
  
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) setTasks(tasks.map(t => t.id === id ? { ...t, column } : t));
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      setTasks([...tasks, { id: Date.now().toString(), text: newTaskText.trim(), column: 'todo' }]);
      setNewTaskText('');
    }
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const renderColumn = (columnId: string, title: string, color: string) => (
    <div 
      style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', transition: 'background 0.2s' }}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, columnId)}
      onDragEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
      onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '8px' }}>
         <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
         <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{title}</h3>
         <span style={{ marginLeft: 'auto', background: 'var(--panel)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{tasks.filter(t => t.column === columnId).length}</span>
      </div>
      <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tasks.filter(t => t.column === columnId).map(task => (
          <div 
            key={task.id}
            draggable
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            style={{ 
              background: 'var(--panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', 
              cursor: 'grab', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <span style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--fg)', cursor: 'grab' }}>{task.text}</span>
            <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {columnId === 'todo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
             <input type="text" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask(); }} placeholder="New task..." style={{ background: 'transparent', border: '1px dashed var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--fg)', fontSize: '13px', outline: 'none' }} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', padding: '20px', display: 'flex', gap: '16px', overflowX: 'auto' }}>
      {renderColumn('todo', 'To Do', 'var(--accent)')}
      {renderColumn('in-progress', 'In Progress', '#3b82f6')}
      {renderColumn('done', 'Done', '#22c55e')}
    </div>
  );
}

function ChartWidget({ charts, setCharts }: { charts: Chart[], setCharts: (data: Chart[]) => void }) {
  if (!charts || charts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>
        <PieChartIcon size={64} opacity={0.2} style={{ marginBottom: '16px' }} />
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--heading)' }}>No Data to Visualize</h3>
        <p style={{ margin: 0, fontSize: '14px', maxWidth: '300px' }}>Ask me to generate a chart based on your data, or paste a table of numbers and I'll create a beautiful visualization for you.</p>
      </div>
    );
  }

  const COLORS = ['#ffb703', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#06b6d4', '#f97316'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--heading)' }}>{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ margin: 0, color: p.color || 'var(--accent)', fontSize: '14px' }}>
              {p.name}: <span style={{ fontWeight: 600 }}>{p.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '32px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 13 }} 
          onClick={() => { setCharts([]); }}>
            <Trash2 size={16} /> Clear All
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
        {charts.map((chart: any, chartIdx: number) => {
          const { type, title, data, id } = chart;
          return (
            <div key={id || chartIdx} style={{ position: 'relative', height: '400px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <button 
                onClick={() => setCharts(charts.filter((_, idx) => idx !== chartIdx))}
                style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', zIndex: 10 }}
                title="Delete Chart"
              >
                <Trash2 size={16} />
              </button>
              <h2 style={{ textAlign: 'center', margin: '0 0 24px 0', fontSize: '20px', fontWeight: 700, color: 'var(--heading)', fontFamily: 'Outfit', padding: '0 40px' }}>{title}</h2>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {type === 'bar' ? (
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="value" name="Value" fill="var(--accent)" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          ) : type === 'pie' ? (
            <RechartsPieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius="80%" fill="#8884d8" dataKey="value" label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text x={x} y={y} fill="var(--heading)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={500}>
                    {name} {((percent || 0) * 100).toFixed(0)}%
                  </text>
                );
              }}>
                {data.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--bg)" strokeWidth={2} />
                ))}
              </Pie>
            </RechartsPieChart>
          ) : (
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="value" name="Value" stroke="var(--accent)" strokeWidth={3} dot={{ r: 5, fill: 'var(--bg)', stroke: 'var(--accent)', strokeWidth: 2 }} activeDot={{ r: 7 }} />
            </LineChart>
          )}
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LibraryWidget({ libraryFiles, setLibraryFiles, currentUser, onPreviewImage }: { libraryFiles: any[], setLibraryFiles: (files: any[]) => void, currentUser: User, onPreviewImage: (src: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFilenameValue, setEditFilenameValue] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLibrary = async () => {
    try {
      const data = await api.getLibrary(currentUser.id);
      setLibraryFiles(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchLibrary();
  }, [currentUser]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      // First, get the base64 of the file for physical storage
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Then, extract text content
      let content = '';
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const extracted = await extractFileContent(file);
        content = extracted.text;
      } else {
        content = await file.text();
      }
      
      await api.uploadToLibrary(currentUser.id, {
        filename: file.name,
        type: file.type,
        content,
        base64
      });
      await fetchLibrary();
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.deleteFromLibrary(currentUser.id, id);
      await fetchLibrary();
    } catch (e) { console.error(e); }
  };

  const handleEditStart = (file: any) => {
    setEditingFileId(file.id);
    const parts = file.filename.split('.');
    if (parts.length > 1) parts.pop();
    setEditFilenameValue(parts.join('.'));
  };

  const handleEditSave = async (file: any) => {
    if (!editFilenameValue.trim()) return;
    const extMatch = file.filename.match(/\.([^.]+)$/);
    const ext = extMatch ? `.${extMatch[1]}` : '';
    const newFilename = `${editFilenameValue.trim()}${ext}`;
    
    if (newFilename !== file.filename) {
      try {
        await api.updateLibraryFilename(currentUser.id, file.id, newFilename);
        await fetchLibrary();
      } catch (e) { console.error(e); }
    }
    setEditingFileId(null);
  };

  return (
    <div style={{ padding: '32px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontFamily: 'Outfit', color: 'var(--heading)' }}>Your Library</h2>
        <div>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} />
          <button className="btn" style={{ background: 'var(--accent)', color: '#000', fontWeight: 600, padding: '8px 16px' }} onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 size={16} className="spinner" /> : <Upload size={16} style={{ marginRight: 8 }} />} 
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
      
      {libraryFiles.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: '10vh' }}>
          <Folder size={64} opacity={0.2} style={{ marginBottom: 16 }} />
          <h3>No files in library</h3>
          <p>Upload PDFs, images, or text files to use them across chats.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {libraryFiles.map(file => {
            const isImage = file.type.startsWith('image/');
            const isEditing = editingFileId === file.id;
            const imgSrc = `http://${window.location.hostname}:3001/api/library/file/${file.id}`;
            return (
            <div key={file.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isImage && (
                <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', marginBottom: '4px', cursor: 'pointer' }} onClick={() => onPreviewImage(imgSrc)}>
                  <img src={imgSrc} alt={file.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
                  {!isImage && <FileText size={20} color="var(--accent)" style={{ flexShrink: 0 }} />}
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editFilenameValue} 
                      onChange={(e) => setEditFilenameValue(e.target.value)} 
                      onBlur={() => handleEditSave(file)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(file); else if (e.key === 'Escape') setEditingFileId(null); }}
                      autoFocus
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--fg)', padding: '4px 8px', borderRadius: '4px', fontSize: 13, outline: 'none' }} 
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => handleEditStart(file)} 
                      style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'text' }}
                      title="Double click to rename"
                    >
                      {file.filename}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                  <button onClick={() => !isEditing && handleEditStart(file)} className="icon-btn" style={{ color: 'var(--muted)', padding: 4 }} title="Rename">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(file.id)} className="icon-btn" style={{ color: 'var(--danger)', padding: 4 }} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {new Date(file.created_at).toLocaleDateString()} &bull; {file.type.split('/')[1] || file.type}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AuthScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      if (!email.trim() || !password.trim()) {
        setError('Email and password are required');
        return;
      }
      try {
        const user = await api.login(email, password);
        onLogin(user);
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      if (!username.trim() || !email.trim() || !password.trim()) {
        setError('Username, email, and password are required');
        return;
      }
      try {
        const user = await api.register(username, email, password);
        onLogin(user);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'Inter' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', color: 'var(--heading)', margin: '0 0 8px 0', fontFamily: 'Outfit' }}>Hakuen</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>{isLogin ? 'Welcome back to your AI Assistant' : 'Create your Hakuen account'}</p>
        </div>
        
        {error && <div style={{ padding: '12px', background: 'rgba(255,107,107,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', textAlign: 'center', border: '1px solid rgba(255,107,107,0.2)' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--fg)', fontSize: '16px', outline: 'none' }} placeholder="Enter username" />
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--fg)', fontSize: '16px', outline: 'none' }} placeholder="Enter your email" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--fg)', fontSize: '16px', outline: 'none' }} placeholder="Enter password" />
          </div>
          <button type="submit" style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginTop: '8px', transition: 'background 0.2s' }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
          <span style={{ color: 'var(--muted)' }}>{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

const LazyMessage = React.memo(({ msg, avatar, logoUrl, activeView, markdownComponents, isLatest, style }: any) => {
  // style is from virtualization
  // For framer motion, we wrap the content

  const [isVisible, setIsVisible] = useState(isLatest || msg.isStreaming);
  const [showReasoning, setShowReasoning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLatest || msg.isStreaming) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isLatest, msg.isStreaming]);

  if (!isVisible) {
    return (
      <motion.div style={style} ref={ref} className={`message-row ${msg.role}`}>
        <div className="avatar" style={msg.role === 'user' && avatar ? { padding: 0, overflow: 'hidden' } : {}}>
          {msg.role === 'user' ? (avatar ? <img src={avatar} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt="Avatar" /> : <User size={18} />) : logoUrl ? <img src={logoUrl} style={{width: '100%', height: '100%', objectFit: 'contain', padding: '2px'}} alt="Hakuen" /> : <span style={{ fontWeight: 'bold', fontSize: '18px', fontFamily: 'Outfit' }}>H</span>}
        </div>
        <div className="message-content" style={{ width: '100%' }}>
          <div className="message-sender">{msg.role === 'user' ? 'You' : 'Hakuen 白炎'}</div>
          <div className="skeleton-message"></div>
        </div>
      </motion.div>
    );
  }

  let finalContent = msg.content || '';
  let reasoning = '';
  
  if (finalContent.includes('<think>') || finalContent.includes('</think>')) {
    const thinkStartIndex = finalContent.indexOf('<think>');
    const thinkEndIndex = finalContent.indexOf('</think>');
    
    if (thinkStartIndex !== -1 && thinkEndIndex !== -1 && thinkStartIndex < thinkEndIndex) {
      reasoning = finalContent.substring(thinkStartIndex + 7, thinkEndIndex).trim();
      finalContent = (finalContent.substring(0, thinkStartIndex) + finalContent.substring(thinkEndIndex + 8)).trim();
    } else if (thinkStartIndex !== -1 && thinkEndIndex === -1) {
      reasoning = finalContent.substring(thinkStartIndex + 7).trim();
      finalContent = finalContent.substring(0, thinkStartIndex).trim();
    } else if (thinkStartIndex === -1 && thinkEndIndex !== -1) {
      reasoning = finalContent.substring(0, thinkEndIndex).trim();
      finalContent = finalContent.substring(thinkEndIndex + 8).trim();
    } else {
      reasoning = finalContent.substring(thinkStartIndex + 7).trim();
      finalContent = finalContent.substring(0, thinkStartIndex).trim();
    }
  }

  return (
    <motion.div
      ref={ref}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`message-row ${msg.role}`}
    >
      <div className="avatar" style={msg.role === 'user' && avatar ? { padding: 0, overflow: 'hidden' } : {}}>
        {msg.role === 'user' ? (avatar ? <img src={avatar} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt="Avatar" /> : <User size={18} />) : logoUrl ? <img src={logoUrl} style={{width: '100%', height: '100%', objectFit: 'contain', padding: '2px'}} alt="Hakuen" /> : <span style={{ fontWeight: 'bold', fontSize: '18px', fontFamily: 'Outfit' }}>H</span>}
      </div>
      <div className="message-content">
        <div className="message-sender">
          {msg.role === 'user' ? 'You' : 'Hakuen 白炎'}
          {msg.timestamp && (
            <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--muted)', fontWeight: 'normal' }}>{msg.timestamp}</span>
          )}
          {reasoning && (
            <button 
              onClick={() => setShowReasoning(!showReasoning)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--muted)', cursor: 'pointer', marginLeft: '12px', padding: '2px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.borderColor = 'var(--muted)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <ChevronDown size={12} style={{ transform: showReasoning ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              {showReasoning ? 'Hide Reasoning' : 'Show Reasoning'}
            </button>
          )}
        </div>
        
        {reasoning && showReasoning && (
          <div style={{ padding: '12px', margin: '4px 0 12px', background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid var(--accent)', borderRadius: '0 8px 8px 0', fontSize: '13px', color: 'var(--muted)', whiteSpace: 'pre-wrap', lineHeight: '1.6', overflowX: 'auto' }}>
            {reasoning}
          </div>
        )}
        
        {msg.tool_calls?.map((tc: any, i: number) => (
          <div key={i} className="tool-badge">
            {msg.isStreaming ? <Loader2 className="spinner" size={14} /> : <CheckCircle size={14} style={{ color: '#50fa7b' }} />}
            {msg.isStreaming ? 'Executing:' : 'Executed:'} <strong>{tc.function.name}</strong>
          </div>
        ))}
        {finalContent && (
          <div className="message-text markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
              {preprocessLaTeX(activeView === 'research' 
                ? finalContent.replace(/```document\n[\s\S]*?(```|$)/g, '> *Document updated in the right panel.*') 
                : finalContent)}
            </ReactMarkdown>
          </div>
        )}
        
        {msg.role === 'assistant' && !msg.isStreaming && msg.tokens && msg.executionTime && (
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', fontFamily: 'monospace' }}>
            <span>{msg.tokens} tok</span>
            <span>·</span>
            <span>{msg.executionTime.toFixed(1)}s</span>
          </div>
        )}
      </div>
    </motion.div>
  );
});
const MOTIVATIONAL_QUOTES = [
  "\"The only way to do great work is to love what you do.\"\nSteve Jobs",
  "\"It always seems impossible until it's done.\"\nNelson Mandela",
  "\"Believe you can and you're halfway there.\"\nTheodore Roosevelt",
  "\"The secret of getting ahead is getting started.\"\nMark Twain",
  "\"Well done is better than well said.\"\nBenjamin Franklin",
  "\"Everything you've ever wanted is on the other side of fear.\"\nGeorge Addair",
  "\"Opportunity is missed by most people because it is dressed in overalls and looks like work.\"\nThomas Edison",
  "\"I find that the harder I work, the more luck I seem to have.\"\nThomas Jefferson",
  "\"The way to get started is to quit talking and begin doing.\"\nWalt Disney",
  "\"If you want to lift yourself up, lift up someone else.\"\nBooker T. Washington",
  "\"You miss 100% of the shots you don't take.\"\nWayne Gretzky",
  "\"Whether you think you can or you think you can't, you're right.\"\nHenry Ford",
  "\"I have not failed. I've just found 10,000 ways that won't work.\"\nThomas A. Edison",
  "\"A person who never made a mistake never tried anything new.\"\nAlbert Einstein",
];

function AppContent() {
  const [currentUser, setCurrentUser] = useState<any>(() => JSON.parse(localStorage.getItem('odysseus_currentUser') || 'null'));
  const [activeView, setActiveView] = useState<'chat' | 'research' | 'calendar' | 'notes' | 'kanban' | 'visualizer' | 'history' | 'library'>('chat');
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [libraryFiles, setLibraryFiles] = useState<any[]>([]);
  const [selectedLibraryFile, setSelectedLibraryFile] = useState<any>(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  const [chatSessions, setChatSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [kanbanTasks, setKanbanTasks] = useState<{ id: string; text: string; column: string }[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [imgZoom, setImgZoom] = useState(1);
  const [imgPan, setImgPan] = useState({ x: 0, y: 0 });
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState('#ffb703');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [birthdate, setBirthdate] = useState('');
  const [quote] = useState(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', themeColor);
    const hex = themeColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    }

    // Fetch for Favicon (With Background)
    fetch(`/favicon-bg-template.svg?v=${Date.now()}_3`)
      .then(res => res.text())
      .then(svg => {
        if (svg.startsWith('<!DOCTYPE html>')) return;
        const newSvg = svg.replace(/#THEME_COLOR#/g, themeColor);
        const base64 = btoa(unescape(encodeURIComponent(newSvg)));
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.type = 'image/svg+xml';
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = `data:image/svg+xml;base64,${base64}`;
      })
      .catch(console.error);

    // Fetch for App Logo (Transparent)
    fetch(`/favicon-template.svg?v=${Date.now()}`)
      .then(res => res.text())
      .then(svg => {
        if (svg.startsWith('<!DOCTYPE html>')) return;
        const newSvg = svg.replace(/#THEME_COLOR#/g, themeColor);
        const base64 = btoa(unescape(encodeURIComponent(newSvg)));
        setLogoUrl(`data:image/svg+xml;base64,${base64}`);
      })
      .catch(console.error);
  }, [themeColor]);

  const markdownComponents = useMemo(() => ({
    img: ({ src, alt }: any) => (
      <img 
        src={src} 
        alt={alt} 
        style={{ cursor: 'zoom-in' }}
        onClick={() => { setFullscreenImage(src); setImgZoom(1); setImgPan({ x: 0, y: 0 }); }} 
      />
    ),
    code: (props: any) => <CodeBlock setPreviewHtml={setPreviewHtml} {...props} />
  }), []);

  // Load Initial Data
  useEffect(() => {
    if (currentUser) {
      const loadAll = async () => {
        try {
          const sessions = await api.getSessions(currentUser.id);
          setChatSessions(Array.isArray(sessions) ? sessions : []);
          
          if (!sessionId) {
            setActiveSessionId(null);
            setMessages([]);
            setKanbanTasks([]);
            setAgendas([]);
            setCharts([]);
          }

          setCustomInstructions(await api.getData(currentUser.id, 'instructions', ''));
          
          const dbApiKey = await api.getData(currentUser.id, 'apiKey', null);
          if (dbApiKey !== null) setApiKey(dbApiKey);
          const dbBaseURL = await api.getData(currentUser.id, 'baseURL', null);
          if (dbBaseURL !== null) setBaseURL(dbBaseURL);
          const dbMaxTokens = await api.getData(currentUser.id, 'aiMaxTokens', null);
          if (dbMaxTokens !== null) setAiMaxTokens(dbMaxTokens);
          const dbTemp = await api.getData(currentUser.id, 'aiTemperature', null);
          if (dbTemp !== null) setAiTemperature(dbTemp);
          const dbModels = await api.getData(currentUser.id, 'aiModels', null);
          if (Array.isArray(dbModels)) setAiModels(dbModels);
          const dbActive = await api.getData(currentUser.id, 'activeModelId', null);
          if (dbActive !== null) setActiveModelId(dbActive);
          
          const dbAvatar = await api.getData(currentUser.id, 'avatar', null);
          if (dbAvatar) setAvatar(dbAvatar);
          const dbTheme = await api.getData(currentUser.id, 'themeColor', null);
          if (dbTheme) setThemeColor(dbTheme);
          const dbBirth = await api.getData(currentUser.id, 'birthdate', '');
          if (dbBirth) setBirthdate(dbBirth);
        } catch (e) {
          console.error("Failed to load user data", e);
        }
      };
      loadAll();
    }
  }, [currentUser]);
  


  // Listen to sessionId changes
  useEffect(() => {
    if (sessionId === recentlyCreatedSessionRef.current) {
      recentlyCreatedSessionRef.current = null;
    }
    
    if (sessionId && chatSessions.length > 0 && activeSessionId !== sessionId) {
      loadSession(sessionId);
    } else if (!sessionId && activeSessionId) {
      if (!recentlyCreatedSessionRef.current) {
        setActiveSessionId(null);
        setMessages([]);
        setKanbanTasks([]);
        setAgendas([]);
        setCharts([]);
        setDocumentContent('# Deep Research Document\n\nStart a research query to generate a comprehensive blog or document here.');
      }
    }
  }, [sessionId, chatSessions, activeSessionId]);

  const lastSaveRef = useRef<number>(0);
  const wasStreamingRef = useRef<boolean>(false);

  // Unified Save for all sessions
  useEffect(() => {
    if (currentUser && activeSessionId && activeView !== 'history') {
      const isStreaming = messages.length > 0 && messages[messages.length - 1].isStreaming;
      
      const doSave = () => {
        lastSaveRef.current = Date.now();
        setChatSessions(prev => {
          let newSessions = [...prev];
          const idx = newSessions.findIndex(s => s.id === activeSessionId);
          
          const hasMsgs = messages && messages.length > 0;
          const hasData = kanbanTasks.length > 0 || agendas.length > 0 || charts.length > 0;

          if (idx !== -1) {
            newSessions[idx].messages = messages;
            newSessions[idx].data = {
              kanban: kanbanTasks,
              agendas: agendas,
              charts: charts
            };
            newSessions[idx].updatedAt = new Date().toISOString();
            api.saveSession(currentUser.id, newSessions[idx]);
          } else if (hasMsgs || hasData) {
            const initialTitle = 'New ' + (activeView.charAt(0).toUpperCase() + activeView.slice(1));
            const newSession = {
              id: activeSessionId,
              title: initialTitle,
              type: activeView,
              messages: messages,
              data: {
                kanban: kanbanTasks,
                agendas: agendas,
                charts: charts
              },
              updatedAt: new Date().toISOString()
            };
            newSessions.unshift(newSession);
            api.saveSession(currentUser.id, newSession);
          }
          return newSessions;
        });
      };

      const now = Date.now();
      let timeoutId: any;

      if (!isStreaming && wasStreamingRef.current) {
        doSave();
      } else if (isStreaming && now - lastSaveRef.current > 2000) {
        doSave();
      } else {
        timeoutId = setTimeout(doSave, 500);
      }

      wasStreamingRef.current = isStreaming || false;

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [messages, kanbanTasks, agendas, charts, currentUser, activeView, activeSessionId]);


  const handleSidebarClick = (type: any) => {
    setActiveView(type);
    if (type !== 'chat' && type !== 'notes') {
      setIsDocPaneOpen(true);
    } else {
      setIsDocPaneOpen(false);
    }
    if (activeSessionId && currentUser) {
      setChatSessions(prev => {
        const idx = prev.findIndex(s => s.id === activeSessionId);
        if (idx !== -1) {
          const newSessions = [...prev];
          newSessions[idx].type = type;
          newSessions[idx].updatedAt = new Date().toISOString();
          api.saveSession(currentUser.id, newSessions[idx]);
          return newSessions;
        }
        return prev;
      });
    }
  };

  const handleNewSession = (type: any = 'chat') => {
    navigate('/');
    setActiveView(type);
    if (type === 'chat' || type === 'notes') {
      setIsDocPaneOpen(false);
    } else {
      setIsDocPaneOpen(true);
    }
    setMessages([]);
    setKanbanTasks([]);
    setAgendas([]);
    setCharts([]);
    setDocumentContent('# Deep Research Document\n\nStart a research query to generate a comprehensive blog or document here.');
    setActiveSessionId(null);
    setInput('');
    setSelectedFile(null);
    if (currentUser) {
      api.setData(currentUser.id, 'activeSessionId', null);
    }
  };

  const loadSession = (id: any) => {
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(id);
      const type = (session.type || 'chat') as 'chat' | 'research' | 'calendar' | 'notes' | 'kanban' | 'visualizer' | 'history';
      setActiveView(type);
      if (type !== 'chat') {
        setIsDocPaneOpen(true);
      } else {
        setIsDocPaneOpen(false);
      }

      const msgs = session.messages || [];
      setMessages(msgs);

      let extractedDoc = '# Deep Research Document\n\nStart a research query to generate a comprehensive blog or document here.';
      if (msgs.length > 0) {
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i];
          if (m.role === 'assistant' && m.content) {
            const docMatch = m.content.match(/```document\s*\n([\s\S]*?)(```|$)/);
            if (docMatch) {
              extractedDoc = docMatch[1];
              break;
            }
          }
        }
      }
      setDocumentContent(extractedDoc);
      
      const d = session.data || {};
      setKanbanTasks(Array.isArray(d.kanban) ? d.kanban : []);
      setAgendas(Array.isArray(d.agendas) ? d.agendas : []);
      setCharts(Array.isArray(d.charts) ? d.charts : []);
      
      if (currentUser) api.setData(currentUser.id, 'activeSessionId', id);
    }
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const deleteChatSession = async (id: any, e: any) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (!window.confirm('Delete this session?')) return;
    
    await api.deleteSession(currentUser.id, id);
    setChatSessions(prev => prev.filter(s => s.id !== id));
    
    if (activeSessionId === id) {
      handleNewSession('chat');
    }
  };

  const [input, setInput] = useState('');
  useEffect(() => {
    if (input === '') {
      const el = document.getElementById('chat-input-textarea');
      if (el) el.style.height = 'auto';
    }
  }, [input]);
  const [documentContent, setDocumentContent] = useState<string>('# Deep Research Document\n\nStart a research query to generate a comprehensive blog or document here.');
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [isDocPaneOpen, setIsDocPaneOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportToPdf = () => {
    const element = document.getElementById('research-document-content');
    if (element) {
      const originalCssText = element.style.cssText;
      element.classList.add('light-paper');
      element.style.background = '#ffffff';
      element.style.color = '#111111';
      element.style.padding = '20px';

      html2pdf().from(element).set({
        margin: 15,
        filename: 'Hakuen_Research.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save().then(() => {
        element.classList.remove('light-paper');
        element.style.cssText = originalCssText;
      });
    }
    setShowExportMenu(false);
  };

  const exportToDocx = () => {
    const element = document.getElementById('research-document-content');
    if (element) {
      const css = `
        <style>
          body { font-family: Arial, sans-serif; color: #000; line-height: 1.6; }
          h1, h2, h3, h4 { color: #111; margin-top: 24px; margin-bottom: 12px; }
          p { margin-bottom: 16px; }
          code { background: #f4f4f4; padding: 2px 4px; font-family: monospace; color: #d63384; }
          pre { background: #f4f4f4; padding: 12px; border-radius: 6px; border: 1px solid #ddd; }
          blockquote { border-left: 4px solid #ccc; padding-left: 12px; color: #555; margin-left: 0; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          a { color: #0d6efd; text-decoration: none; }
          ul, ol { padding-left: 24px; margin-bottom: 16px; }
        </style>
      `;
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title>" + css + "</head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + element.innerHTML + footer;
      
      const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = url;
      fileDownload.download = 'Hakuen_Research.doc';
      fileDownload.click();
      document.body.removeChild(fileDownload);
      URL.revokeObjectURL(url);
    }
    setShowExportMenu(false);
  };
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [apiKey, setApiKey] = useState(localStorage.getItem('groq_api_key') || '');
  const [baseURL, setBaseURL] = useState(localStorage.getItem('odysseus_baseURL') || '');
  const [aiMaxTokens, setAiMaxTokens] = useState(localStorage.getItem('hakuen_max_tokens') || '');
  const [aiTemperature, setAiTemperature] = useState(localStorage.getItem('hakuen_temperature') || '');
  const [aiModels, setAiModels] = useState<{id: string, name: string, model: string, baseURL?: string}[]>([{ id: 'default', name: 'Hakuen 20b', model: 'openai/gpt-oss-20b' }]);
  const [activeModelId, setActiveModelId] = useState('default');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [settingsTab, setSettingsTab] = useState('api');
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('groq_api_key'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 768);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recentlyCreatedSessionRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    isFirstLoadRef.current = true;
  }, [sessionId, activeView]);

  const [docPaneWidth, setDocPaneWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth <= 1024) return;
      const newWidth = 100 - (e.clientX / window.innerWidth) * 100;
      setDocPaneWidth(Math.min(Math.max(newWidth, 20), 80));
    };
    const handleMouseUp = () => setIsDragging(false);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('odysseus_currentUser');
  };

  const saveProfile = () => {
    if (currentUser) {
      api.setData(currentUser.id, 'instructions', customInstructions);
      api.setData(currentUser.id, 'birthdate', birthdate);
      api.setData(currentUser.id, 'themeColor', themeColor);
      if (avatar) api.setData(currentUser.id, 'avatar', avatar);
    }
    setShowProfile(false);
  };

  const cancelProfile = async () => {
    if (currentUser) {
      setCustomInstructions(await api.getData(currentUser.id, 'instructions', ''));
      setBirthdate(await api.getData(currentUser.id, 'birthdate', ''));
      const dbTheme = await api.getData(currentUser.id, 'themeColor', '#ffb703');
      setThemeColor(dbTheme);
      setAvatar(await api.getData(currentUser.id, 'avatar', null));
    }
    setShowProfile(false);
  };

  if (!currentUser) {
    return <AuthScreen onLogin={(user) => {
      setCurrentUser(user);
      localStorage.setItem('odysseus_currentUser', JSON.stringify(user));
      window.location.reload();
    }} />;
  }

  const startDragging = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const saveSettings = () => {
    localStorage.setItem('groq_api_key', apiKey);
    localStorage.setItem('odysseus_baseURL', baseURL);
    localStorage.setItem('hakuen_max_tokens', aiMaxTokens);
    localStorage.setItem('hakuen_temperature', aiTemperature);
    if (currentUser) {
      api.setData(currentUser.id, 'apiKey', apiKey);
      api.setData(currentUser.id, 'baseURL', baseURL);
      api.setData(currentUser.id, 'aiModels', aiModels);
      api.setData(currentUser.id, 'aiMaxTokens', aiMaxTokens);
      api.setData(currentUser.id, 'aiTemperature', aiTemperature);
    }
    setShowSettings(false);
  };

  const cancelSettings = async () => {
    if (currentUser) {
      setApiKey(await api.getData(currentUser.id, 'apiKey', ''));
      setBaseURL(await api.getData(currentUser.id, 'baseURL', ''));
      setAiMaxTokens(await api.getData(currentUser.id, 'aiMaxTokens', ''));
      setAiTemperature(await api.getData(currentUser.id, 'aiTemperature', ''));
      const dbModels = await api.getData(currentUser.id, 'aiModels', null);
      if (Array.isArray(dbModels)) setAiModels(dbModels);
    } else {
      setApiKey(localStorage.getItem('groq_api_key') || '');
      setBaseURL(localStorage.getItem('odysseus_baseURL') || '');
      setAiMaxTokens(localStorage.getItem('hakuen_max_tokens') || '');
      setAiTemperature(localStorage.getItem('hakuen_temperature') || '');
      setAiModels([{ id: 'default', name: 'Hakuen 20b', model: 'openai/gpt-oss-20b' }]);
    }
    setShowSettings(false);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useLayoutEffect(() => {
    if (isFirstLoadRef.current) {
      scrollToBottom('auto');
      isFirstLoadRef.current = false;
      setShowScrollButton(false);
    } else if (!showScrollButton) {
      scrollToBottom('smooth');
    }
  }, [messages, isLoading, showScrollButton, activeView, sessionId]);

  const ensureSessionExists = () => {
    if (!activeSessionId) {
      const currentSessionId = Date.now().toString();
      recentlyCreatedSessionRef.current = currentSessionId;
      setActiveSessionId(currentSessionId);
      
      const newSession = { 
        id: currentSessionId, 
        title: 'New Conversation', 
        messages: messages || [], 
        type: activeView, 
        data: {
          kanban: kanbanTasks,
          agendas: agendas,
          charts: charts
        }, 
        updatedAt: new Date().toISOString() 
      };
      if (currentUser) api.saveSession(currentUser.id, newSession);
      setChatSessions(prev => [newSession, ...prev]);
      navigate(`/c/${currentSessionId}`);
      return currentSessionId;
    }
    return activeSessionId;
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !selectedFile && !selectedLibraryFile) || !apiKey) {
      if (!apiKey) setShowSettings(true);
      return;
    }

    const savedInput = input;
    const savedFile = selectedFile;
    const savedLibraryFile = selectedLibraryFile;

    setInput('');
    setSelectedFile(null);
    setSelectedLibraryFile(null);
    setShowLibraryModal(false);
    setIsLoading(true);

    const userDisplayMsg = { 
      role: 'user' as const, 
      content: savedFile ? `[Attached file: ${savedFile.name}]\n${savedInput}` : savedLibraryFile ? `[Attached file: ${savedLibraryFile.filename}]\n${savedInput}` : savedInput, 
      internalContent: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const currentMessages = Array.isArray(messages) ? messages : [];
    const newMessages = [...currentMessages, userDisplayMsg];
    
    setMessages(newMessages);

    await new Promise(r => setTimeout(r, 50));

    let extractedFileText = '';
    let extractedBase64 = '';
    
    if (savedLibraryFile) {
      extractedFileText = savedLibraryFile.content || '';
      if (savedLibraryFile.type.startsWith('image/')) {
        try {
          const res = await fetch(`/api/library/file/${savedLibraryFile.id}`);
          const blob = await res.blob();
          const reader = new FileReader();
          extractedBase64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) { console.error(e); }
      }
    } else if (savedFile) {
       const extractionResult = await extractFileContent(savedFile);
       extractedFileText = extractionResult.text;
       extractedBase64 = extractionResult.base64 || '';
    }

    let userInput: any = (savedFile || savedLibraryFile) ? `${extractedFileText}\n\n${savedInput}` : savedInput;
    if (extractedBase64) {
      userInput = [
        { type: "text", text: savedInput ? `${extractedFileText}\n\n${savedInput}` : extractedFileText },
        { type: "image_url", image_url: { url: extractedBase64 } }
      ];
    }
    userDisplayMsg.internalContent = userInput;
    
    let currentSessionId = activeSessionId;
    const title = userDisplayMsg.content.substring(0, 30) + (userDisplayMsg.content.length > 30 ? '...' : '');

    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      recentlyCreatedSessionRef.current = currentSessionId;
      setActiveSessionId(currentSessionId);
      
      const newSession = { 
        id: currentSessionId, 
        title, 
        messages: newMessages, 
        type: activeView, 
        data: {
          kanban: kanbanTasks,
          agendas: agendas,
          charts: charts
        }, 
        updatedAt: new Date().toISOString() 
      };
      if (currentUser) api.saveSession(currentUser.id, newSession);
      setChatSessions(prev => [newSession, ...(Array.isArray(prev) ? prev : [])]);
      navigate(`/c/${currentSessionId}`);
    } else {
      setChatSessions(prev => {
        if (!Array.isArray(prev)) return prev;
        const exists = prev.find(s => s.id === currentSessionId);
        if (exists) {
           const updatedTitle = currentMessages.length === 0 ? title : exists.title;
           const updated = { ...exists, title: updatedTitle, messages: newMessages, updatedAt: new Date().toISOString() };
           if (currentUser) api.saveSession(currentUser.id, updated);
           return prev.map(s => s.id === currentSessionId ? updated : s);
        }
        return prev;
      });
    }

    if ((activeView === 'research' || activeView === 'calendar' || activeView === 'kanban' || activeView === 'visualizer') && !isDocPaneOpen) {
      setIsDocPaneOpen(true);
    }

    const systemPrompt = activeView === 'research' 
      ? `You are Hakuen 白炎, an expert Deep Research AI. Your goal is to write a comprehensive, well-formatted markdown document or blog based on the user's request. 
1. Use the 'search_web' tool to gather up-to-date facts.
2. ONLY use the 'search_images' tool if the user explicitly requests images.
3. Once you have gathered the info, you MUST write the final document using a special markdown block exactly like this:
\`\`\`document
# Title
Your markdown content here...
\`\`\`
Do not use any tool to write the document, just output the block.`
      : activeView === 'calendar'
      ? `You are Hakuen 白炎, a smart Agenda and Calendar AI assistant. You help the user manage their time, schedules, and answer questions about dates or agendas. The current time and date is ${new Date().toLocaleString()}. To save an agenda/schedule for the user, you MUST use the 'add_calendar_agenda' tool. Do not try to output a markdown block. Use the tool directly.`
      : activeView === 'notes'
      ? `You are Hakuen 白炎, a smart Notepad and To-Do AI assistant. You help the user manage their notes and tasks. To save a note or to-do list, you MUST use the 'save_note' tool. Be concise and helpful.`
      : `You are Hakuen 白炎, a highly intelligent and helpful AI assistant created by Haikal. You must always refer to yourself as "Hakuen" or "白炎". Never refer to yourself as ChatGPT, OpenAI, or any other entity. When using tools, you MUST provide perfectly valid JSON arguments.`;

    const finalSystemPrompt = customInstructions 
      ? `${systemPrompt}\n\nUser Custom Instructions:\n${customInstructions}` 
      : systemPrompt;

    const msgsToSend = [{ role: 'system', content: finalSystemPrompt }, ...newMessages.map(m => ({ role: m.role, content: m.internalContent || m.content }))];

    try {
      const currentModelObj = (Array.isArray(aiModels) ? aiModels : []).find(m => m.id === activeModelId) || { model: 'openai/gpt-oss-20b' };
      const modelBaseURL = (currentModelObj as any).baseURL || baseURL;

      const groq = new Groq({ 
        apiKey, 
        ...(modelBaseURL ? { baseURL: modelBaseURL } : {}),
        dangerouslyAllowBrowser: true,
        fetch: (url, init) => {
          let finalUrl = url.toString();
          if (modelBaseURL && finalUrl.includes('/openai/v1/chat/completions')) {
            finalUrl = finalUrl.replace('/openai/v1/chat/completions', '/chat/completions');
          }
          return fetch(finalUrl, init);
        }
      });

      const tools = [
        {
          type: 'function',
          function: {
            name: 'get_current_time',
            description: 'Get the current date and time.',
            parameters: { type: 'object', properties: {} }
          }
        },
        {
          type: 'function',
          function: {
            name: 'search_web',
            description: 'Search the web (DuckDuckGo/Wikipedia) for real-time information, facts, and recent events to avoid hallucination.',
            parameters: {
              type: 'object',
              properties: { query: { type: 'string', description: 'The search query' } },
              required: ['query']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'search_images',
            description: 'Search the web for image URLs (Wikimedia) to embed in the blog. ONLY use this if the user explicitly asks for images. You MUST output the returned URLs using Markdown image syntax: ![description](url).',
            parameters: {
              type: 'object',
              properties: { query: { type: 'string', description: 'Image search query' } },
              required: ['query']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'add_calendar_agenda',
            description: 'Add a new agenda or event to the user\'s calendar. Use this when the user asks to schedule something.',
            parameters: {
              type: 'object',
              properties: {
                date: { type: 'string', description: 'Date in YYYY-MM-DD format (e.g. 2026-06-02)' },
                time: { type: 'string', description: 'Time in HH:MM format (e.g. 05:00, 20:00)' },
                title: { type: 'string', description: 'Title or description of the agenda' }
              },
              required: ['date', 'time', 'title']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'add_kanban_tasks',
            description: 'Break down a project or goal into smaller tasks and add them to the Kanban board (To Do column).',
            parameters: {
              type: 'object',
              properties: {
                tasks: { type: 'array', items: { type: 'string' }, description: 'Array of task descriptions' }
              },
              required: ['tasks']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'render_chart',
            description: 'Render a beautiful chart (bar, line, or pie) based on tabular data. Use this when the user provides data and asks to visualize it.',
            parameters: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['bar', 'line', 'pie'], description: 'Type of chart' },
                title: { type: 'string', description: 'Title of the chart' },
                data: { 
                  type: 'array', 
                  items: { type: 'object' }, 
                  description: 'Array of data objects. Each object should have a "name" string field for the X-axis/label, and a "value" number field for the Y-axis/magnitude.'
                }
              },
              required: ['type', 'title', 'data']
            }
          }
        }
      ];

      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: '', 
        isStreaming: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      let startTime = Date.now();
      let totalTokens = 0;

      const sanitizeMsgs = (msgs: any[]) => msgs.map(m => {
        const { role, content, name } = m;
        const cleaned: any = { role, content: content || "" };
        if (name) cleaned.name = name;
        
        if (m.tool_calls && m.tool_calls.length > 0 && !content) {
          cleaned.content = `[Executed tools: ${m.tool_calls.map((t: any) => t.function.name).join(', ')}]`;
        }
        
        return cleaned;
      });

      let stream;
      try {
        stream = await groq.chat.completions.create({
          messages: sanitizeMsgs(msgsToSend),
          model: (aiModels.find(m => m.id === activeModelId)?.model || 'openai/gpt-oss-20b'),
          tools: tools as any,
          tool_choice: 'auto',
          max_tokens: aiMaxTokens ? parseInt(aiMaxTokens) : 4096,
          temperature: aiTemperature ? parseFloat(aiTemperature) : 0.7,
          stream: true
        });
      } catch (e: any) {
        if (e.message && e.message.toLowerCase().includes('does not support tools')) {
          stream = await groq.chat.completions.create({
            messages: sanitizeMsgs(msgsToSend),
            model: (aiModels.find(m => m.id === activeModelId)?.model || 'openai/gpt-oss-20b'),
            max_tokens: aiMaxTokens ? parseInt(aiMaxTokens) : 4096,
            temperature: aiTemperature ? parseFloat(aiTemperature) : 0.7,
            stream: true
          });
        } else {
          throw e;
        }
      }
      
      let responseContent = '';
      let toolCalls: any[] = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (chunk.usage?.total_tokens) totalTokens = chunk.usage.total_tokens;
        if ((chunk as any).x_groq?.usage?.total_tokens) totalTokens = (chunk as any).x_groq.usage.total_tokens;

        if (!delta) continue;

        if (delta.content) {
          responseContent += delta.content;
          setMessages((prev) => {
            const newM = [...prev];
            newM[newM.length - 1] = { ...newM[newM.length - 1], content: responseContent };
            return newM;
          });

          if (activeView === 'research') {
            const docMatch = responseContent.match(/```document\s*[\r\n]+([\s\S]*?)(```|$)/i);
            if (docMatch) {
              setDocumentContent(docMatch[1]);
            }
          }
        }

        if (delta.tool_calls) {
          let hasNewToolCall = false;
          for (const tc of delta.tool_calls) {
            if (!toolCalls[tc.index]) {
               toolCalls[tc.index] = {
                 id: tc.id,
                 type: 'function',
                 function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
               };
               hasNewToolCall = true;
            } else {
               if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
               if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
            }
          }
          if (hasNewToolCall) {
            setMessages((prev) => {
              const newM = [...prev];
              newM[newM.length - 1] = { ...newM[newM.length - 1], tool_calls: [...toolCalls] };
              return newM;
            });
          }
        }
      }
      
      setMessages((prev) => {
        const newM = [...prev];
        const last = { 
          ...newM[newM.length - 1], 
          isStreaming: false,
          executionTime: (Date.now() - startTime) / 1000,
          tokens: totalTokens || Math.ceil(responseContent.length / 4)
        };
        if (toolCalls.length > 0) last.tool_calls = toolCalls;
        newM[newM.length - 1] = last;
        return newM;
      });

      if (toolCalls.length > 0) {
        const cleanToolCalls = toolCalls.filter(Boolean);
        
        let toolSummary = '';
        for (const toolCall of cleanToolCalls) {
          const funcName = toolCall.function.name;
          let args: any = {};
          let argsStr = toolCall.function.arguments;
          try { 
            if (typeof argsStr === 'string') {
              argsStr = argsStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
              args = JSON.parse(argsStr || '{}');
            } else {
              args = argsStr || {};
            }
          } catch(e) {
            console.error("Failed to parse args:", argsStr);
          }
          let result = '';

          if (funcName === 'get_current_time') {
            result = new Date().toLocaleString();
          } else if (funcName === 'search_web') {
            try {
              const query = args.query;
              if (!query) throw new Error("Empty search query");
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);
              
              const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
              const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
              
              const res = await fetch(proxyUrl, { signal: controller.signal });
              clearTimeout(timeoutId);
              const html = await res.text();
              
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              const snippets = Array.from(doc.querySelectorAll('.result__snippet'))
                .map(el => el.textContent?.trim())
                .filter(Boolean)
                .slice(0, 4)
                .join('\n\n');
                
              if (snippets) {
                result = `Search results for "${query}":\n\n${snippets}`;
              } else {
                const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`);
                const wikiData = await wikiRes.json();
                if (wikiData.query && wikiData.query.search && wikiData.query.search.length > 0) {
                  const wikiSnippets = wikiData.query.search.slice(0, 3).map((item: any) => item.snippet.replace(/<[^>]*>?/gm, '')).join('\n\n');
                  result = `Search results for "${query}":\n\n${wikiSnippets}`;
                } else {
                  result = `No results found for "${query}".`;
                }
              }
            } catch (err: any) {
              result = `Search failed: ${err.name === 'AbortError' ? 'Koneksi lambat (Timeout)' : err.message}`;
            }
          } else if (funcName === 'search_images') {
             try {
                const query = args.query;
                const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=4&prop=imageinfo&iiprop=url&format=json&origin=*`);
                const data = await res.json();
                if (data.query && data.query.pages) {
                   const urls = Object.values(data.query.pages).map((p: any) => p.imageinfo?.[0]?.url).filter(Boolean);
                   result = urls.length > 0 ? `Images found:\n${urls.join('\n')}\n\nYou MUST format these images in your response using Markdown: ![Image Description](url)` : `No images found for "${query}". Try different keywords.`;
                } else {
                   result = `No images found for "${query}".`;
                }
             } catch (err: any) {
                result = `Search failed: ${err.message}`;
             }
          } else if (funcName === 'add_calendar_agenda') {
            const { date, time, title } = args;
            if (date && time && title) {
              setAgendas(prev => {
                if (!prev.some(a => a.dateStr === date && a.time === time && a.title === title)) {
                  const updated = [...prev, { dateStr: date, time, title }];
                  return updated;
                }
                return prev;
              });
              setSelectedDateStr(date);
              result = `Agenda added successfully for ${date} at ${time}. The calendar has been updated.`;
            } else {
              result = `Failed to add agenda. Missing date, time, or title.`;
            }
          } else if (funcName === 'add_kanban_tasks') {
            const tasksToAdd = args.tasks || [];
            if (tasksToAdd.length > 0) {
              const newTasks = tasksToAdd.map((text: string) => ({
                id: Math.random().toString(36).substr(2, 9),
                text,
                column: 'todo'
              }));
              setKanbanTasks(prev => {
                const updated = [...prev, ...newTasks];
                return updated;
              });
              result = `Successfully added ${tasksToAdd.length} tasks to the Kanban board (To Do column).`;
            } else {
              result = 'Failed to add tasks: tasks array is empty.';
            }
          } else if (funcName === 'render_chart') {
            const { type, title, data } = args;
            if (type && title && Array.isArray(data) && data.length > 0) {
              const chartConfig = { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), type, title, data };
              setCharts(prev => {
                const newCharts = [...prev, chartConfig];
                return newCharts;
              });
              result = `Chart "${title}" rendered successfully in the right panel.`;
            } else {
              result = `Failed to render chart. Invalid parameters.`;
            }
          }

          toolSummary += `\n[Tool '${funcName}' returned]:\n${result}\n`;
        }

        setMessages((prev) => [...prev, { 
          role: 'assistant', 
          content: '', 
          isStreaming: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        let stream2StartTime = Date.now();
        let stream2TotalTokens = 0;
        
        const finalMsgsToSend = [
          { role: 'system', content: systemPrompt }, 
          ...newMessages.map(m => ({ role: m.role, content: m.internalContent || m.content })),
          { role: 'assistant', content: responseContent || 'Let me process that information.' },
          { role: 'user', content: `System: The tools executed and returned the following information:\n${toolSummary}\nPlease proceed with the final answer or summary based on this information.` }
        ];

        const stream2 = await groq.chat.completions.create({
          messages: sanitizeMsgs(finalMsgsToSend),
          model: (aiModels.find(m => m.id === activeModelId)?.model || 'openai/gpt-oss-20b'),
          max_tokens: 4000,
          stream: true
        });
        
        let responseContent2 = '';
        for await (const chunk of stream2) {
          const delta = chunk.choices[0]?.delta;
          
          if (chunk.usage?.total_tokens) stream2TotalTokens = chunk.usage.total_tokens;
          if ((chunk as any).x_groq?.usage?.total_tokens) stream2TotalTokens = (chunk as any).x_groq.usage.total_tokens;
          if (delta?.content) {
            responseContent2 += delta.content;
            
            if (activeView === 'research') {
              const docMatch = responseContent2.match(/```document\s*[\r\n]+([\s\S]*?)(```|$)/i);
              if (docMatch) {
                setDocumentContent(docMatch[1]);
              }
            }

            setMessages((prev) => {
              const newM = [...prev];
              newM[newM.length - 1] = { 
                ...newM[newM.length - 1], 
                content: responseContent2 
              };
              return newM;
            });
          }
        }
        
        setMessages((prev) => {
          const newM = [...prev];
          newM[newM.length - 1] = {
            ...newM[newM.length - 1],
            content: responseContent2,
            isStreaming: false,
            executionTime: (Date.now() - stream2StartTime) / 1000,
            tokens: stream2TotalTokens || Math.ceil(responseContent2.length / 4)
          };
          return newM;
        });
      }
    } catch (error: any) {
      console.error("API Error:", error);
      
      let userFriendlyError = error?.message || (typeof error === 'string' ? error : 'Unknown Error');
      if (typeof userFriendlyError === 'string' && (userFriendlyError.includes('429') || userFriendlyError.toLowerCase().includes('rate limit'))) {
        userFriendlyError = "⚠️ **Limit Terlampaui:** Anda telah mencapai batas maksimal permintaan ke AI. Silakan tunggu sekitar 30 detik sebelum mencoba lagi.";
      } else {
        userFriendlyError = `**System Error:** ${userFriendlyError}`;
      }

      setMessages((prev) => {
        const m = [...prev];
        if (m.length > 0 && m[m.length - 1].isStreaming) {
           m[m.length - 1] = {
             ...m[m.length - 1],
             isStreaming: false,
             content: m[m.length - 1].content + `\n\n${userFriendlyError}`
           };
        } else {
           m.push({ role: 'assistant', content: userFriendlyError });
        }
        return m;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNoteContent = async (title: string, type: 'text' | 'todo', onUpdate?: (chunk: string) => void) => {
    if (!apiKey && !baseURL) return "API is not configured. Please set it in Settings.";

    const selectedModel = aiModels.find(m => m.id === activeModelId);
    const modelIdentifier = selectedModel ? selectedModel.model : 'openai/gpt-oss-20b';
    const modelBaseURL = (selectedModel as any)?.baseURL || baseURL;
    
    const groq = new Groq({
      apiKey: apiKey || 'dummy',
      ...(modelBaseURL ? { baseURL: modelBaseURL } : {}),
      dangerouslyAllowBrowser: true,
      fetch: (url, init) => {
        let fetchUrl = url.toString();
        if (modelBaseURL && fetchUrl.includes('/openai/v1/chat/completions')) {
          fetchUrl = fetchUrl.replace('/openai/v1/chat/completions', '/chat/completions');
        }
        return fetch(fetchUrl, init);
      }
    });

    const prompt = type === 'todo' 
      ? `Create a concise list of to-do items for the following task/topic: "${title}". Respond ONLY with the list items, separated by newlines, with no other text, markdown, bullet characters or numbering (just the pure text of the items).`
      : `Write detailed, informative, and well-formatted notes for the following topic: "${title}".`;

    try {
      const stream = await groq.chat.completions.create({
        model: modelIdentifier,
        messages: [
          { role: 'system', content: `You are a helpful AI assistant. Always provide exactly what the user asks for without unnecessary introductions or explanations.` },
          { role: 'user', content: prompt }
        ],
        max_tokens: aiMaxTokens ? parseInt(aiMaxTokens) : 4096,
        temperature: aiTemperature ? parseFloat(aiTemperature) : 0.7,
        stream: true
      });

      let fullContent = "";
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          fullContent += text;
          if (onUpdate) onUpdate(text);
        }
      }
      return fullContent;
    } catch (e: any) {
      console.error(e);
      const errMsg = "Error generating content: " + e.message;
      if (onUpdate) onUpdate("\n\n" + errMsg);
      return errMsg;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight > 100) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
    }
  };

  const renderMessageList = () => (
    <div className="chat-history" onScroll={handleScroll} style={activeView === 'research' || activeView === 'calendar' || activeView === 'kanban' || activeView === 'visualizer' ? { padding: '24px 16px' } : {}}>
      {messages.length === 0 ? (
        <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.5, marginTop: activeView === 'research' || activeView === 'calendar' || activeView === 'notes' || activeView === 'kanban' || activeView === 'visualizer' ? '10vh' : '20vh' }}>
          {activeView === 'research' ? <Search size={56} style={{ marginBottom: 16 }} /> : activeView === 'calendar' ? <Calendar size={56} style={{ marginBottom: 16 }} /> : activeView === 'notes' ? <FileText size={56} style={{ marginBottom: 16 }} /> : activeView === 'kanban' ? <Layout size={56} style={{ marginBottom: 16 }} /> : activeView === 'visualizer' ? <PieChartIcon size={56} style={{ marginBottom: 16 }} /> : logoUrl ? <img src={logoUrl} alt="Hakuen Logo" style={{ width: 80, height: 80, marginBottom: 16 }} /> : <div style={{ fontSize: 56, fontWeight: 700, marginBottom: 16, fontFamily: 'Outfit' }}>H</div>}
          <h2 style={activeView === 'chat' ? { fontSize: '22px', maxWidth: '800px', margin: '0 auto', lineHeight: 1.5, fontWeight: 500, whiteSpace: 'pre-wrap' } : {}}>{activeView === 'research' ? 'Deep Research Agent' : activeView === 'calendar' ? 'Calendar & Agenda' : activeView === 'notes' ? 'Notepads & To-Do' : activeView === 'kanban' ? 'Project Kanban Board' : activeView === 'visualizer' ? 'Data Visualizer' : (birthdate && new Date().getDate() === new Date(birthdate).getDate() && new Date().getMonth() === new Date(birthdate).getMonth() ? `Happy Birthday, ${currentUser.username}! 🎂🎉` : quote)}</h2>
          {activeView === 'research' && <p style={{fontSize: 14, maxWidth: 300, margin: '12px auto 0'}}>Ask me to write a blog or compile research. I will search the web, scrape images, and write the document.</p>}
          {activeView === 'calendar' && <p style={{fontSize: 14, maxWidth: 300, margin: '12px auto 0'}}>Manage your agenda, ask for the date, or schedule tasks with Hakuen.</p>}
          {activeView === 'notes' && <p style={{fontSize: 14, maxWidth: 300, margin: '12px auto 0'}}>Ask me to create a quick note or task list. I'll save them directly to your notebook for you.</p>}
          {activeView === 'kanban' && <p style={{fontSize: 14, maxWidth: 300, margin: '12px auto 0'}}>Ask me to plan a project. I'll break it down into tasks and put them on your Kanban board.</p>}
          {activeView === 'visualizer' && <p style={{fontSize: 14, maxWidth: 300, margin: '12px auto 0'}}>Give me a table of data or some numbers, and I'll generate a beautiful interactive chart.</p>}
        </div>
      ) : (
        messages.map((msg, idx) => {
          if (msg.role === 'system' || msg.role === 'tool') return null;
          const isLatest = idx >= messages.length - 10;
          return <LazyMessage key={idx} msg={msg} idx={idx} avatar={avatar} logoUrl={logoUrl} activeView={activeView} markdownComponents={markdownComponents} isLatest={isLatest} />;
        })
      )}
      
      {isLoading && !messages[messages.length - 1]?.isStreaming && (
        <div className="message-row assistant">
          <div className="avatar">
            {logoUrl ? <img src={logoUrl} style={{width: '100%', height: '100%', objectFit: 'contain', padding: '2px'}} alt="Hakuen" /> : <span style={{ fontWeight: 'bold', fontSize: '18px', fontFamily: 'Outfit' }}>H</span>}
          </div>
          <div className="message-content">
            <div className="message-sender">Hakuen 白炎</div>
            <div className="message-text" style={{ padding: '8px' }}>
              <Loader2 className="spinner" size={18} />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const renderInputForm = () => (
    <div className="chat-input-wrapper" style={activeView === 'research' || activeView === 'calendar' ? { padding: '16px', background: 'var(--bg)' } : {}}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '800px', alignItems: 'center', position: 'relative' }}>
        <button 
          className={`scroll-to-bottom ${showScrollButton ? 'visible' : ''}`}
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          title="Scroll to bottom"
        >
          <ChevronDown size={24} />
        </button>
        {(selectedFile || selectedLibraryFile) && (
          <div style={{ width: '100%', marginBottom: '12px', padding: '8px 16px', background: 'rgba(var(--accent-rgb), 0.1)', borderRadius: '12px', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--accent)' }}>
              <FileText size={16} />
              <span style={{ fontWeight: 500 }}>{selectedFile?.name || selectedLibraryFile?.filename}</span>
            </div>
            <button type="button" onClick={() => { setSelectedFile(null); setSelectedLibraryFile(null); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              &times;
            </button>
          </div>
        )}
        <form className="chat-input-container" onSubmit={(e) => { handleSend(e); }} style={{ width: '100%', overflow: 'visible' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => { if (e.target.files && e.target.files[0]) { setSelectedFile(e.target.files[0]); setSelectedLibraryFile(null); } }}
          />
          
          <textarea
            id="chat-input-textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as any);
              }
            }}
            placeholder={activeView === 'research' ? "Enter research topic..." : activeView === 'calendar' ? "Manage your agenda or ask about schedules..." : activeView === 'kanban' ? "Ask me to plan a project..." : "Ask me anything or let's browse the web..."}
            disabled={isLoading || !apiKey}
            rows={1}
            style={{ maxHeight: '200px' }}
          />

          <div className="chat-input-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="icon-btn attachment-btn" title="Attach Document or Image" onClick={() => fileInputRef.current?.click()}>
                <Paperclip size={18} />
              </button>
              
              <div style={{ position: 'relative' }}>
                <button type="button" className="icon-btn attachment-btn" title="Attach from Library" onClick={() => setShowLibraryModal(!showLibraryModal)}>
                  <Folder size={18} />
                </button>
                {showLibraryModal && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', width: '300px', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100 }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Select from Library</h4>
                    {libraryFiles.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Library is empty</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {libraryFiles.map(f => (
                          <div key={f.id} onClick={() => { setSelectedLibraryFile(f); setSelectedFile(null); setShowLibraryModal(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                            <FileText size={14} color="var(--accent)" />
                            <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.filename}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="send-button" disabled={(!input.trim() && !selectedFile && !selectedLibraryFile) || isLoading || !apiKey}>
              {isLoading ? <Loader2 className="spinner" size={16} /> : <Send size={16} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  
  const HistoryView = () => {
    return (
      <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 24px', fontFamily: 'Outfit', fontWeight: 600 }}>Your History</h2>
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', alignContent: 'start', paddingBottom: '24px' }}>
          {!Array.isArray(chatSessions) || chatSessions.length === 0 ? (
            <div style={{ color: 'var(--muted)', gridColumn: '1 / -1', textAlign: 'center', marginTop: '10vh' }}>No history found.</div>
          ) : (
            chatSessions.map(session => (
              <div 
                key={session?.id || Math.random()} 
                onClick={() => session?.id && navigate('/c/' + session.id)}
                style={{ background: 'var(--panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s', position: 'relative' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontWeight: 600, fontSize: '15px', paddingRight: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.title || 'Untitled Session'}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{(() => {
                    try {
                      const d = new Date(session?.updatedAt || Date.now());
                      return isNaN(d.getTime()) ? 'Unknown Date' : d.toLocaleDateString();
                    } catch { return 'Unknown Date'; }
                  })()}</span>
                  <span>{session?.messages?.length || 0} msgs</span>
                </div>
                <button 
                  onClick={(e) => session?.id && deleteChatSession(session.id, e)}
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


  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="sidebar-header" style={{ borderBottom: 'none' }}>
            <h2 
              style={{ margin: 0, cursor: 'pointer', transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }} 
              onClick={() => navigate('/')}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Hakuen
            </h2>
            <button className="icon-btn hide-desktop" onClick={() => setIsSidebarOpen(false)}>
              <PanelLeftClose size={20} />
            </button>
          </div>
          
          <div style={{ padding: '0 16px 16px' }}>
            <button onClick={() => handleNewSession('chat')} style={{ width: '100%', padding: '12px', background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}>
              <Plus size={16} /> New Session
            </button>
          </div>
          
          <ul className="menu-list" style={{ flexShrink: 0 }}>
          <li className={`menu-item ${activeView === 'chat' ? 'active' : ''}`} onClick={() => { handleSidebarClick('chat'); if(window.innerWidth <= 768) setIsSidebarOpen(false); }}>
            <MessageSquare size={18} /> Chat
          </li>
          <li className={`menu-item ${activeView === 'research' ? 'active' : ''}`} onClick={() => { 
            handleSidebarClick('research'); if(window.innerWidth <= 768) setIsSidebarOpen(false); 
          }}>
            <Search size={18} /> Deep Research
          </li>
          <li className={`menu-item ${activeView === 'calendar' ? 'active' : ''}`} onClick={() => { 
            handleSidebarClick('calendar'); if(window.innerWidth <= 768) setIsSidebarOpen(false); 
          }}>
            <Calendar size={18} /> Calendar & Clock
          </li>
          <li className={`menu-item ${activeView === 'notes' ? 'active' : ''}`} onClick={() => { 
            handleSidebarClick('notes'); if(window.innerWidth <= 768) setIsSidebarOpen(false); 
          }}>
            <FileText size={18} /> Notepads & To-Do
          </li>
          <li className={`menu-item ${activeView === 'kanban' ? 'active' : ''}`} onClick={() => { 
            handleSidebarClick('kanban'); if(window.innerWidth <= 768) setIsSidebarOpen(false); 
          }}>
            <Layout size={18} /> Kanban Board
          </li>
          <li className={`menu-item ${activeView === 'visualizer' ? 'active' : ''}`} onClick={() => { 
            handleSidebarClick('visualizer'); if(window.innerWidth <= 768) setIsSidebarOpen(false); 
          }}>
            <PieChartIcon size={18} /> Data Visualizer
          </li>
          <li className={`menu-item ${activeView === 'library' ? 'active' : ''}`} onClick={() => { 
            handleSidebarClick('library'); if(window.innerWidth <= 768) setIsSidebarOpen(false); 
          }}>
            <Folder size={18} /> Library
          </li>
          <li className={`menu-item ${activeView === 'history' ? 'active' : ''}`} onClick={() => { 
            setActiveView('history'); if(window.innerWidth <= 768) setIsSidebarOpen(false); 
          }} style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <Clock size={18} /> History
          </li>
        </ul>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button 
            className="menu-item" 
            style={{width: '100%', background: 'transparent', border: 'none', textAlign: 'left'}} 
            onClick={() => { setShowSettings(true); setIsSidebarOpen(false); }}
          >
            <Settings size={18} /> Settings
          </button>
          <button 
            className="menu-item" 
            style={{width: '100%', background: 'transparent', border: 'none', textAlign: 'left', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px'}} 
            onClick={() => { setShowProfile(true); setIsSidebarOpen(false); }}
          >
            {avatar ? (
              <img src={avatar} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
            ) : (
              <User size={18} />
            )}
            Profile ({currentUser.username})
          </button>
        </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Unified Header */}
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {(!isSidebarOpen || window.innerWidth <= 768) && (
              <button className="icon-btn" onClick={() => setIsSidebarOpen(true)} style={{ marginRight: '16px' }}>
                <PanelLeft size={24} />
              </button>
            )}
            <div className="header-title" style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowModelDropdown(!showModelDropdown)}>
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
</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isDocPaneOpen && (activeView === 'calendar' || activeView === 'research' || activeView === 'kanban' || activeView === 'visualizer') ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeView === 'calendar' ? <Calendar size={18} color="var(--accent)" /> : activeView === 'kanban' ? <Layout size={18} color="var(--accent)" /> : activeView === 'visualizer' ? <PieChartIcon size={18} color="var(--accent)" /> : <Search size={18} color="var(--accent)" />}
                  <span className="hide-mobile" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--heading)' }}>
                    {activeView === 'calendar' ? 'Calendar & Clock' : activeView === 'kanban' ? 'Kanban Board' : activeView === 'visualizer' ? 'Data Visualizer' : 'Research Document'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeView === 'research' && (
                    <div style={{ position: 'relative' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowExportMenu(!showExportMenu)}>
                        <Download size={14}/> <span className="hide-mobile">Export</span>
                      </button>
                      {showExportMenu && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', zIndex: 100, minWidth: '150px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                          <div onClick={exportToPdf} style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>PDF Document (.pdf)</div>
                          <div onClick={exportToDocx} style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>Word Document (.doc)</div>
                        </div>
                      )}
                    </div>
                  )}
                  {activeView === 'research' && (
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setIsEditingDoc(!isEditingDoc)}>
                      {isEditingDoc ? <><Eye size={14}/> <span className="hide-mobile">Preview</span></> : <><Edit2 size={14}/> <span className="hide-mobile">Edit</span></>}
                    </button>
                  )}
                  <button className="icon-btn" onClick={() => setIsDocPaneOpen(false)} title="Close Side Panel">
                    <PanelRightClose size={20} />
                  </button>
                </div>
              </div>
            ) : (activeView === 'calendar' || activeView === 'research' || activeView === 'kanban' || activeView === 'visualizer') && !isDocPaneOpen ? (
              <button className="icon-btn" onClick={() => setIsDocPaneOpen(true)} title="Open Side Panel">
                <PanelRight size={24} />
              </button>
            ) : (
              <div style={{ width: 40 }} />
            )}
          </div>
        </header>

        {activeView === 'history' ? (
          <HistoryView />
        ) : activeView === 'library' ? (
          <LibraryWidget libraryFiles={libraryFiles} setLibraryFiles={setLibraryFiles} currentUser={currentUser} onPreviewImage={setFullscreenImage} />
        ) : activeView === 'notes' ? (
          <NotesWidget currentUser={currentUser} onGenerateAI={handleGenerateNoteContent} />
        ) : (
          <div className="research-view">
            <div 
              className={`research-chat ${!isDocPaneOpen || activeView === 'chat' ? 'expanded' : ''}`}
              style={isDocPaneOpen && window.innerWidth > 1024 && activeView !== 'chat' ? { width: `${100 - docPaneWidth}%`, transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' } : {}}
            >
              {renderMessageList()}
              {renderInputForm()}
            </div>
            
            {isDocPaneOpen && window.innerWidth > 1024 && activeView !== 'chat' && (
              <div 
                className="resizer"
                onMouseDown={startDragging}
                style={{
                  width: '6px', 
                  cursor: 'col-resize', 
                  background: isDragging ? 'var(--accent)' : 'transparent',
                  zIndex: 10,
                  marginLeft: '-3px',
                  marginRight: '-3px',
                  transition: 'background 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '2px', right: '2px', background: isDragging ? 'var(--accent)' : 'transparent' }} />
              </div>
            )}

            <div 
              className={`research-document ${(!isDocPaneOpen || activeView === 'chat') ? 'collapsed' : ''}`}
              style={(isDocPaneOpen && window.innerWidth > 1024 && activeView !== 'chat') ? { width: `${docPaneWidth}%`, transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' } : {}}
            >
                 <div className="doc-content" style={activeView === 'calendar' || activeView === 'kanban' || activeView === 'visualizer' ? { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } : {}}>
                   {activeView === 'calendar' ? (
                      <CalendarWidget 
                        agendas={agendas} 
                        setAgendas={(newAgendas) => {
                          ensureSessionExists();
                          setAgendas(newAgendas);
                        }}
                        selectedDateStr={selectedDateStr} 
                        setSelectedDateStr={setSelectedDateStr} 
                      />
                    ) : activeView === 'kanban' ? (
                      <KanbanWidget tasks={kanbanTasks} setTasks={(newTasks) => {
                        ensureSessionExists();
                        setKanbanTasks(newTasks);
                      }} />
                    ) : activeView === 'visualizer' ? (
                      <ChartWidget charts={charts} setCharts={(newC) => { 
                        ensureSessionExists();
                        setCharts(newC); 
                      }} />
                    ) : isEditingDoc ? (
                     <textarea 
                       className="doc-textarea" 
                       value={documentContent}
                       onChange={(e) => setDocumentContent(e.target.value)}
                     />
                   ) : (
                     <div className="markdown-body" id="research-document-content">
                       <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{preprocessLaTeX(documentContent)}</ReactMarkdown>
                     </div>
                   )}
                 </div>
               </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="settings-overlay">
            <div className="settings-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>Workspace Settings</h2>
              </div>
              
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
                <div onClick={() => setSettingsTab('api')} style={{ paddingBottom: '8px', cursor: 'pointer', borderBottom: settingsTab === 'api' ? '2px solid var(--accent)' : '2px solid transparent', color: settingsTab === 'api' ? 'var(--accent)' : 'var(--fg)', fontWeight: 600, fontSize: '14px' }}>API Settings</div>
                <div onClick={() => setSettingsTab('ai')} style={{ paddingBottom: '8px', cursor: 'pointer', borderBottom: settingsTab === 'ai' ? '2px solid var(--accent)' : '2px solid transparent', color: settingsTab === 'ai' ? 'var(--accent)' : 'var(--fg)', fontWeight: 600, fontSize: '14px' }}>AI Config</div>
                <div onClick={() => setSettingsTab('models')} style={{ paddingBottom: '8px', cursor: 'pointer', borderBottom: settingsTab === 'models' ? '2px solid var(--accent)' : '2px solid transparent', color: settingsTab === 'models' ? 'var(--accent)' : 'var(--fg)', fontWeight: 600, fontSize: '14px' }}>AI Models</div>
              </div>

              {settingsTab === 'api' ? (
                <>
                  <div className="setting-group">
                    <label>API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                  </div>

                  <div className="setting-group">
                    <label>Base URL (Optional)</label>
                    <input
                      type="text"
                      value={baseURL}
                      onChange={(e) => setBaseURL(e.target.value)}
                      placeholder="https://openrouter.ai/api/v1"
                    />
                  </div>

                  <div className="setting-group" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                    <label style={{ color: 'var(--danger)' }}>Data Management</label>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px', marginTop: '4px' }}>Delete all your saved chat sessions. This action cannot be undone.</p>
                    <button 
                      className="btn btn-secondary" 
                      style={{ color: 'var(--danger)', borderColor: 'rgba(255,107,107,0.3)', width: '100%', justifyContent: 'center' }}
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete ALL chat sessions?')) {
                          setChatSessions([]);
                          setActiveSessionId(null);
                          setMessages([]);
                          if (currentUser) {
                            await api.deleteSessions(currentUser.id);
                            await api.setData(currentUser.id, 'activeSessionId', null);
                            await api.setData(currentUser.id, 'chat', []);
                          }
                          setShowSettings(false);
                        }
                      }}
                    >
                      <Trash2 size={16} style={{ marginRight: '8px' }} /> Clear All Chat History
                    </button>
                  </div>

                </>
              ) : settingsTab === 'ai' ? (
                <>
                  <div className="setting-group">
                    <label>Max Tokens</label>
                    <input
                      type="number"
                      value={aiMaxTokens}
                      onChange={(e) => setAiMaxTokens(e.target.value)}
                      placeholder="Default: 4096"
                    />
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Leave empty to use the standard default.</p>
                  </div>

                  <div className="setting-group">
                    <label>Temperature</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                      <input
                        type="range"
                        step="0.1"
                        min="0"
                        max="2"
                        value={aiTemperature || '0.7'}
                        onChange={(e) => setAiTemperature(e.target.value)}
                        style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={aiTemperature || '0.7'}
                        onChange={(e) => setAiTemperature(e.target.value)}
                        style={{ width: '70px', padding: '8px', textAlign: 'center', margin: 0 }}
                      />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>Range 0.0 - 2.0. Higher values make output more creative and random.</p>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '50vh', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
                  {aiModels.map(m => (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Display Name</label>
                          <input type="text" value={m.name} onChange={(e) => setAiModels(prev => prev.map(p => p.id === m.id ? {...p, name: e.target.value} : p))} placeholder="e.g. Hakuen 20b" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '13px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Model ID</label>
                          <input type="text" value={m.model} onChange={(e) => setAiModels(prev => prev.map(p => p.id === m.id ? {...p, model: e.target.value} : p))} placeholder="e.g. gpt-4" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '13px' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Base URL (Optional)</label>
                          <input type="text" value={m.baseURL || ''} onChange={(e) => setAiModels(prev => prev.map(p => p.id === m.id ? {...p, baseURL: e.target.value} : p))} placeholder="e.g. http://127.0.0.1:11434/v1" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '13px' }} />
                        </div>
                        <button className="btn btn-secondary" style={{ color: 'var(--danger)', padding: '10px', borderColor: 'rgba(255,107,107,0.3)', background: 'rgba(255,107,107,0.05)', height: '40px' }} onClick={() => {
                          setAiModels(prev => prev.filter(p => p.id !== m.id));
                          if (activeModelId === m.id) setActiveModelId(aiModels.find(p => p.id !== m.id)?.id || 'default');
                        }} disabled={aiModels.length === 1} title="Remove Model">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '4px' }} onClick={() => setAiModels(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: 'New Model', model: '', baseURL: '' }])}>
                    <Plus size={16} style={{ marginRight: '8px' }} /> Add Model
                  </button>
                </div>
              )}

              <div className="settings-footer">
                <button className="btn btn-secondary" onClick={cancelSettings}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={saveSettings}>
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {showProfile && (
          <div className="settings-overlay">
            <div className="settings-modal" style={{ maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ margin: 0 }}>My Profile</h2>
                <div style={{ background: 'var(--accent)', color: '#000', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>{currentUser.username}</div>
              </div>

              {/* Avatar & Theme */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 600 }}>Avatar</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: 24 }}>
                      {avatar ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" /> : currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)' }}>
                        <Upload size={14} style={{ marginRight: 6 }}/> Change
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const base64 = ev.target?.result as string;
                              setAvatar(base64);
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <label style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 600 }}>Theme Accent</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {['#ffb703', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                      <div 
                        key={color}
                        onClick={() => setThemeColor(color)}
                        style={{
                          width: 32, height: 32, borderRadius: '50%', background: color, cursor: 'pointer',
                          border: themeColor === color ? '3px solid #fff' : '3px solid transparent',
                          boxShadow: themeColor === color ? `0 0 12px ${color}` : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="setting-group" style={{ marginBottom: '24px' }}>
                <label style={{ color: 'var(--accent)', marginBottom: '12px', display: 'block', fontSize: '14px', fontWeight: 600 }}>Personal Details</label>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>Username</label>
                    <input type="text" value={currentUser.username} disabled style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', color: 'var(--muted)', cursor: 'not-allowed' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>Email</label>
                    <input type="text" value={currentUser.email} disabled style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', color: 'var(--muted)', cursor: 'not-allowed' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>Date of Birth (Optional)</label>
                  <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'Inter' }} />
                </div>
              </div>
              
              <div className="setting-group">
                <label style={{ color: 'var(--accent)' }}>AI Personalization (Custom Instructions)</label>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>Tell Hakuen how you want it to behave or respond.</p>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Always respond in Indonesian, use friendly tone, keep answers short..."
                  style={{ width: '100%', height: '120px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', padding: '12px', borderRadius: '12px', resize: 'vertical', fontFamily: 'Inter', fontSize: '14px' }}
                />
              </div>

              <div className="setting-group" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <label style={{ color: 'var(--danger)' }}>Danger Zone</label>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Permanently delete your account and all associated data.</p>
                <button 
                  className="btn btn-secondary" 
                  style={{ color: 'var(--danger)', borderColor: 'rgba(255,107,107,0.3)', width: '100%', justifyContent: 'center' }}
                  onClick={async () => {
                    if (window.confirm('Are you absolutely sure? This will delete your account, all chats, notes, and tasks FOREVER. This cannot be undone.')) {
                      if (currentUser) {
                        await api.deleteUser(currentUser.id);
                      }
                      
                      // Logout
                      handleLogout();
                      setShowProfile(false);
                    }
                  }}
                >
                  <Trash2 size={16} style={{ marginRight: '8px' }} /> Delete Account
                </button>
              </div>

              <div className="settings-footer" style={{ borderTop: '1px solid var(--border)', marginTop: '24px', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={() => { handleLogout(); setShowProfile(false); }} style={{ color: 'var(--danger)', borderColor: 'transparent' }}>
                  Log Out
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={cancelProfile}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={saveProfile}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', zIndex: 10000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
            overflow: 'hidden'
          }}
          onClick={() => setFullscreenImage(null)}
          onWheel={(e) => {
             if (e.deltaY < 0) setImgZoom(prev => Math.min(prev + 0.2, 5));
             else {
               setImgZoom(prev => {
                 const newZoom = Math.max(prev - 0.2, 0.5);
                 if (newZoom <= 1) setImgPan({ x: 0, y: 0 });
                 return newZoom;
               });
             }
          }}
          onMouseMove={(e) => {
            if (isDraggingImg) {
              setImgPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            }
          }}
          onMouseUp={() => setIsDraggingImg(false)}
          onMouseLeave={() => setIsDraggingImg(false)}
        >
          <img 
            src={fullscreenImage} 
            alt="Expanded view" 
            style={{ 
              maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', 
              borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              transform: `translate(${imgPan.x}px, ${imgPan.y}px) scale(${imgZoom})`, 
              transition: isDraggingImg ? 'none' : 'transform 0.1s ease-out',
              cursor: isDraggingImg ? 'grabbing' : (imgZoom > 1 ? 'grab' : 'default'),
              userSelect: 'none'
            }} 
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault(); // prevent browser native drag
              if (imgZoom > 1) {
                setIsDraggingImg(true);
                setDragStart({ x: e.clientX - imgPan.x, y: e.clientY - imgPan.y });
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (imgZoom <= 1) setFullscreenImage(null);
            }}
          />
          <div style={{ position: 'absolute', top: 20, right: 20, color: '#fff', fontSize: 24, cursor: 'pointer', background: 'rgba(0,0,0,0.5)', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }} onClick={() => setFullscreenImage(null)}>
            &times;
          </div>
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '20px', color: '#fff', fontSize: '13px', pointerEvents: 'none' }}>
            Scroll to zoom ({Math.round(imgZoom * 100)}%) • Drag to pan
          </div>
        </div>
      )}
      
      {/* HTML Preview Modal */}
      {previewHtml !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 10001, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, color: 'var(--heading)' }}>HTML Preview</h3>
            <button onClick={() => setPreviewHtml(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '24px', lineHeight: 1 }}>
              &times;
            </button>
          </div>
          <iframe 
            srcDoc={previewHtml} 
            style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }} 
            sandbox="allow-scripts allow-popups"
          />
        </div>
      )}

    </div>
    </div>
  );
}


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
      <Route path="/c/:sessionId" element={<AppContent />} />
    </Routes>
  );
}
