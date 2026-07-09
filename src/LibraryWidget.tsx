import React, { useState, useRef, useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Folder, FileText, Upload, Trash2, Edit2, Loader2, FolderPlus, ChevronRight, LayoutGrid, List, ArrowDown, ArrowUp, FileImage, FileVideo, FileAudio, FileCode, FileArchive, FileSpreadsheet, FileJson, File, Search, X, Download, Play, Pause, Volume2, VolumeX, Maximize, Minimize, CheckSquare, SkipBack, SkipForward, RotateCcw, Repeat, PictureInPicture2, Shuffle, Music } from 'lucide-react';
import { extractFileContent } from './utils';
import { api } from './api';

const FileIconComponent = ({ file, size, style, opacity }: { file: any, size: number, style?: any, opacity?: number }) => {
  if (file.type === 'folder') return <Folder fill="var(--fg)" color="var(--fg)" size={size} style={{ opacity: opacity || 0.8, ...style }} />;
  
  const ext = file.filename.split('.').pop()?.toLowerCase() || '';
  const mime = file.type || '';
  const iconProps = { color: "var(--accent)", strokeWidth: 1.5, size, style, opacity: opacity || 1 };

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return <FileImage {...iconProps} />;
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return <FileVideo {...iconProps} />;
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return <FileAudio {...iconProps} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive {...iconProps} />;
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json'].includes(ext)) {
    if (ext === 'json') return <FileJson {...iconProps} />;
    return <FileCode {...iconProps} />;
  }
  if (['csv', 'xls', 'xlsx'].includes(ext)) return <FileSpreadsheet {...iconProps} />;
  if (['txt', 'md', 'log', 'pdf'].includes(ext) || mime === 'application/pdf') return <FileText {...iconProps} />;
  
  return <File {...iconProps} />;
};

const CustomVideoPlayer = ({ 
  src, 
  filename,
  isMinimized, 
  onToggleMinimize, 
  onClose,
  onNext,
  onPrev
}: { 
  src: string, 
  filename: string,
  isMinimized?: boolean, 
  onToggleMinimize?: () => void, 
  onClose?: () => void,
  onNext?: () => void,
  onPrev?: () => void
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const minimizedTimeTextRef = useRef<HTMLSpanElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isSliderHovered, setIsSliderHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    setHasEnded(false);
  }, [src]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const seekToStart = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setHasEnded(false);
    }
  };

  const handlePrevClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentTime > 3) {
      seekToStart(e);
    } else if (onPrev) {
      onPrev();
    }
  };



  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    video.play().catch(e => {
      console.warn('Autoplay blocked:', e);
      setIsPlaying(false);
    });

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [src]);

  useEffect(() => {
    let animationFrameId: number;
    const updateProgress = () => {
      const video = videoRef.current;
      const fill = progressFillRef.current;
      const timeText = timeTextRef.current;
      const minTimeText = minimizedTimeTextRef.current;
      if (video && !video.paused && video.duration) {
        const pct = (video.currentTime / video.duration) * 100;
        if (fill) fill.style.width = `${pct}%`;
        if (timeText) {
          timeText.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
        if (minTimeText) {
          minTimeText.textContent = formatTime(video.currentTime);
        }
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };
    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setProgress(videoRef.current.duration ? (videoRef.current.currentTime / videoRef.current.duration) * 100 : 0);
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', () => isPlaying && setShowControls(false));
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', () => {});
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current && bgVideoRef.current) {
      if (isPlaying) {
        bgVideoRef.current.play().catch(e => console.error(e));
      } else {
        bgVideoRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        if (hasEnded) {
          videoRef.current.currentTime = 0;
          setHasEnded(false);
        }
        videoRef.current.play().catch(e => console.error(e));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
      if (bgVideoRef.current && Math.abs(bgVideoRef.current.currentTime - videoRef.current.currentTime) > 0.5) {
        bgVideoRef.current.currentTime = videoRef.current.currentTime;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (Number(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      if (bgVideoRef.current) bgVideoRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
      setHasEnded(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      if (isMuted && volume === 0) setVolume(0.5);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseFilename = (name: string) => {
    const cleanName = name.replace(/\.[^/.]+$/, "");
    const parts = cleanName.split(" - ");
    if (parts.length >= 2) {
      return {
        title: parts[1].trim(),
        artist: parts[0].trim(),
        album: parts[2] ? parts[2].trim() : ""
      };
    }
    return {
      title: cleanName,
      artist: "Local Video File",
      album: ""
    };
  };

  const getDeterministicGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `hsl(${Math.abs(hash) % 360}, 60%, 45%)`;
    const c2 = `hsl(${Math.abs(hash * 31) % 360}, 65%, 25%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  const { title, artist, album } = parseFilename(filename || "");


  const controlBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    padding: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    borderRadius: '50%'
  };

  const playBtnStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    width: 44,
    height: 44,
    borderRadius: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  };

  return (
    <div 
      ref={containerRef} 
      style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', borderRadius: isFullscreen ? 0 : 8 }}
      onDoubleClick={isMinimized ? undefined : toggleFullscreen}
      onClick={isMinimized ? undefined : togglePlay}
    >
      <video 
        ref={bgVideoRef}
        src={src}
        muted
        loop={isLooping}
        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(60px)', opacity: 0.6, zIndex: 0, pointerEvents: 'none', transform: 'scale(1.1)' }}
      />
      <video 
        ref={videoRef}
        src={src}
        loop={isLooping}
        onClick={(e) => { 
          if (isMinimized) return;
          e.stopPropagation(); 
          togglePlay(); 
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setHasEnded(true);
        }}
        style={{ width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, position: 'relative' }}
      />
      
      {/* 1. Minimized Video Controls Overlay */}
      {isMinimized && (
        <div 
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              onClick={togglePlay}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 4 }}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : hasEnded ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}
            </button>
            <span ref={minimizedTimeTextRef} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'monospace' }}>
              {formatTime(currentTime)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onToggleMinimize && (
              <button 
                onClick={onToggleMinimize}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <Maximize size={16} />
              </button>
            )}
            {onClose && (
              <button 
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Maximized Video Controls Overlay */}
      {!isMinimized && (
        <div 
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'rgba(18, 18, 18, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s'
          }}
        >
          {/* Seeker line */}
          <div 
            style={{ 
              position: 'absolute', 
              top: -3, 
              left: 0, 
              right: 0, 
              height: isSliderHovered ? 6 : 4, 
              background: 'rgba(255,255,255,0.12)', 
              transition: 'height 0.15s ease', 
              zIndex: 20 
            }}
            onMouseEnter={() => setIsSliderHovered(true)}
            onMouseLeave={() => setIsSliderHovered(false)}
          >
            <div ref={progressFillRef} style={{ height: '100%', width: `${progress || 0}%`, background: 'var(--accent)', position: 'relative' }}>
              {isSliderHovered && (
                <div style={{
                  position: 'absolute',
                  right: -6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent)'
                }} />
              )}
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress || 0} 
              onChange={handleProgressChange}
              style={{ 
                position: 'absolute', 
                top: -10, 
                left: 0, 
                width: '100%', 
                height: 24, 
                opacity: 0, 
                cursor: 'pointer', 
                margin: 0,
                zIndex: 30
              }}
            />
          </div>

          {/* Controls Row */}
          <div style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '0 12px' : '0 24px',
            position: 'relative'
          }}>
            {/* LEFT: Controls & Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, minWidth: 0, flexShrink: 0 }}>
              <button 
                onClick={handlePrevClick} 
                disabled={!onPrev}
                title="Previous file" 
                style={{
                  ...controlBtnStyle,
                  opacity: onPrev ? 1 : 0.35,
                  pointerEvents: onPrev ? 'auto' : 'none'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <SkipBack size={20} />
              </button>

              <button 
                onClick={togglePlay} 
                title={isPlaying ? "Pause" : "Play"} 
                style={playBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : hasEnded ? <RotateCcw size={18} /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); onNext && onNext(); }} 
                disabled={!onNext}
                title="Next file" 
                style={{
                  ...controlBtnStyle,
                  opacity: onNext ? 1 : 0.35,
                  pointerEvents: onNext ? 'auto' : 'none'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <SkipForward size={20} />
              </button>

              {!isMobile && (
                <span ref={timeTextRef} style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'monospace', marginLeft: 10, userSelect: 'none' }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </div>

            {/* MIDDLE: Video Details */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? 8 : 16, 
              flex: 1, 
              justifyContent: 'center', 
              minWidth: 0, 
              padding: isMobile ? '0 8px' : '0 24px' 
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                background: getDeterministicGradient(filename || ""),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden'
              }}>
                <FileVideo size={18} color="#fff" style={{ opacity: 0.8 }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflow: 'hidden' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={title}>
                  {title}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={`${artist} ${album ? `• ${album}` : ''}`}>
                  {artist} {album ? `• ${album}` : ''}
                </span>
              </div>
            </div>

            {/* RIGHT: Volume, Repeat, Fullscreen, Minimizer, Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, flexShrink: 0, justifyContent: 'flex-end' }}>
              {!isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button 
                    onClick={toggleMute} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.2s' }}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input 
                    type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} 
                    onChange={handleVolumeChange}
                    style={{ width: 60, accentColor: 'var(--accent)', cursor: 'pointer', height: 4 }}
                  />
                </div>
              )}

              <button 
                onClick={(e) => { e.stopPropagation(); setIsLooping(!isLooping); }} 
                style={{ background: 'transparent', border: 'none', color: isLooping ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', padding: 6, display: 'flex', transition: 'color 0.2s' }}
                title={isLooping ? "Repeat: ON" : "Repeat: OFF"}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => !isLooping && (e.currentTarget.style.color = 'var(--muted)')}
              >
                <Repeat size={17} />
              </button>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: isMobile ? 6 : 10, 
                borderLeft: '1px solid rgba(255,255,255,0.1)', 
                paddingLeft: isMobile ? 8 : 12 
              }}>
                {onToggleMinimize && (
                  <button 
                    onClick={onToggleMinimize}
                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.2s' }}
                    title={isMinimized ? "Maximize Player" : "Miniplayer"}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                  >
                    {isMinimized ? <Maximize size={18} /> : <PictureInPicture2 size={18} />}
                  </button>
                )}

                <button 
                  onClick={toggleFullscreen} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomAudioPlayer = ({ 
  src, 
  filename,
  isMinimized,
  onToggleMinimize,
  onClose,
  onNext,
  onPrev
}: { 
  src: string, 
  filename: string,
  isMinimized?: boolean,
  onToggleMinimize?: () => void,
  onClose?: () => void,
  onNext?: () => void,
  onPrev?: () => void
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSliderHovered, setIsSliderHovered] = useState(false);

  useEffect(() => {
    setHasEnded(false);
  }, [src]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const seekToStart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setHasEnded(false);
    }
  };

  const handlePrevClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentTime > 3) {
      seekToStart();
    } else if (onPrev) {
      onPrev();
    }
  };



  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    audio.play().catch(e => {
      console.warn('Autoplay blocked:', e);
      setIsPlaying(false);
    });

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [src]);

  useEffect(() => {
    let animationFrameId: number;
    const updateProgress = () => {
      const audio = audioRef.current;
      const fill = progressFillRef.current;
      const timeText = timeTextRef.current;
      if (audio && !audio.paused && audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        if (fill) fill.style.width = `${pct}%`;
        if (timeText) {
          timeText.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        }
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };
    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setProgress(audioRef.current.duration ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0);
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (hasEnded) {
          audioRef.current.currentTime = 0;
          setHasEnded(false);
        }
        audioRef.current.play().catch(e => console.error(e));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (Number(e.target.value) / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
      setHasEnded(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      if (isMuted && volume === 0) setVolume(0.5);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseFilename = (name: string) => {
    const cleanName = name.replace(/\.[^/.]+$/, "");
    const parts = cleanName.split(" - ");
    if (parts.length >= 2) {
      return {
        title: parts[1].trim(),
        artist: parts[0].trim(),
        album: parts[2] ? parts[2].trim() : ""
      };
    }
    return {
      title: cleanName,
      artist: "Local Audio File",
      album: ""
    };
  };

  const getDeterministicGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `hsl(${Math.abs(hash) % 360}, 60%, 40%)`;
    const c2 = `hsl(${Math.abs(hash * 31) % 360}, 65%, 20%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  };

  const getDeterministicColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 50%, 35%)`;
  };

  const { title, artist, album } = parseFilename(filename);


  const controlBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    padding: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    borderRadius: '50%'
  };

  const playBtnStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    width: 44,
    height: 44,
    borderRadius: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  };

  return (
    <div 
      style={isMinimized ? {
        width: '100%',
        background: '#121212',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
        zIndex: 9999
      } : {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#090909',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={e => e.stopPropagation()}
    >
      <audio 
        ref={audioRef}
        src={src}
        loop={isLooping}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setHasEnded(true);
        }}
      />

      {!isMinimized && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? 24 : 36,
          zIndex: 1,
          position: 'relative',
          padding: '24px 16px',
          paddingTop: '80px'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: isMobile ? '300px' : '500px',
            height: isMobile ? '300px' : '500px',
            background: getDeterministicGradient(filename),
            filter: 'blur(120px)',
            opacity: 0.2,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <div 
            className="vinyl-disc"
            style={{
              width: isMobile ? 200 : 320,
              height: isMobile ? 200 : 320,
              borderRadius: '50%',
              background: `
                radial-gradient(circle, transparent 35%, rgba(0,0,0,0.95) 35%),
                repeating-radial-gradient(circle, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.85) 1px, transparent 1px, transparent 3px),
                conic-gradient(from 0deg, #101010 0deg, #2a2a2a 45deg, #101010 90deg, #2a2a2a 135deg, #101010 180deg, #2a2a2a 225deg, #101010 270deg, #2a2a2a 315deg, #101010 360deg)
              `,
              boxShadow: '0 25px 60px rgba(0,0,0,0.9), inset 0 0 16px rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'spin 20s linear infinite',
              animationPlayState: isPlaying ? 'running' : 'paused',
              position: 'relative',
              zIndex: 1
            }}
          >
            <div style={{
              width: isMobile ? 70 : 112,
              height: isMobile ? 70 : 112,
              borderRadius: '50%',
              background: getDeterministicColor(filename),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.6)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Music size={isMobile ? 24 : 36} color="#fff" style={{ opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            </div>

            <div style={{
              position: 'absolute',
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#090909',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
              zIndex: 5
            }} />
          </div>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, zIndex: 1, maxWidth: '85%' }}>
            <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: 'var(--heading)', margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {title}
            </h2>
            <p style={{ fontSize: isMobile ? 14 : 16, color: 'var(--muted)', margin: 0 }}>
              {artist} {album ? `• ${album}` : ''}
            </p>
          </div>
        </div>
      )}

      <div style={{
        width: '100%',
        background: '#121212',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10
      }}>
        <div 
          style={{ 
            position: 'absolute', 
            top: -3, 
            left: 0, 
            right: 0, 
            height: isSliderHovered ? 6 : 4, 
            background: 'rgba(255,255,255,0.12)', 
            transition: 'height 0.15s ease', 
            zIndex: 20 
          }}
          onMouseEnter={() => setIsSliderHovered(true)}
          onMouseLeave={() => setIsSliderHovered(false)}
        >
          <div ref={progressFillRef} style={{ height: '100%', width: `${progress || 0}%`, background: 'var(--accent)', position: 'relative' }}>
            {isSliderHovered && (
              <div style={{
                position: 'absolute',
                right: -6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent)'
              }} />
            )}
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={progress || 0} 
            onChange={handleProgressChange}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ 
              position: 'absolute', 
              top: -10, 
              left: 0, 
              width: '100%', 
              height: 24, 
              opacity: 0, 
              cursor: 'pointer', 
              margin: 0,
              zIndex: 30
            }}
          />
        </div>

        <div style={{
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 24px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, minWidth: 0, flexShrink: 0 }}>
            <button 
              onClick={handlePrevClick} 
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!onPrev}
              title="Previous file" 
              style={{
                ...controlBtnStyle,
                opacity: onPrev ? 1 : 0.35,
                pointerEvents: onPrev ? 'auto' : 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <SkipBack size={20} />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
              onPointerDown={(e) => e.stopPropagation()}
              title={isPlaying ? "Pause" : "Play"} 
              style={playBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : hasEnded ? <RotateCcw size={18} /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onNext && onNext(); }} 
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!onNext}
              title="Next file" 
              style={{
                ...controlBtnStyle,
                opacity: onNext ? 1 : 0.35,
                pointerEvents: onNext ? 'auto' : 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <SkipForward size={20} />
            </button>

            {!isMobile && (
              <span ref={timeTextRef} style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'monospace', marginLeft: 10, userSelect: 'none' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? 8 : 16, 
            flex: 1, 
            justifyContent: 'center', 
            minWidth: 0, 
            padding: isMobile ? '0 8px' : '0 24px' 
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 6,
              background: getDeterministicGradient(filename),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Music size={18} color="#fff" style={{ opacity: 0.8 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={title}>
                {title}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={`${artist} ${album ? `• ${album}` : ''}`}>
                {artist} {album ? `• ${album}` : ''}
              </span>
            </div>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, flexShrink: 0, justifyContent: 'flex-end' }}>
            {(!isMobile || !isMinimized) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }} 
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.2s' }}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input 
                  type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} 
                  onChange={handleVolumeChange}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{ width: isMobile ? 40 : 60, accentColor: 'var(--accent)', cursor: 'pointer', height: 4 }}
                />
              </div>
            )}

            {(!isMobile || !isMinimized) && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsLooping(!isLooping); }} 
                onPointerDown={(e) => e.stopPropagation()}
                style={{ background: 'transparent', border: 'none', color: isLooping ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', padding: 6, display: 'flex', transition: 'color 0.2s' }}
                title={isLooping ? "Repeat: ON" : "Repeat: OFF"}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => !isLooping && (e.currentTarget.style.color = 'var(--muted)')}
              >
                <Repeat size={17} />
              </button>
            )}

            {(!isMobile || !isMinimized) && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsShuffle(!isShuffle); }} 
                onPointerDown={(e) => e.stopPropagation()}
                style={{ background: 'transparent', border: 'none', color: isShuffle ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', padding: 6, display: 'flex', transition: 'color 0.2s' }}
                title={isShuffle ? "Shuffle: ON" : "Shuffle: OFF"}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => !isShuffle && (e.currentTarget.style.color = 'var(--muted)')}
              >
                <Shuffle size={17} />
              </button>
            )}

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? 6 : 10, 
              borderLeft: '1px solid rgba(255,255,255,0.1)', 
              paddingLeft: isMobile ? 8 : 12 
            }}>
              {onToggleMinimize && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }} 
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.2s' }}
                  title={isMinimized ? "Maximize Player" : "Miniplayer"}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  {isMinimized ? <Maximize size={18} /> : <PictureInPicture2 size={18} />}
                </button>
              )}
              {onClose && isMinimized && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onClose(); }} 
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.2s' }}
                  title="Close Player"
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function FileViewerModal({ 
  file, 
  onClose,
  isMinimized,
  onToggleMinimize,
  onNext,
  onPrev
}: { 
  file: any, 
  onClose: () => void,
  isMinimized: boolean,
  onToggleMinimize: () => void,
  onNext?: () => void,
  onPrev?: () => void
}) {
  const [showHeader, setShowHeader] = useState(true);
  const headerTimeoutRef = useRef<any>(null);
  const dragControls = useDragControls();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isMinimized) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isMinimized]);

  const isVideo = file.type?.startsWith('video/');
  const isAudio = file.type?.startsWith('audio/');
  const canMinimize = isVideo || isAudio;
  const activeMinimized = isMinimized && canMinimize;

  useEffect(() => {
    if (activeMinimized) return;
    const handleMouseMove = () => {
      setShowHeader(true);
      if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
      headerTimeoutRef.current = setTimeout(() => {
        setShowHeader(false);
      }, 3000);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    };
  }, [activeMinimized]);

  const imgSrc = `http://${window.location.hostname}:3001/api/library/file/${file.id}`;
  const isImage = file.type?.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const isText = file.type?.startsWith('text/') || ['js','ts','json','md','csv','txt'].includes(file.filename.split('.').pop()?.toLowerCase()||'');

  const modalStyle: React.CSSProperties = activeMinimized
    ? (isAudio 
        ? {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: 'auto',
            zIndex: 9999,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column'
          }
        : {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: 'auto',
            height: 'auto',
            zIndex: 9999,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column'
          })
    : {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column'
      };

  const playerWidth = isVideo ? 320 : 500;
  const playerHeight = isVideo ? 200 : 132;

  const dragConstraints = activeMinimized 
    ? {
        left: -window.innerWidth + playerWidth + 48,
        right: 0,
        top: -window.innerHeight + playerHeight + 48,
        bottom: 0
      }
    : undefined;

  const contentStyle: React.CSSProperties = activeMinimized
    ? (isAudio
        ? {
            pointerEvents: 'auto',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            width: '100%'
          }
        : {
            pointerEvents: 'auto',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'grab'
          })
    : (isAudio
        ? {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 0
          }
        : {
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: (isVideo || isImage) ? 0 : '80px 32px 32px 32px'
          });

  return (
    <div style={modalStyle} onClick={activeMinimized ? undefined : onClose}>
      {!activeMinimized && (
        <div 
          onClick={e => e.stopPropagation()}
          style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
            padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', 
            opacity: showHeader ? 1 : 0, transition: 'opacity 0.3s' 
          }} 
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <FileIconComponent file={file} size={24} style={{ flexShrink: 0 }} />
            <div 
              style={{ overflow: 'hidden', flex: 1, minWidth: 0, position: 'relative' }}
              onMouseEnter={e => {
                const marquee = e.currentTarget.querySelector('.header-marquee') as HTMLElement;
                if (marquee) marquee.style.animationPlayState = 'paused';
              }}
              onMouseLeave={e => {
                const marquee = e.currentTarget.querySelector('.header-marquee') as HTMLElement;
                if (marquee) marquee.style.animationPlayState = 'running';
              }}
              onTouchStart={e => {
                const marquee = e.currentTarget.querySelector('.header-marquee') as HTMLElement;
                if (marquee) marquee.style.animationPlayState = 'paused';
              }}
              onTouchEnd={e => {
                const marquee = e.currentTarget.querySelector('.header-marquee') as HTMLElement;
                if (marquee) marquee.style.animationPlayState = 'running';
              }}
            >
              <div 
                className="header-marquee"
                style={isMobile && file.filename.length > 40 ? { 
                  display: 'flex', 
                  width: 'max-content', 
                  animation: 'marquee 12s linear infinite' 
                } : {
                  display: 'block',
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ 
                  fontSize: 16, 
                  fontWeight: 500, 
                  paddingRight: (isMobile && file.filename.length > 40) ? 50 : 0, 
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: (isMobile && file.filename.length > 40) ? 'clip' : 'ellipsis'
                }}>
                  {file.filename}
                </span>
                {isMobile && file.filename.length > 40 && (
                  <span style={{ fontSize: 16, fontWeight: 500, paddingRight: 50, whiteSpace: 'nowrap' }}>{file.filename}</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {canMinimize && (
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }} 
                className="icon-btn" 
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                title="Miniplayer"
              >
                <PictureInPicture2 size={20} />
              </button>
            )}
            <a href={imgSrc} download={file.filename} style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }} className="icon-btn">
              <Download size={20} />
            </a>
            <button onClick={onClose} className="icon-btn" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
          </div>
        </div>
      )}
      <motion.div 
        drag={activeMinimized && !isAudio}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        dragMomentum={false}
        animate={activeMinimized ? undefined : { x: 0, y: 0 }}
        style={contentStyle} 
        onClick={e => e.stopPropagation()}
        onPointerDown={(e) => {
          if (activeMinimized && !isAudio) {
            dragControls.start(e);
          }
        }}
      >
        {isImage && <img src={imgSrc} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
        {isVideo && (
          <div style={activeMinimized ? { width: 320, height: 180 } : { width: '100%', height: '100%' }}>
            <CustomVideoPlayer 
              src={imgSrc} 
              filename={file.filename}
              isMinimized={activeMinimized}
              onToggleMinimize={onToggleMinimize}
              onClose={onClose}
              onNext={onNext}
              onPrev={onPrev}
            />
          </div>
        )}
        {isAudio && (
          <CustomAudioPlayer 
            src={imgSrc} 
            filename={file.filename} 
            isMinimized={activeMinimized}
            onToggleMinimize={onToggleMinimize}
            onClose={onClose}
            onNext={onNext}
            onPrev={onPrev}
          />
        )}
        {isPdf && <iframe src={imgSrc} style={{ width: '100%', height: '100%', border: 'none', background: '#fff', borderRadius: 8 }} />}
        {isText && (
          <div style={{ background: 'var(--panel)', padding: 24, borderRadius: 8, width: '100%', height: '100%', overflow: 'auto', color: 'var(--fg)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
            {file.content || 'No text content available'}
          </div>
        )}
        {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <FileIconComponent file={file} size={120} opacity={0.5} />
            <h2 style={{ marginTop: 24, fontWeight: 500 }}>Preview not available</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>This file type cannot be previewed directly in the browser.</p>
            <a href={imgSrc} download={file.filename} className="btn" style={{ background: 'var(--accent)', color: '#000', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 24, padding: '10px 20px', fontWeight: 600 }}>
              <Download size={18} /> Download File
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function LibraryWidget({ 
  libraryFiles, 
  setLibraryFiles, 
  currentUser,
  setViewingFile,
  setIsPlayerMinimized
}: { 
  libraryFiles: any[], 
  setLibraryFiles: (files: any[]) => void, 
  currentUser: any,
  setViewingFile: (file: any | null) => void,
  setIsPlayerMinimized: (min: boolean) => void
}) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFilenameValue, setEditFilenameValue] = useState<string>('');
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('odysseus_library_viewMode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('odysseus_library_viewMode', viewMode);
  }, [viewMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ column: 'name' | 'date' | 'size', direction: 'asc' | 'desc' }>({ column: 'date', direction: 'desc' });
  const [imgErrorIds, setImgErrorIds] = useState<Set<string>>(new Set());
  
  const [uploadState, setUploadState] = useState<{
    isUploading: boolean;
    progress: number;
    speed: string;
    uploadedBytes: number;
    totalBytes: number;
    currentFileName: string;
    totalFiles: number;
    currentFileIndex: number;
  }>({
    isUploading: false,
    progress: 0,
    speed: '0 KB/s',
    uploadedBytes: 0,
    totalBytes: 0,
    currentFileName: '',
    totalFiles: 0,
    currentFileIndex: 0
  });
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, fileIds: string[] } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);

  const fetchLibrary = async () => {
    try {
      const data = await api.getLibrary(currentUser.id);
      setLibraryFiles(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchLibrary(); }, [currentUser]);

  const handleGlobalClick = () => {
    setContextMenu(null);
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  };

  const getFileSize = (f: any) => {
    if (f.type === 'folder') return 0;
    return f.size !== undefined ? f.size : (f.content ? new Blob([f.content]).size : 0);
  };

  const getFileSizeFormatted = (f: any) => {
    if (f.type === 'folder') return '—';
    const bytes = getFileSize(f);
    if (bytes === 0) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Filter and Sort Data
  let currentFiles = libraryFiles.filter(f => f.parent_id === currentFolderId);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    currentFiles = libraryFiles.filter(f => f.filename.toLowerCase().includes(q));
  }

  const sortFiles = (filesToSort: any[]) => {
    return filesToSort.sort((a, b) => {
      let valA, valB;
      if (sortConfig.column === 'name') {
        valA = a.filename.toLowerCase();
        valB = b.filename.toLowerCase();
      } else if (sortConfig.column === 'size') {
        valA = getFileSize(a);
        valB = getFileSize(b);
      } else {
        valA = new Date(a.created_at || 0).getTime();
        valB = new Date(b.created_at || 0).getTime();
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const folders = sortFiles(currentFiles.filter(f => f.type === 'folder'));
  const files = sortFiles(currentFiles.filter(f => f.type !== 'folder'));
  const displayItems = [...folders, ...files];

  const handleUploadFiles = async (uploadFiles: FileList | File[]) => {
    if (!uploadFiles.length) return;
    
    setUploadState(prev => ({
      ...prev, isUploading: true, totalFiles: uploadFiles.length, currentFileIndex: 0
    }));

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        
        let content = '';
        if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
          const extracted = await extractFileContent(file);
          content = extracted.text;
        } else if (file.type.startsWith('text/') || ['md', 'json', 'csv'].includes(file.name.split('.').pop()?.toLowerCase() || '')) {
          try { content = await file.text(); } catch(e){}
        }

        setUploadState(prev => ({
          ...prev, currentFileName: file.name, currentFileIndex: i + 1, progress: 0, uploadedBytes: 0, totalBytes: file.size, speed: '0 KB/s'
        }));

        let lastTime = Date.now();
        let lastLoaded = 0;

        await api.uploadToLibrary(currentUser.id, {
          filename: file.name,
          type: file.type || 'application/octet-stream',
          content,
          file: file,
          parent_id: currentFolderId
        }, (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff > 0.5) {
              const bytesDiff = progressEvent.loaded - lastLoaded;
              const speedBps = bytesDiff / timeDiff;
              let speedStr = `${(speedBps / 1024).toFixed(1)} KB/s`;
              if (speedBps > 1024 * 1024) speedStr = `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`;
              
              setUploadState(prev => ({
                ...prev,
                progress: Math.round((progressEvent.loaded * 100) / progressEvent.total),
                uploadedBytes: progressEvent.loaded,
                speed: speedStr
              }));
              
              lastTime = now;
              lastLoaded = progressEvent.loaded;
            } else {
              setUploadState(prev => ({
                ...prev,
                progress: Math.round((progressEvent.loaded * 100) / progressEvent.total),
                uploadedBytes: progressEvent.loaded
              }));
            }
          }
        });
      }
      await fetchLibrary();
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag and drop global (Upload)
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleItemClick = (e: React.MouseEvent, file: any, index: number) => {
    e.stopPropagation();
    setContextMenu(null);

    const now = Date.now();
    const isDoubleClick = lastClickRef.current && 
                          lastClickRef.current.id === file.id && 
                          (now - lastClickRef.current.time) < 350;

    lastClickRef.current = { id: file.id, time: now };

    if (isDoubleClick) {
      // Double click action: open folder or file
      if (file.type === 'folder') {
        setCurrentFolderId(file.id);
      } else {
        setViewingFile(file);
        setIsPlayerMinimized(false);
      }
      return;
    }

    if (!selectionMode) {
      // When selection mode is off, single-click just selects/highlights the item
      setSelectedIds(new Set([file.id]));
      setLastSelectedIndex(index);
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      const newSel = new Set(selectedIds);
      if (newSel.has(file.id)) newSel.delete(file.id);
      else newSel.add(file.id);
      setSelectedIds(newSel);
      setLastSelectedIndex(index);
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSel = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        newSel.add(displayItems[i].id);
      }
      setSelectedIds(newSel);
    } else {
      const newSel = new Set(selectedIds);
      if (newSel.has(file.id)) newSel.delete(file.id);
      else newSel.add(file.id);
      setSelectedIds(newSel);
      setLastSelectedIndex(index);
    }
  };

  // Context Menu
  const handleContextMenu = (e: React.MouseEvent, file: any, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    let newSelection = new Set(selectedIds);
    if (!newSelection.has(file.id)) {
      newSelection = new Set([file.id]);
      setSelectedIds(newSelection);
      setLastSelectedIndex(index);
    }
    setContextMenu({ x: e.pageX, y: e.pageY, fileIds: Array.from(newSelection) });
  };

  // Item Drag (Move)
  const handleItemDragStart = (e: React.DragEvent, file: any) => {
    let idsToMove = Array.from(selectedIds);
    if (!selectedIds.has(file.id)) {
      idsToMove = [file.id];
      setSelectedIds(new Set(idsToMove));
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(idsToMove));
  };

  const handleItemDrop = async (e: React.DragEvent, targetFolder: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = e.dataTransfer.getData('text/plain');
      if (data) {
        const ids = JSON.parse(data);
        
        const isDescendant = (folderId: string, draggedIds: string[]) => {
          let currentId = folderId;
          while (currentId) {
            if (draggedIds.includes(currentId)) return true;
            const parent = libraryFiles.find(f => f.id === currentId)?.parent_id;
            if (!parent) break;
            currentId = parent;
          }
          return false;
        };

        if (isDescendant(targetFolder.id, ids)) {
          console.warn("Cannot move a folder into its own descendant.");
          return;
        }

        for (const id of ids) {
          await api.updateLibraryItem(currentUser.id, id, { parent_id: targetFolder.id });
        }
        setSelectedIds(new Set());
        fetchLibrary();
      }
    } catch(err){}
  };

  const handleEditStart = (targetId?: string) => {
    const fileId = targetId || (contextMenu?.fileIds.length === 1 ? contextMenu.fileIds[0] : null);
    if (!fileId) return;
    const file = libraryFiles.find(f => f.id === fileId);
    if (!file) return;
    setEditingFileId(file.id);
    setContextMenu(null);
    if (file.type === 'folder') {
      setEditFilenameValue(file.filename);
    } else {
      const parts = file.filename.split('.');
      if (parts.length > 1) parts.pop();
      setEditFilenameValue(parts.join('.'));
    }
  };

  const handleEditSave = async (file: any) => {
    if (!editFilenameValue.trim()) return;
    let newFilename = editFilenameValue.trim();
    if (file.type !== 'folder') {
      const extMatch = file.filename.match(/\.([^.]+)$/);
      const ext = extMatch ? `.${extMatch[1]}` : '';
      newFilename = `${newFilename}${ext}`;
    }
    
    if (newFilename !== file.filename) {
      try {
        await api.updateLibraryItem(currentUser.id, file.id, { filename: newFilename });
        await fetchLibrary();
      } catch (e) { console.error(e); }
    }
    setEditingFileId(null);
  };

  const handleDelete = async (targetIds?: string[]) => {
    const ids = targetIds || (contextMenu ? contextMenu.fileIds : Array.from(selectedIds));
    if (!ids || ids.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${ids.length} item(s)?`)) return;
    
    setContextMenu(null);
    try {
      const toDelete = new Set(ids);
      const findChildren = (parentId: string) => {
        const children = libraryFiles.filter(f => f.parent_id === parentId);
        children.forEach(c => {
          toDelete.add(c.id);
          findChildren(c.id);
        });
      };
      ids.forEach(id => findChildren(id));
      
      for (const delId of Array.from(toDelete)) {
        await api.deleteFromLibrary(currentUser.id, delId);
      }
      setSelectedIds(new Set());
      await fetchLibrary();
    } catch (e) { console.error(e); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(currentUser.id, newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setShowNewFolderModal(false);
      await fetchLibrary();
    } catch (e) {
      console.error(e);
      alert('Failed to create folder');
    }
  };

  const handleSort = (column: 'name' | 'date' | 'size') => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: 'name' | 'date' | 'size' }) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} color="var(--accent)" /> : <ArrowDown size={14} color="var(--accent)" />;
  };

  const breadcrumbs = [];
  let curr = currentFolderId;
  while (curr && !searchQuery) {
    const f = libraryFiles.find(x => x.id === curr);
    if (f) {
      breadcrumbs.unshift(f);
      curr = f.parent_id;
    } else {
      break;
    }
  }

  return (
    <div 
      style={{ padding: isMobile ? '16px 16px 80px 16px' : '32px', height: '100%', overflowY: 'auto', background: 'var(--bg)', position: 'relative' }} 
      onClick={handleGlobalClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div style={{ position: 'absolute', inset: 16, border: '2px dashed var(--accent)', borderRadius: 16, background: 'rgba(var(--accent-rgb), 0.05)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center', color: 'var(--accent)' }}>
            <Upload size={48} style={{ margin: '0 auto 16px auto' }} />
            <h2 style={{ margin: 0 }}>Drop files here to upload</h2>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        marginBottom: '24px', 
        gap: '16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontFamily: 'Outfit', fontWeight: 500, flexWrap: 'wrap' }}>
          <span 
            style={{ cursor: 'pointer', color: currentFolderId ? 'var(--muted)' : 'var(--fg)', transition: 'color 0.2s' }}
            onClick={(e) => { e.stopPropagation(); setCurrentFolderId(null); setSearchQuery(''); }}
          >
            My Drive
          </span>
          {searchQuery ? (
             <React.Fragment>
               <ChevronRight size={18} color="var(--fg)" style={{ opacity: 0.5 }} />
               <span style={{ color: 'var(--fg)' }}>Search results for "{searchQuery}"</span>
             </React.Fragment>
          ) : breadcrumbs.map(b => (
            <React.Fragment key={b.id}>
              <ChevronRight size={18} color="var(--fg)" style={{ opacity: 0.5 }} />
              <span 
                style={{ cursor: 'pointer', color: b.id === currentFolderId ? 'var(--fg)' : 'var(--muted)', transition: 'color 0.2s' }}
                onClick={(e) => { e.stopPropagation(); setCurrentFolderId(b.id); }}
              >
                {b.filename}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-start'
        }}>
          <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : 'none' }}>
            <Search size={16} color="var(--muted)" style={{ position: 'absolute', left: 12, top: 10 }} />
            <input 
              type="text" 
              placeholder="Search library..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '24px', padding: '8px 16px 8px 36px', color: 'var(--fg)', outline: 'none', width: '100%', minWidth: isMobile ? 'none' : '200px', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '24px', padding: '2px', overflow: 'hidden', flexShrink: 0 }}>
            <button 
              className="icon-btn" 
              style={{ padding: '6px 16px', borderRadius: '20px', background: viewMode === 'list' ? 'var(--accent)' : 'transparent', color: viewMode === 'list' ? '#000' : 'var(--muted)', display: 'flex', alignItems: 'center' }} 
              onClick={(e) => { e.stopPropagation(); setViewMode('list'); }} title="List View"
            >
              <List size={18} />
            </button>
            <button 
              className="icon-btn" 
              style={{ padding: '6px 16px', borderRadius: '20px', background: viewMode === 'grid' ? 'var(--accent)' : 'transparent', color: viewMode === 'grid' ? '#000' : 'var(--muted)', display: 'flex', alignItems: 'center' }} 
              onClick={(e) => { e.stopPropagation(); setViewMode('grid'); }} title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          <button 
            className="icon-btn" 
            title="Selection Mode"
            onClick={(e) => { 
              e.stopPropagation(); 
              setSelectionMode(prev => {
                if (prev) {
                  setSelectedIds(new Set());
                  setLastSelectedIndex(null);
                }
                return !prev;
              });
            }}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '24px', 
              background: selectionMode ? 'var(--accent)' : 'var(--panel)', 
              color: selectionMode ? '#000' : 'var(--muted)', 
              border: selectionMode ? '1px solid var(--accent)' : '1px solid var(--border)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s',
              flexShrink: 0,
              cursor: 'pointer'
            }}
          >
            <CheckSquare size={16} />
          </button>

          <button className="btn btn-secondary" style={{ padding: '8px 16px', flex: isMobile ? '1' : 'none' }} onClick={(e) => { e.stopPropagation(); setShowNewFolderModal(true); }}>
            <FolderPlus size={16} style={{ marginRight: 8 }} /> New Folder
          </button>
          
          <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => { if(e.target.files) handleUploadFiles(e.target.files); }} />
          <button className="btn" style={{ background: 'var(--accent)', color: '#000', fontWeight: 600, padding: '8px 16px', flex: isMobile ? '1' : 'none' }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={uploadState.isUploading}>
            {uploadState.isUploading ? <Loader2 size={16} className="spinner" /> : <Upload size={16} style={{ marginRight: 8 }} />} 
            {uploadState.isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
      
      {showNewFolderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ background: 'var(--panel)', padding: '24px', borderRadius: '12px', width: '320px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>New Folder</h3>
            <input 
              autoFocus
              type="text" 
              placeholder="Folder name" 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--fg)', marginBottom: '16px', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setShowNewFolderModal(false)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--accent)', color: '#000' }} onClick={handleCreateFolder}>Create</button>
            </div>
          </div>
        </div>
      )}

      {displayItems.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: '10vh' }}>
          <Folder size={64} opacity={0.2} style={{ marginBottom: 16 }} />
          <h3>{searchQuery ? 'No results found' : currentFolderId ? 'This folder is empty' : 'No files in library'}</h3>
          <p>{searchQuery ? 'Try another search term.' : 'Drag & drop files here to upload.'}</p>
        </div>
      ) : (
        <div style={{ paddingBottom: 60 }}>
          {/* List View Header */}
          {viewMode === 'list' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 1.5fr 1.5fr 1fr', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--fg)', fontWeight: 500, alignItems: 'center', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => handleSort('name')}>Name <SortIcon column="name" /></div>
              {!isMobile && <div style={{ cursor: 'pointer' }}>Owner</div>}
              {!isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => handleSort('date')}>Last modified <SortIcon column="date" /></div>}
              {!isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => handleSort('size')}>File size <SortIcon column="size" /></div>}
            </div>
          )}

          {/* Grid View Name Header */}
          {viewMode === 'grid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg)', fontWeight: 500, marginBottom: '16px', marginTop: '8px', cursor: 'pointer', width: 'fit-content', userSelect: 'none' }} onClick={() => handleSort('name')}>
              Name <SortIcon column="name" />
            </div>
          )}

          <div style={{ 
            display: viewMode === 'grid' ? 'grid' : 'flex', 
            gridTemplateColumns: viewMode === 'grid' ? `repeat(auto-fill, minmax(${isMobile ? '140px' : '260px'}, 1fr))` : 'none', 
            flexDirection: viewMode === 'list' ? 'column' : 'row',
            gap: viewMode === 'grid' ? '16px' : '0' 
          }}>
            {displayItems.map((file, index) => {
              const isFolder = file.type === 'folder';
              const isEditing = editingFileId === file.id;
              const isSelected = selectedIds.has(file.id);
              
              const dateObj = new Date(file.created_at || Date.now());
              const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleString('en-US', {month: 'short'})} ${dateObj.getFullYear()}`;

              return (
              <div 
                key={file.id} 
                draggable
                onDragStart={(e) => handleItemDragStart(e, file)}
                onDragOver={isFolder ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
                onDrop={isFolder ? (e) => handleItemDrop(e, file) : undefined}
                onClick={(e) => handleItemClick(e, file, index)}
                onContextMenu={(e) => handleContextMenu(e, file, index)}
                onDoubleClick={(e) => e.stopPropagation()}
                className={viewMode === 'list' ? "lib-row" : "lib-card"}
                style={{ 
                  background: isSelected ? 'rgba(var(--accent-rgb), 0.15)' : (viewMode === 'grid' ? 'var(--panel)' : 'transparent'), 
                  borderBottom: viewMode === 'list' ? '1px solid var(--border)' : 'none',
                  borderRadius: viewMode === 'grid' ? '12px' : '0', 
                  padding: viewMode === 'grid' ? (isFolder ? '12px 16px' : '12px 16px 0 16px') : '12px 16px', 
                  display: viewMode === 'grid' ? 'flex' : 'grid', 
                  gridTemplateColumns: viewMode === 'list' ? (isMobile ? '1fr' : '3fr 1.5fr 1.5fr 1fr') : 'none',
                  flexDirection: viewMode === 'grid' ? (isFolder ? 'row' : 'column') : 'row', 
                  alignItems: viewMode === 'grid' ? (isFolder ? 'center' : 'stretch') : 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  position: 'relative',
                  border: isSelected && viewMode === 'grid' ? '1px solid var(--accent)' : (viewMode === 'grid' ? '1px solid transparent' : 'none')
                }}
              >
                {/* List View Render */}
                {viewMode === 'list' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                      <FileIconComponent file={file} size={20} style={{ flexShrink: 0 }} />
                      {isEditing ? (
                        <input 
                          type="text" value={editFilenameValue} onChange={(e) => setEditFilenameValue(e.target.value)} onBlur={() => handleEditSave(file)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(file); else if (e.key === 'Escape') setEditingFileId(null); }}
                          autoFocus onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--fg)', padding: '4px 8px', borderRadius: '4px', fontSize: 13, outline: 'none' }} 
                        />
                      ) : (
                        <span style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? 'var(--accent)' : 'inherit' }}>{file.filename}</span>
                      )}
                    </div>
                    
                    {!isMobile && (
                      <>
                        <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#ff5722', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold' }}>
                            {currentUser?.username?.substring(0,2).toUpperCase() || 'S'}
                          </div>
                          me
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                          {dateStr}
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                          {getFileSizeFormatted(file)}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  // Grid View Render
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isFolder ? 0 : 12, width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden', flex: 1 }}>
                        <FileIconComponent file={file} size={20} style={{ flexShrink: 0 }} />
                        {isEditing ? (
                          <input 
                            type="text" value={editFilenameValue} onChange={(e) => setEditFilenameValue(e.target.value)} onBlur={() => handleEditSave(file)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(file); else if (e.key === 'Escape') setEditingFileId(null); }}
                            autoFocus onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--fg)', padding: '4px 8px', borderRadius: '4px', fontSize: 13, outline: 'none' }} 
                          />
                        ) : (
                          <span style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? 'var(--accent)' : 'inherit' }}>{file.filename}</span>
                        )}
                      </div>
                    </div>

                    {!isFolder && (
                      <div style={{ 
                        height: '150px', background: 'var(--bg)', borderRadius: '8px', overflow: 'hidden', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 -4px 12px -4px',
                        border: isSelected ? '1px solid rgba(var(--accent-rgb), 0.3)' : '1px solid var(--border)'
                      }}>
                        {file.type?.startsWith('image/') && !imgErrorIds.has(file.id) ? (
                          <img 
                            src={`http://${window.location.hostname}:3001/api/library/thumb/${file.id}`} 
                            alt={file.filename} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={() => setImgErrorIds(prev => new Set(prev).add(file.id))}
                          />
                        ) : (
                          <FileIconComponent file={file} size={64} opacity={0.8} />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Context Menu */}
      {contextMenu && (
        <div style={{ 
          position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: 'var(--panel)', border: '1px solid var(--border)', 
          borderRadius: '8px', padding: '6px', zIndex: 100, minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' 
        }} onClick={e => e.stopPropagation()}>
          {contextMenu.fileIds.length === 1 && (
            <button className="menu-item-btn" onClick={() => handleEditStart()}>
              <Edit2 size={14} /> Rename
            </button>
          )}
          {contextMenu.fileIds.length === 1 && libraryFiles.find(f => f.id === contextMenu.fileIds[0])?.type !== 'folder' && (
            <a href={`http://${window.location.hostname}:3001/api/library/file/${contextMenu.fileIds[0]}`} download={libraryFiles.find(f => f.id === contextMenu.fileIds[0])?.filename} className="menu-item-btn" style={{ textDecoration: 'none' }} onClick={() => setContextMenu(null)}>
              <Download size={14} /> Download
            </a>
          )}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button className="menu-item-btn" style={{ color: '#ef4444' }} onClick={() => handleDelete()}>
            <Trash2 size={14} /> Delete {contextMenu.fileIds.length > 1 ? `(${contextMenu.fileIds.length})` : ''}
          </button>
        </div>
      )}



      {/* Floating Action Bar for Selected Items (Mobile-friendly) */}
      {selectionMode && selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 80 : 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '32px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 90,
          maxWidth: 'calc(100vw - 32px)',
          width: 'max-content'
        }} onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', borderRight: '1px solid var(--border)', paddingRight: 16 }}>
            {selectedIds.size} selected
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {selectedIds.size === 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditStart(Array.from(selectedIds)[0]);
                }} 
                className="icon-btn" 
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--fg)', padding: '8px 12px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}
              >
                <Edit2 size={14} /> Rename
              </button>
            )}
            {selectedIds.size === 1 && libraryFiles.find(f => f.id === Array.from(selectedIds)[0])?.type !== 'folder' && (
              <a 
                href={`http://${window.location.hostname}:3001/api/library/file/${Array.from(selectedIds)[0]}`} 
                download={libraryFiles.find(f => f.id === Array.from(selectedIds)[0])?.filename} 
                className="icon-btn" 
                style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--fg)', padding: '8px 12px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}
              >
                <Download size={14} /> Download
              </a>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(Array.from(selectedIds));
              }} 
              className="icon-btn" 
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '8px 12px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}
            >
              <Trash2 size={14} /> Delete
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIds(new Set());
                setLastSelectedIndex(null);
              }} 
              className="icon-btn" 
              style={{ color: 'var(--muted)', padding: '8px', borderRadius: '50%' }}
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .lib-card:hover {
          background: rgba(255,255,255,0.05) !important;
        }
        .lib-row:hover {
          background: rgba(255,255,255,0.03) !important;
        }
        .menu-item-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 8px 12px;
          background: transparent;
          border: none;
          color: var(--fg);
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          border-radius: 4px;
        }
        .menu-item-btn:hover {
          background: var(--bg);
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {uploadState.isUploading && (
        <div style={{
          position: 'fixed', 
          bottom: isMobile ? 12 : 24, 
          right: isMobile ? 12 : 24, 
          left: isMobile ? 12 : 'auto',
          background: 'var(--panel)', 
          padding: 16,
          borderRadius: 12, 
          border: '1px solid var(--border)', 
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          width: isMobile ? 'calc(100% - 24px)' : 320, 
          zIndex: 9999, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Uploading {uploadState.currentFileIndex} of {uploadState.totalFiles}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{uploadState.speed}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {uploadState.currentFileName}
          </div>
          <div style={{ background: 'var(--bg)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent)', height: '100%', width: `${uploadState.progress}%`, transition: 'width 0.2s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
            <span>{(uploadState.uploadedBytes / (1024 * 1024)).toFixed(2)} MB / {(uploadState.totalBytes / (1024 * 1024)).toFixed(2)} MB</span>
            <span>{uploadState.progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
