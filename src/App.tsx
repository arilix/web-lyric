import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Download } from 'lucide-react';
import { LYRICS, ROSE_STAGES, RoseStage } from './constants';

const CANVAS_SIZE = 240;
const TOTAL_DURATION = LYRICS[LYRICS.length - 1]?.end ?? 0;
const BACKGROUND_AUDIO_SRC = '/backsound.mp3';

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const lerp = (from: number, to: number, progress: number) => {
  return from + ((to - from) * progress);
};

const STEM_KEYFRAMES = [
  { start: 0, y: 84 },
  { start: 22, y: 84 },
  { start: 36, y: 74 },
  { start: 49, y: 60 },
  { start: 96, y: 44 },
  { start: 158, y: 36 },
  { start: 212, y: 30 },
  { start: TOTAL_DURATION, y: 30 },
];

const getInterpolatedStemTopY = (time: number) => {
  for (let i = 0; i < STEM_KEYFRAMES.length - 1; i += 1) {
    const current = STEM_KEYFRAMES[i];
    const next = STEM_KEYFRAMES[i + 1];

    if (time >= current.start && time <= next.start) {
      const progress = clamp((time - current.start) / Math.max(next.start - current.start, 1), 0, 1);
      return lerp(current.y, next.y, progress);
    }
  }

  return STEM_KEYFRAMES[STEM_KEYFRAMES.length - 1].y;
};

const getRevealProgress = (time: number, start: number, duration: number) => {
  return clamp((time - start) / duration, 0, 1);
};

const smoothstep = (value: number) => {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - (2 * clamped));
};

const getExportMimeType = () => {
  const preferred = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  return preferred.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
};

const SMOOTH_TRANSITION = { duration: 0.2, ease: 'linear' as const };

const Rose = ({ stage, time }: { stage: RoseStage; time: number }) => {
  const isAtLeast = (target: RoseStage) => {
    const targetIdx = ROSE_STAGES.findIndex(s => s.stage === target);
    const currentIdx = ROSE_STAGES.findIndex(s => s.stage === stage);
    return currentIdx >= targetIdx;
  };

  const getStageProgress = (target: RoseStage) => {
    const idx = ROSE_STAGES.findIndex(s => s.stage === target);
    if (idx === -1) return 0;
    const start = ROSE_STAGES[idx].start;
    const end = ROSE_STAGES[idx + 1]?.start ?? TOTAL_DURATION;
    return clamp((time - start) / (end - start), 0, 1);
  };

  const budProgress = getStageProgress(RoseStage.BUD);
  const bloomingProgress = getStageProgress(RoseStage.BLOOMING);
  const fullBloomProgress = getStageProgress(RoseStage.FULL_BLOOM);
  const stemDetailReveal = smoothstep(getRevealProgress(time, 34, 18));
  const lowerLeftLeafReveal = smoothstep(getRevealProgress(time, 38, 16)) * stemDetailReveal;
  const lowerRightLeafReveal = smoothstep(getRevealProgress(time, 41, 16)) * stemDetailReveal;
  const lowerLeafGroupReveal = Math.max(lowerLeftLeafReveal, lowerRightLeafReveal);
  const middleLeafReveal = smoothstep(getRevealProgress(time, 50, 14)) * lowerLeafGroupReveal;
  const flowerOpen = clamp((bloomingProgress * 0.6) + fullBloomProgress, 0, 1);
  const redMarkOpacity = clamp((bloomingProgress * 0.8) + (fullBloomProgress * 0.9), 0, 0.85);

  const stemTopY = getInterpolatedStemTopY(time);

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <motion.path
        d="M 10 85 Q 50 83 90 85"
        stroke="black"
        strokeWidth="1"
        fill="none"
        animate={{
          d: stage === RoseStage.SEED
            ? ["M 10 85 Q 50 83 90 85", "M 10 85 Q 50 81 90 85", "M 10 85 Q 50 83 90 85"]
            : "M 10 85 Q 50 83 90 85",
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {isAtLeast(RoseStage.GERMINATION) && (
        <motion.path
          d="M 50 88 Q 50 94 54 98"
          stroke="black"
          strokeWidth="0.8"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, ease: 'easeOut' }}
        />
      )}

      <motion.g transform="translate(50, 88)">
        <motion.path
          d={isAtLeast(RoseStage.GERMINATION)
            ? 'M -2.5 -1.5 Q -4 0 -2.5 1.5 M 2.5 -1.5 Q 4 0 2.5 1.5'
            : 'M -3 -2 Q -5 0 -3 2 Q 0 4 3 2 Q 5 0 3 -2 Q 0 -4 -3 -2'}
          stroke="black"
          strokeWidth="1"
          fill="white"
          animate={{ scale: stage === RoseStage.SEED ? [1, 1.03, 1] : 1 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>

      {isAtLeast(RoseStage.SPROUT) && (
        <motion.g>
          <motion.path
            d="M 50 88"
            animate={{
              d: `M 50 88 Q ${47 - (flowerOpen * 1.4)} 64 ${49 + (flowerOpen * 1.2)} ${stemTopY}`,
              pathLength: 1,
            }}
            stroke="black"
            strokeWidth={isAtLeast(RoseStage.BUD) ? 1.25 : 1.1}
            fill="none"
            initial={{ pathLength: 0 }}
            transition={SMOOTH_TRANSITION}
          />

          <motion.path
            d="M 50 80 L 53 78 M 48.8 73 L 46 71 M 49.2 65 L 52.2 63 M 48.5 56 L 45.8 54"
            stroke="black"
            strokeWidth="0.7"
            fill="none"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: stemDetailReveal * 0.55, pathLength: stemDetailReveal }}
            transition={SMOOTH_TRANSITION}
          />
        </motion.g>
      )}

      {isAtLeast(RoseStage.SPROUT) && (
        <motion.g
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: middleLeafReveal * 0.88, scale: 0.94 + (middleLeafReveal * 0.06) }}
          transition={SMOOTH_TRANSITION}
        >
          {/* Left middle leaf */}
          <path d="M 48 58 C 44 53, 37 52, 32 56 C 37 61, 43 62, 48 59" stroke="black" strokeWidth="0.95" fill="white" />
          <path d="M 48 58 C 43 57, 38 56, 34 56" stroke="black" strokeWidth="0.55" fill="none" />
          <path d="M 43 57 L 40 54 M 41 57 L 38 59 M 39 56 L 36 53" stroke="black" strokeWidth="0.4" fill="none" />
          <motion.path
            d="M 33 55 Q 37 53 42 54"
            stroke="#c62828"
            strokeWidth="0.8"
            fill="none"
            animate={{ opacity: redMarkOpacity * middleLeafReveal }}
            transition={SMOOTH_TRANSITION}
          />
        </motion.g>
      )}

      {isAtLeast(RoseStage.SPROUT) && (
        <motion.g
          initial={{ opacity: 0, y: 1 }}
          animate={{ opacity: lowerLeafGroupReveal * 0.88, y: 1 - (lowerLeafGroupReveal * 0.75) }}
          transition={SMOOTH_TRANSITION}
        >
          <motion.g
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: lowerLeftLeafReveal, scale: 0.95 + (lowerLeftLeafReveal * 0.05) }}
            transition={SMOOTH_TRANSITION}
          >
            {/* Left lower leaf */}
            <path d="M 49 73 C 45 68, 38 68, 33 73 C 38 78, 44 78, 49 74" stroke="black" strokeWidth="0.95" fill="white" />
            <path d="M 49 73 C 44 72, 39 72, 35 73" stroke="black" strokeWidth="0.55" fill="none" />
            <path d="M 45 72 L 42 70 M 43 73 L 40 75" stroke="black" strokeWidth="0.4" fill="none" />
            <motion.path
              d="M 34 72 Q 39 69 44 70"
              stroke="#c62828"
              strokeWidth="0.8"
              fill="none"
              animate={{ opacity: redMarkOpacity * lowerLeftLeafReveal }}
              transition={SMOOTH_TRANSITION}
            />
          </motion.g>

          <motion.g
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: lowerRightLeafReveal, scale: 0.95 + (lowerRightLeafReveal * 0.05) }}
            transition={SMOOTH_TRANSITION}
          >
            {/* Right lower leaf */}
            <path d="M 50 70 C 55 66, 62 66, 67 70 C 62 75, 56 75, 50 71" stroke="black" strokeWidth="0.95" fill="white" />
            <path d="M 50 70 C 55 69, 60 69, 65 70" stroke="black" strokeWidth="0.55" fill="none" />
            <path d="M 55 69 L 58 67 M 57 70 L 60 72" stroke="black" strokeWidth="0.4" fill="none" />
            <motion.path
              d="M 57 67 Q 62 67 66 70"
              stroke="#c62828"
              strokeWidth="0.8"
              fill="none"
              animate={{ opacity: redMarkOpacity * lowerRightLeafReveal }}
              transition={SMOOTH_TRANSITION}
            />
          </motion.g>
        </motion.g>
      )}

      {isAtLeast(RoseStage.BUD) && (
        <motion.g
          initial={{ scale: 0.78, x: 50, y: 59 }}
          animate={{
            scale: 0.8 + (budProgress * 0.2),
            x: 49 + (flowerOpen * 0.6),
            y: stemTopY,
            rotate: -3 + (flowerOpen * 3),
          }}
          transition={SMOOTH_TRANSITION}
        >
          <motion.path
            d="M -7 2 C -5 5, -2 7, 0 8 C 2 7, 5 5, 7 2"
            stroke="black"
            strokeWidth="1"
            fill="white"
            animate={{ y: flowerOpen * 0.8 }}
            transition={SMOOTH_TRANSITION}
          />
          <path d="M -10 0 Q -6 2 -4 3" stroke="black" strokeWidth="0.8" fill="none" />
          <path d="M 10 0 Q 6 2 4 3" stroke="black" strokeWidth="0.8" fill="none" />

          <motion.g animate={{ y: -1 - (flowerOpen * 2.6) }} transition={SMOOTH_TRANSITION}>
            <motion.path
              d="M 0 3 C -8 1, -10 -8, -6 -14 C -2 -19, 2 -19, 6 -14 C 10 -8, 8 1, 0 3"
              stroke="black"
              strokeWidth="1"
              fill="white"
              animate={{ scaleX: 1 + (flowerOpen * 0.06), scaleY: 1 + (flowerOpen * 0.08) }}
              transition={SMOOTH_TRANSITION}
            />

            <motion.path
              d="M 0 -14 C -3 -13, -5 -10, -3 -8 C -1 -6, 2 -6, 4 -8 C 6 -10, 5 -13, 2 -14"
              stroke="black"
              strokeWidth="0.9"
              fill="white"
              animate={{ y: -flowerOpen * 1.6 }}
              transition={SMOOTH_TRANSITION}
            />

            <motion.path
              d="M -7 2 C -12 -1, -15 -7, -11 -12 C -8 -14, -3 -12, 0 -7"
              stroke="black"
              strokeWidth="1"
              fill="white"
              animate={{ rotate: -7 - (flowerOpen * 17), x: -flowerOpen * 1.4, y: -flowerOpen * 1.3 }}
              transition={SMOOTH_TRANSITION}
              style={{ originX: '0px', originY: '0px' }}
            />

            <motion.path
              d="M 7 2 C 12 -1, 15 -7, 11 -12 C 8 -14, 3 -12, 0 -7"
              stroke="black"
              strokeWidth="1"
              fill="white"
              animate={{ rotate: 7 + (flowerOpen * 17), x: flowerOpen * 1.4, y: -flowerOpen * 1.3 }}
              transition={SMOOTH_TRANSITION}
              style={{ originX: '0px', originY: '0px' }}
            />

            <motion.path
              d="M -4 -10 C -2 -12, 2 -12, 4 -10 C 2 -9, -2 -9, -4 -10"
              stroke="black"
              strokeWidth="0.8"
              fill="none"
              animate={{ opacity: 0.5 + (flowerOpen * 0.35), y: -flowerOpen * 0.4 }}
              transition={SMOOTH_TRANSITION}
            />

            <motion.path
              d="M -2 -8 Q 0 -11 2 -8 Q 0 -6 -2 -8"
              stroke="black"
              strokeWidth="0.8"
              fill="none"
              animate={{ scale: 1 + (flowerOpen * 0.2), y: -flowerOpen * 0.8 }}
              transition={SMOOTH_TRANSITION}
            />
          </motion.g>
        </motion.g>
      )}

      {isAtLeast(RoseStage.BLOOMING) && (
        <motion.path
          d="M 43 41 Q 49 39 56 41"
          stroke="black"
          strokeWidth="0.6"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 + (flowerOpen * 0.35) }}
          transition={SMOOTH_TRANSITION}
        />
      )}

      {isAtLeast(RoseStage.FULL_BLOOM) && (
        <motion.path
          d="M 45 36 Q 50 34 55 36"
          stroke="black"
          strokeWidth="0.6"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={SMOOTH_TRANSITION}
        />
      )}

    </svg>
  );
};

export default function App() {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const playStartTimeRef = useRef(0);
  const playStartOffsetRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const exportChunksRef = useRef<Blob[]>([]);
  const exportMimeTypeRef = useRef('');
  const hasEndedExportRef = useRef(false);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.75;
      if (Math.abs(audio.currentTime - time) > 0.15) {
        audio.currentTime = time;
      }

      void audio.play().catch(() => {
        setIsPlaying(false);
        setExportStatus('Browser memblokir autoplay audio. Klik Play sekali lagi.');
      });
    }

    playStartTimeRef.current = performance.now();
    playStartOffsetRef.current = time;

    const tick = (now: number) => {
      const elapsedSeconds = (now - playStartTimeRef.current) / 1000;
      const nextFromAudio = audioRef.current ? audioRef.current.currentTime : 0;
      const next = clamp(
        audioRef.current && !audioRef.current.paused
          ? nextFromAudio
          : playStartOffsetRef.current + elapsedSeconds,
        0,
        TOTAL_DURATION,
      );

      setTime(next);

      if (next >= TOTAL_DURATION) {
        setIsPlaying(false);
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying]);

  const currentLyric = useMemo(() => {
    return LYRICS.find(l => time >= l.start && time < l.end);
  }, [time]);

  const currentStage = useMemo(() => {
    const stageObj = [...ROSE_STAGES].reverse().find(s => time >= s.start);
    return stageObj ? stageObj.stage : RoseStage.SEED;
  }, [time]);

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: string) => {
    const next = clamp(Number(value), 0, TOTAL_DURATION);
    setTime(next);

    if (audioRef.current) {
      audioRef.current.currentTime = next;
    }

    if (isPlaying) {
      playStartOffsetRef.current = next;
      playStartTimeRef.current = performance.now();
    }
  };

  const stopExport = () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      return;
    }

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const handleExportMp4 = async () => {
    if (isExporting) {
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setExportStatus('Browser tidak mendukung perekaman layar/tab untuk export video.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setExportStatus('MediaRecorder tidak tersedia di browser ini.');
      return;
    }

    const mimeType = getExportMimeType();
    if (!mimeType) {
      setExportStatus('Format video yang didukung browser tidak ditemukan.');
      return;
    }

    try {
      setExportStatus('Pilih tab aplikasi ini lalu klik Share untuk mulai export.');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
        },
        audio: false,
      });

      hasEndedExportRef.current = false;
      exportChunksRef.current = [];
      exportMimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          exportChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setExportStatus('Terjadi error saat merekam video.');
        setIsExporting(false);
      };

      recorder.onstop = () => {
        const blob = new Blob(exportChunksRef.current, { type: exportMimeTypeRef.current || 'video/webm' });
        const isMp4 = exportMimeTypeRef.current.includes('mp4');
        const extension = isMp4 ? 'mp4' : 'webm';
        const filename = `rose-lyric-video-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        stream.getTracks().forEach((track) => track.stop());
        setIsExporting(false);
        setExportStatus(
          isMp4
            ? 'Export MP4 selesai.'
            : 'Export selesai dalam format WebM (browser ini belum mendukung perekaman MP4 langsung).',
        );
      };

      setTime(0);
      playStartOffsetRef.current = 0;
      playStartTimeRef.current = performance.now();
      setIsExporting(true);
      setIsPlaying(true);
      setExportStatus('Merekam... video akan otomatis berhenti di akhir lagu.');
      recorder.start(1000);
    } catch {
      setExportStatus('Export dibatalkan atau izin screen capture ditolak.');
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!isExporting || hasEndedExportRef.current) {
      return;
    }

    if (time >= TOTAL_DURATION) {
      hasEndedExportRef.current = true;
      setIsPlaying(false);
      stopExport();
    }
  }, [isExporting, time]);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 font-sans">
      <audio ref={audioRef} src={BACKGROUND_AUDIO_SRC} preload="auto" />

      <div 
        id="lcd-container"
        className="w-[240px] h-[240px] bg-white shadow-2xl overflow-hidden relative border border-neutral-300 flex"
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
      >
        <div className="w-[45%] h-full border-r border-black/5 flex items-center justify-center">
          <Rose stage={currentStage} time={time} />
        </div>

        <div className="w-[55%] h-full flex items-center justify-center p-2">
          <AnimatePresence mode="wait">
            {currentLyric && (
              <motion.div
                key={currentLyric.text}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="text-center text-[14px] leading-tight font-serif italic"
              >
                {currentLyric.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 bg-white p-4 rounded-3xl shadow-md w-[240px]">
        <input
          type="range"
          min={0}
          max={TOTAL_DURATION}
          step={0.1}
          value={time}
          onChange={(e) => handleSeek(e.target.value)}
          className="w-full accent-black"
          aria-label="Seek timeline"
        />

        <div className="flex items-center justify-between px-1">
            <button
              onClick={() => {
                setTime(0);
                setIsPlaying(false);
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                }
              }}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              title="Reset"
            >
              <RotateCcw size={20} />
            </button>

            <button
              onClick={() => setIsPlaying(prev => !prev)}
              className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-full hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>

            <div className="text-sm font-mono w-[82px] text-right">
              {formatTime(time)} / {formatTime(TOTAL_DURATION)}
            </div>
        </div>

        <button
          onClick={handleExportMp4}
          disabled={isExporting}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-neutral-300 text-sm font-medium hover:bg-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed"
          title="Export to MP4"
        >
          <Download size={16} />
          {isExporting ? 'Exporting...' : 'Export MP4'}
        </button>

        {exportStatus && (
          <div className="text-[11px] leading-snug text-neutral-600">
            {exportStatus}
          </div>
        )}
      </div>

      <div className="mt-4 text-neutral-500 text-xs text-center max-w-xs">
        Designed for RAIN.
        Monochrome 2D illustration style.
        <br />
        Click Play to start the lyric video.
      </div>
    </div>
  );
}

