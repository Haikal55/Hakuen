import { useState, useRef, useEffect } from 'react';
import { Languages, ArrowRightLeft, Copy, Check, Loader2, AlertCircle, ChevronDown, Play, Sparkles, Briefcase, MessageCircle, GraduationCap } from 'lucide-react';
import Groq from 'groq-sdk';

interface TranslatorProps {
  apiKey: string;
  baseURL: string;
  aiModels: any[];
  activeModelId: string;
}

const LANGUAGES = [
  'Auto-detect',
  'English',
  'Indonesian',
  'Japanese',
  'Korean',
  'Chinese (Simplified)',
  'Spanish',
  'French',
  'German',
  'Russian',
  'Arabic'
];

const SUGGESTIONS = [
  { id: 'fluent', label: 'More Natural', prompt: 'Make the translation sound very fluent, natural, and easy to read.', icon: Sparkles },
  { id: 'formal', label: 'Business Formal', prompt: 'Make the translation highly formal, suitable for a professional business context.', icon: Briefcase },
  { id: 'casual', label: 'Casual Style', prompt: 'Translate this into casual, everyday language. Use natural idioms where appropriate.', icon: MessageCircle },
  { id: 'academic', label: 'Academic', prompt: 'Translate this using sophisticated, academic vocabulary suitable for a research paper.', icon: GraduationCap }
];

function LanguageSelector({ value, displayValue, onChange, options }: { value: string, displayValue?: string, onChange: (val: string) => void, options: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="translator-lang-wrapper"
      style={{ position: 'relative' }} 
      tabIndex={0} 
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOpen(false);
      }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', 
          background: 'transparent', border: '1px solid var(--border)', 
          padding: '12px 16px', borderRadius: '16px', cursor: 'pointer',
          color: 'var(--heading)', fontSize: '15px', fontWeight: 500,
          userSelect: 'none', minWidth: '200px'
        }}
      >
        {displayValue || value} <ChevronDown size={16} color="var(--muted)" />
      </div>
      
      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, marginTop: '8px', 
          background: 'var(--panel)', border: '1px solid var(--border)', 
          borderRadius: '16px', padding: '8px', zIndex: 10,
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)', width: '100%',
          maxHeight: '300px', overflowY: 'auto'
        }}>
          {options.map(lang => (
            <div 
              key={lang}
              onClick={() => { onChange(lang); setIsOpen(false); }}
              style={{ 
                padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                color: value === lang ? 'var(--accent)' : 'var(--fg)',
                background: value === lang ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                fontSize: '14px', fontWeight: value === lang ? 600 : 500
              }}
              onMouseEnter={e => { if (value !== lang) e.currentTarget.style.background = 'var(--bg)'; }}
              onMouseLeave={e => { if (value !== lang) e.currentTarget.style.background = 'transparent'; }}
            >
              {lang}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TranslatorWidget({ apiKey, baseURL, aiModels, activeModelId }: TranslatorProps) {
  const [sourceLang, setSourceLang] = useState('Auto-detect');
  const [targetLang, setTargetLang] = useState('Indonesian');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang, setDetectedLang] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const currentSource = sourceLang === 'Auto-detect' ? detectedLang : sourceLang;
    if (currentSource) {
      const srcLower = currentSource.toLowerCase();
      const tgtLower = targetLang.toLowerCase();
      if (srcLower === tgtLower || (srcLower === 'indonesia' && tgtLower === 'indonesian') || (srcLower === 'indonesian' && tgtLower === 'indonesia')) {
        setTargetLang(tgtLower === 'english' ? 'Indonesian' : 'English');
      }
    }
  }, [sourceLang, detectedLang, targetLang]);

  const handleSwap = () => {
    if (sourceLang !== 'Auto-detect') {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    } else {
      setSourceLang(targetLang);
      setTargetLang('English');
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTranslate = async (styleInstruction: string = '') => {
    if (!sourceText.trim()) return;
    if (!apiKey && !baseURL) {
      setError('API key or Base URL is missing. Configure it in Settings.');
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsTranslating(true);
    setTranslatedText('');
    setError('');

    try {
      const selectedModel = aiModels.find(m => m.id === activeModelId);
      const modelIdentifier = selectedModel ? selectedModel.model : 'openai/gpt-oss-20b';
      const modelBaseURL = selectedModel?.baseURL || baseURL;

      const groq = new Groq({
        apiKey: apiKey || 'dummy-key',
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

      let actualTargetLang = targetLang;

      if (sourceLang === 'Auto-detect') {
        try {
          const res = await groq.chat.completions.create({
            messages: [{ role: 'user', content: `Identify the language of this text. Reply with ONLY the language name in English, preferably exactly matching one of these: English, Indonesian, Japanese, Korean, Chinese (Simplified), Spanish, French, German, Russian, Arabic. Do not explain or add punctuation.\n\nText: ${sourceText.substring(0, 200)}`}],
            model: modelIdentifier,
            temperature: 0.1,
          });
          const lang = res.choices[0]?.message?.content?.trim();
          if (lang) {
            setDetectedLang(lang);
            const srcLower = lang.toLowerCase();
            const tgtLower = targetLang.toLowerCase();
            if (srcLower === tgtLower || (srcLower === 'indonesia' && tgtLower === 'indonesian') || (srcLower === 'indonesian' && tgtLower === 'indonesia')) {
              actualTargetLang = tgtLower === 'english' ? 'Indonesian' : 'English';
              setTargetLang(actualTargetLang);
            }
          }
        } catch(err) {
          console.error('Language detection failed:', err);
        }
      }

      const prompt = `You are a world-class professional translator. Translate the following text from ${sourceLang === 'Auto-detect' ? 'the detected language' : sourceLang} to ${actualTargetLang}. 
Maintain the original tone, context, and nuances (including slang, idioms, or formal tone). 
${styleInstruction ? `\nSPECIAL INSTRUCTION: ${styleInstruction}\n` : ''}
DO NOT add any conversational filler, explanations, or quotes around the translation. Output ONLY the translated text.

Text to translate:
${sourceText}`;

      const stream = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: modelIdentifier,
        stream: true,
        temperature: 0.3,
      });

      let fullTranslation = '';
      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) break;
        const delta = chunk.choices[0]?.delta?.content || '';
        fullTranslation += delta;
        setTranslatedText(fullTranslation);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Translation error:', err);
        setError(err.message || 'Failed to translate. Please try again.');
      }
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <>
      <style>{`
        .translator-container {
          display: flex; flex-direction: column; height: 100%; padding: 0 40px 24px 40px; max-width: 1200px; margin: 0 auto; width: 100%; overflow-y: auto; overflow-x: hidden;
        }
        .translator-controls {
          display: flex; align-items: center; gap: 16px;
        }
        .translator-text-areas {
          display: flex; gap: 16px; flex: 1; min-height: 300px;
        }
        .translator-swap-btn {
          background: transparent; border: none; color: var(--muted); display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        @media (max-width: 768px) {
          .translator-container { padding: 0 16px 24px 16px !important; }
          .translator-controls { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .translator-text-areas { flex-direction: column !important; min-height: 500px !important; }
          .translator-swap-btn { align-self: center !important; transform: rotate(90deg) !important; padding: 4px !important; }
          .translator-lang-wrapper { width: 100% !important; }
        }
      `}</style>
      <div className="translator-container">
        
        {/* Header hidden or minimal to match ChatGPT look, but we keep a small version so user knows where they are */}
        <div style={{ padding: '24px 0', opacity: 0.8 }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Languages size={22} color="var(--accent)" /> AI Translator
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
          
          {/* Top Controls Row */}
          <div className="translator-controls">
            <LanguageSelector 
              value={sourceLang} 
              displayValue={sourceLang === 'Auto-detect' && detectedLang ? `Auto-detect (${detectedLang})` : sourceLang}
              onChange={(val) => { setSourceLang(val); setDetectedLang(''); }} 
              options={LANGUAGES} 
            />
            <button 
              onClick={handleSwap}
              className="translator-swap-btn"
              title="Swap Languages"
            >
              <ArrowRightLeft size={16} />
            </button>
            <LanguageSelector 
              value={targetLang} 
              onChange={setTargetLang} 
              options={LANGUAGES.filter(l => {
                if (l === 'Auto-detect') return false;
                const currentSrc = sourceLang === 'Auto-detect' ? detectedLang.toLowerCase() : sourceLang.toLowerCase();
                const opt = l.toLowerCase();
                if (currentSrc === opt || (currentSrc === 'indonesia' && opt === 'indonesian') || (currentSrc === 'indonesian' && opt === 'indonesia')) return false;
                return true;
              })} 
            />
          </div>



          {/* Text Areas Row */}
          <div className="translator-text-areas">
          
          {/* Source Text Area Container */}
          <div style={{ flex: 1, position: 'relative', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
            <textarea
              value={sourceText}
              onChange={(e) => {
                setSourceText(e.target.value);
                if (!e.target.value.trim()) setDetectedLang('');
              }}
              placeholder="Ketik atau tempel teks untuk diterjemahkan"
              style={{ flex: 1, width: '100%', padding: '20px', background: 'transparent', border: 'none', color: 'var(--fg)', fontSize: '16px', resize: 'none', outline: 'none', lineHeight: '1.6', fontFamily: 'var(--font-sans)' }}
            />
            {/* Play Button inside source text area */}
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', background: 'transparent' }}>
              <button 
                onClick={() => handleTranslate()}
                disabled={!sourceText.trim() || isTranslating}
                style={{ 
                  background: isTranslating ? 'var(--border)' : 'var(--fg)', 
                  color: 'var(--bg)', 
                  border: 'none', 
                  width: '36px', height: '36px',
                  borderRadius: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: !sourceText.trim() || isTranslating ? 'not-allowed' : 'pointer', 
                  transition: 'opacity 0.2s',
                  opacity: (!sourceText.trim() || isTranslating) ? 0.5 : 1
                }}
              >
                {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              </button>
            </div>
          </div>

          {/* Target Text Area Container */}
          <div style={{ flex: 1, position: 'relative', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.06)' }}>
            <textarea
              readOnly
              value={translatedText}
              style={{ flex: 1, width: '100%', padding: '20px', background: 'transparent', border: 'none', color: 'var(--heading)', fontSize: '16px', resize: 'none', outline: 'none', lineHeight: '1.6', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
            />
            {/* Copy Button inside target text area */}
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-start', background: 'transparent' }}>
              <button 
                onClick={handleCopy}
                disabled={!translatedText}
                style={{ background: 'transparent', border: 'none', color: isCopied ? '#10b981' : 'var(--muted)', cursor: translatedText ? 'pointer' : 'not-allowed', padding: '4px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                title="Copy Translation"
              >
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

        </div>

        {/* Style Suggestions Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px', marginBottom: '24px' }}>
          {SUGGESTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => handleTranslate(s.prompt)}
                disabled={!sourceText.trim() || isTranslating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  color: 'var(--fg)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: !sourceText.trim() || isTranslating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: (!sourceText.trim() || isTranslating) ? 0.5 : 1
                }}
                onMouseEnter={e => { if (sourceText.trim() && !isTranslating) { e.currentTarget.style.background = 'rgba(var(--accent-rgb), 0.1)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb), 0.2)'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>

      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
    </>
  );
}
