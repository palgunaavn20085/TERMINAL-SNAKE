import React, { useState, useEffect, useRef, useCallback } from 'react';

const TRACKS = [
  { id: 1, title: 'VOID_NOISE_01.WAV', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'BUFFER_UNDERRUN.EXE', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'MEM_LEAK_CRITICAL', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };

export default function App() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isGameRunning, setIsGameRunning] = useState(false);

  const directionRef = useRef(direction);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(TRACKS[currentTrackIndex].url);
      audioRef.current.loop = false;
      audioRef.current.addEventListener('ended', handleNextTrack);
    } else {
      audioRef.current.src = TRACKS[currentTrackIndex].url;
    }
    audioRef.current.volume = isMuted ? 0 : volume;
    if (isPlaying) audioRef.current.play().catch(() => {});
    
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (audioRef.current) audioRef.current.removeEventListener('ended', handleNextTrack);
    };
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [isPlaying]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleNextTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  }, []);
  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };
  const toggleMute = () => setIsMuted(!isMuted);

  const generateFood = useCallback((currentSnake: {x: number, y: number}[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setGameOver(false);
    setIsGameRunning(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.key === ' ' && (gameOver || !isGameRunning)) { resetGame(); return; }
      if (!isGameRunning || gameOver) return;

      const currentDir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': if (currentDir.y !== 1) directionRef.current = { x: 0, y: -1 }; break;
        case 'ArrowDown': case 's': case 'S': if (currentDir.y !== -1) directionRef.current = { x: 0, y: 1 }; break;
        case 'ArrowLeft': case 'a': case 'A': if (currentDir.x !== 1) directionRef.current = { x: -1, y: 0 }; break;
        case 'ArrowRight': case 'd': case 'D': if (currentDir.x !== -1) directionRef.current = { x: 1, y: 0 }; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameRunning, gameOver]);

  useEffect(() => {
    if (!isGameRunning || gameOver) return;
    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = { x: head.x + directionRef.current.x, y: head.y + directionRef.current.y };
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          setGameOver(true); return prevSnake;
        }
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true); return prevSnake;
        }
        const newSnake = [newHead, ...prevSnake];
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => s + 10);
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    };
    const speed = Math.max(40, 120 - Math.floor(score / 50) * 10);
    const intervalId = setInterval(moveSnake, speed);
    return () => clearInterval(intervalId);
  }, [isGameRunning, gameOver, food, score, generateFood]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ffff] flex flex-col items-center justify-center font-terminal selection:bg-[#ff00ff]/30 overflow-hidden relative">
      <div className="static-overlay mix-blend-screen overflow-hidden"></div>
      <div className="scanlines overflow-hidden"></div>

      <div className="z-10 w-full max-w-5xl p-4 md:p-6 flex flex-col items-center gap-10">
        <div className="text-center space-y-4 pt-4 md:pt-0">
          <h1 className="text-4xl md:text-6xl font-pixel glitch tear-element tracking-tighter uppercase" data-text="TERMINAL_SNAKE">
            TERMINAL_SNAKE
          </h1>
          <p className="text-[#ff00ff] uppercase tracking-widest text-lg md:text-xl font-bold bg-[#00ffff] text-black inline-block px-3 py-1 shadow-[4px_4px_0_#ff00ff]">
            [SYS.ERR: FRAGMENTS_SCATTERED]
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start justify-center w-full">
          <div className="hud-border p-6 bg-black flex flex-col gap-6 relative w-full lg:w-auto">
             <div className="absolute -top-3 -left-3 w-6 h-6 border-t-[6px] border-l-[6px] border-[#00ffff]"></div>
             <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-[6px] border-r-[6px] border-[#ff00ff]"></div>

             <div className="w-full flex justify-between items-center px-1 font-pixel text-[#00ffff] text-xs md:text-sm">
               <span className="flex items-center gap-3">
                 <span className="w-3 h-3 bg-[#ff00ff] animate-ping"></span>
                 MEMORY: {score.toString().padStart(4, '0')}
               </span>
               <span className="text-[#ff00ff]">
                 STAGE::{Math.floor(score/50) + 1}
               </span>
             </div>

             <div 
               className="relative bg-[#050510] border-4 border-[#00ffff] aspect-square self-center"
               style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE, boxShadow: "inset 0 0 20px rgba(255,0,255,0.2)" }}
             >
               {!isGameRunning && !gameOver && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20 backdrop-blur-sm">
                   <button onClick={resetGame} className="btn-sys px-8 py-5 font-pixel text-xl flex flex-col items-center gap-2 group cursor-pointer">
                     <span className="group-hover:text-[#ff00ff] transition-colors">EXECUTE</span>
                     <span className="text-xs text-[#00ffff] group-hover:text-white transition-colors">{'<START_SEQ>'}</span>
                   </button>
                 </div>
               )}
               {gameOver && (
                 <div className="absolute inset-0 flex flex-col gap-6 items-center justify-center bg-black/90 z-20 p-4 text-center">
                   <div className="text-[#ff00ff] text-2xl md:text-3xl font-pixel glitch" data-text="KERNEL PANIC">KERNEL PANIC</div>
                   <div className="text-xl">CORRUPTION LEVEL: {score}</div>
                   <button onClick={resetGame} className="btn-sys px-6 py-4 font-pixel text-sm mt-4 hover:bg-[#ff00ff] hover:text-black hover:border-black cursor-pointer">
                     [ REBOOT_PROCESS ]
                   </button>
                 </div>
               )}

               {snake.map((segment, index) => {
                  const isHead = index === 0;
                  return (
                    <div
                      key={`${segment.x}-${segment.y}-${index}`}
                      className={`absolute flex items-center justify-center transition-none shadow-none rounded-none`}
                      style={{
                        left: segment.x * CELL_SIZE, top: segment.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE,
                        backgroundColor: isHead ? '#00ffff' : '#007777', border: isHead ? 'none' : '1px solid #00aaaa'
                      }}
                    >
                      {isHead && <div className="w-2 h-2 bg-black animate-pulse" />}
                    </div>
                  );
               })}

               <div
                 className="absolute bg-[#ff00ff] tear-element"
                 style={{ left: food.x * CELL_SIZE, top: food.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE, border: '2px solid #fff' }}
               />
             </div>
             
             <div className="text-sm font-bold uppercase tracking-widest text-center mt-2 flex items-center gap-2 justify-center flex-wrap opacity-80">
                &gt; OVERRIDE_CTRL: [W] [A] [S] [D] OR [ARROWS]
             </div>
          </div>

          <div className="hud-border w-full lg:w-96 flex flex-col gap-8 p-6 lg:p-8 bg-black">
            <div className="absolute -top-3 -right-3 w-6 h-6 border-t-[6px] border-r-[6px] border-[#00ffff]"></div>
            <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-[6px] border-l-[6px] border-[#ff00ff]"></div>

            <div className="font-pixel text-[#ff00ff] text-xs md:text-sm border-b-[3px] border-[#00ffff] pb-3 mb-2 flex justify-between uppercase">
               <span>SYS_AUDIO</span><span>[ACTIVE]</span>
            </div>

            <div className="flex flex-col items-center">
               <div className="w-32 h-32 md:w-40 md:h-40 border-[4px] border-[#00ffff] bg-black rounded-none flex items-center justify-center mb-6 relative overflow-hidden tear-element shadow-[0_0_15px_#ff00ff]">
                  <div className={`w-24 h-24 md:w-32 md:h-32 border-[3px] border-dashed border-[#ff00ff] ${isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''} flex items-center justify-center`}>
                    <div className="w-12 h-12 md:w-16 md:h-16 border-[3px] border-[#00ffff] rotate-45 flex items-center justify-center">
                        <div className="w-4 h-4 bg-[#ff00ff]"></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(0,255,255,0.1)_10px,rgba(0,255,255,0.1)_15px)] pointer-events-none"></div>
               </div>

               <p className="text-[#ff00ff] mb-3 font-pixel text-xs tracking-widest break-all">{'>>'} TRK_ID_{TRACKS[currentTrackIndex].id}</p>
               <div className="text-xl md:text-2xl h-8 max-w-full text-center flex items-center justify-center glitch" data-text={TRACKS[currentTrackIndex].title}>
                  {TRACKS[currentTrackIndex].title}
               </div>
            </div>

            <div className="flex items-center justify-center gap-6 mb-6 font-pixel">
              <button onClick={handlePrevTrack} className="btn-sys p-3 text-lg cursor-pointer">{'<<'}</button>
              <button 
                onClick={handlePlayPause}
                className={`btn-sys px-6 py-4 text-xl tracking-widest cursor-pointer ${isPlaying ? 'bg-[#ff00ff] text-black border-[#ff00ff]' : ''}`}
              >
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <button onClick={handleNextTrack} className="btn-sys p-3 text-lg cursor-pointer">{'>>'}</button>
            </div>

            <div className="flex items-center gap-4 mt-auto">
               <button onClick={toggleMute} className="text-[#ff00ff] hover:text-white font-pixel text-[10px] p-2 border border-[#ff00ff] cursor-pointer">
                 {isMuted || volume === 0 ? 'MUTE' : 'VOL'}
               </button>
               <input 
                 type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume}
                 onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted) setIsMuted(false); }}
                 className="flex-1 h-4 bg-[#050505] border-[3px] border-[#00ffff] appearance-none cursor-pointer accent-[#ff00ff] rounded-none focus:outline-none"
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
