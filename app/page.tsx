'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Image from 'next/image';

// Pokémon actions database with types
const POKEMON_ACTIONS = [
  { id: 68, name: 'Machamp', action: 'FLEX', emoji: '💪', type: 'fighting' },
  { id: 143, name: 'Snorlax', action: 'SLEEP', emoji: '😴', type: 'normal' },
  { id: 25, name: 'Pikachu', action: 'LIGHTNING POSE', emoji: '⚡', type: 'electric' },
  { id: 6, name: 'Charizard', action: 'BREATHE FIRE', emoji: '🔥', type: 'fire' },
  { id: 7, name: 'Squirtle', action: 'HIDE IN SHELL', emoji: '🐢', type: 'water' },
  { id: 12, name: 'Butterfree', action: 'FLY', emoji: '🦋', type: 'flying' },
  { id: 39, name: 'Jigglypuff', action: 'SING', emoji: '💃', type: 'normal' },
  { id: 23, name: 'Ekans', action: 'SLITHER', emoji: '🐍', type: 'poison' },
  { id: 107, name: 'Hitmonchan', action: 'PUNCH', emoji: '👊', type: 'fighting' },
  { id: 150, name: 'Mewtwo', action: 'MEDITATE', emoji: '🧘', type: 'psychic' },
  { id: 78, name: 'Rapidash', action: 'RUN FAST', emoji: '🏃', type: 'fire' },
  { id: 131, name: 'Lapras', action: 'SURF', emoji: '🌊', type: 'water' },
  { id: 94, name: 'Gengar', action: 'SNEAK', emoji: '👻', type: 'ghost' },
  { id: 18, name: 'Pidgeot', action: 'SOAR', emoji: '🦅', type: 'flying' },
  { id: 3, name: 'Venusaur', action: 'GROW TALL', emoji: '🌿', type: 'grass' },
  { id: 130, name: 'Gyarados', action: 'ROAR', emoji: '🐉', type: 'dragon' },
  { id: 106, name: 'Hitmonlee', action: 'SPIN', emoji: '🤸', type: 'fighting' },
  { id: 95, name: 'Onix', action: 'STOMP', emoji: '😤', type: 'rock' },
];

const TYPE_COLORS: Record<string, { primary: string; secondary: string; emoji: string }> = {
  fire: { primary: '#FF4500', secondary: '#FF8C00', emoji: '🔥' },
  water: { primary: '#1E90FF', secondary: '#00BFFF', emoji: '🌊' },
  electric: { primary: '#FFD700', secondary: '#FFFF00', emoji: '⚡' },
  psychic: { primary: '#9370DB', secondary: '#BA55D3', emoji: '🔮' },
  normal: { primary: '#FFB6C1', secondary: '#FFC0CB', emoji: '⭐' },
  fighting: { primary: '#8B4513', secondary: '#D2691E', emoji: '👊' },
  ghost: { primary: '#483D8B', secondary: '#6A5ACD', emoji: '👻' },
  poison: { primary: '#9370DB', secondary: '#32CD32', emoji: '☠️' },
  flying: { primary: '#87CEEB', secondary: '#B0E0E6', emoji: '🦅' },
  rock: { primary: '#A0522D', secondary: '#D2B48C', emoji: '🪨' },
  grass: { primary: '#228B22', secondary: '#90EE90', emoji: '🌿' },
  dragon: { primary: '#4B0082', secondary: '#191970', emoji: '🐉' },
};

type GameState = 'title' | 'countdown' | 'between' | 'playing' | 'waiting' | 'gameover';

interface CapturedPose {
  imageData: string;
  framedImageData: string;
  pokemonName: string;
  pokemonEmoji: string;
  action: string;
  pokemonId: number;
  pokemonType: string;
}

async function addFrameToPhoto(
  photoDataUrl: string,
  pokemon: typeof POKEMON_ACTIONS[0],
  pokemonSpriteUrl: string
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(photoDataUrl); return; }
    const img = document.createElement('img');
    img.onload = () => {
      const padding = 30;
      const bottomTextHeight = 80;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + bottomTextHeight;
      const typeColors = TYPE_COLORS[pokemon.type] || TYPE_COLORS.normal;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, typeColors.primary);
      gradient.addColorStop(1, typeColors.secondary);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(padding - 5, padding - 5, img.width + 10, img.height + 10);
      ctx.drawImage(img, padding, padding);
      ctx.font = '40px Arial';
      ctx.fillText(typeColors.emoji, 10, 45);
      ctx.fillText(typeColors.emoji, canvas.width - 50, 45);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, canvas.height - bottomTextHeight, canvas.width, bottomTextHeight);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`I posed like ${pokemon.name}! ${pokemon.emoji}`, canvas.width / 2, canvas.height - bottomTextHeight / 2);
      const spriteImg = document.createElement('img');
      spriteImg.crossOrigin = 'anonymous';
      spriteImg.onload = () => {
        const s = 120, sx = canvas.width - s - 15, sy = canvas.height - bottomTextHeight - s - 15;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(sx + s/2, sy + s/2, s/2 + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(spriteImg, sx, sy, s, s);
        resolve(canvas.toDataURL('image/png'));
      };
      spriteImg.onerror = () => resolve(canvas.toDataURL('image/png'));
      spriteImg.src = pokemonSpriteUrl;
    };
    img.src = photoDataUrl;
  });
}

function downloadPhoto(imageData: string, pokemonName: string) {
  const link = document.createElement('a');
  link.href = imageData;
  link.download = `pokemon-simon-says-${pokemonName.toLowerCase()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadAllPhotos(poses: CapturedPose[]) {
  poses.forEach((pose, index) => {
    setTimeout(() => downloadPhoto(pose.framedImageData, `${pose.pokemonName}-${index + 1}`), index * 300);
  });
}

async function sharePhoto(imageData: string, pokemonName: string) {
  try {
    const response = await fetch(imageData);
    const blob = await response.blob();
    const file = new File([blob], `pokemon-simon-says-${pokemonName.toLowerCase()}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: `I posed like ${pokemonName}!`, text: `Check out my ${pokemonName} pose! 🎮`, files: [file] });
    } else {
      downloadPhoto(imageData, pokemonName);
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') downloadPhoto(imageData, pokemonName);
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Home() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(1);
  const [currentPokemon, setCurrentPokemon] = useState<typeof POKEMON_ACTIONS[0] | null>(null);
  const [simonSays, setSimonSays] = useState(true);
  const [timeLeft, setTimeLeft] = useState(5);
  const [countdownTime, setCountdownTime] = useState(5);
  const [pokemonImageUrl, setPokemonImageUrl] = useState('');
  const [speed, setSpeed] = useState(5);
  const [capturedPoses, setCapturedPoses] = useState<CapturedPose[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [showCapturedPose, setShowCapturedPose] = useState(false);
  const [latestPose, setLatestPose] = useState<CapturedPose | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // *** SINGLE video ref — used for BOTH display and detection ***
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Motion detection state (all refs to avoid stale closures)
  const previousFrameRef = useRef<ImageData | null>(null);
  const motionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const motionCountRef = useRef(0);
  const totalMotionRef = useRef(0);
  const motionDetectedRef = useRef(false);
  const simonSaysRef = useRef(true);

  // Simon Says: very sensitive; Non-Simon Says: a bit more sensitive
  const MOTION_THRESHOLD_SIMON = 12;
  const MOTION_THRESHOLD_NO_SIMON = 25;
  const CONSECUTIVE_NEEDED_SIMON = 1;
  const CONSECUTIVE_NEEDED_NO_SIMON = 2;
  const TOTAL_NEEDED_SIMON = 2;
  const TOTAL_NEEDED_NO_SIMON = 4;

  // Keep simonSays ref in sync
  useEffect(() => { simonSaysRef.current = simonSays; }, [simonSays]);

  // Initialize camera — attaches stream to videoRef
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Camera access needed to play!');
    }
  }, []);

  // Ensure stream is connected whenever videoRef element exists and stream is ready
  useEffect(() => {
    if (streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  // Detect motion between frames — reads directly from videoRef
  const detectMotion = useCallback((): boolean => {
    const video = videoRef.current;
    const canvas = motionCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const w = 160, h = 120;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const currentFrame = ctx.getImageData(0, 0, w, h);

    if (!previousFrameRef.current) {
      previousFrameRef.current = currentFrame;
      return false;
    }

    let diff = 0;
    const d1 = previousFrameRef.current.data;
    const d2 = currentFrame.data;
    for (let i = 0; i < d1.length; i += 4) {
      diff += (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i+1] - d2[i+1]) + Math.abs(d1[i+2] - d2[i+2])) / 3;
    }
    const avgDiff = diff / (d1.length / 4);
    previousFrameRef.current = currentFrame;
    return avgDiff > (simonSaysRef.current ? MOTION_THRESHOLD_SIMON : MOTION_THRESHOLD_NO_SIMON);
  }, []);

  const stopMotionDetection = useCallback(() => {
    if (motionIntervalRef.current) {
      clearInterval(motionIntervalRef.current);
      motionIntervalRef.current = null;
    }
  }, []);

  const startMotionDetection = useCallback(() => {
    stopMotionDetection();
    motionDetectedRef.current = false;
    motionCountRef.current = 0;
    totalMotionRef.current = 0;
    previousFrameRef.current = null;

    motionIntervalRef.current = setInterval(() => {
      const moving = detectMotion();

      if (moving) {
        motionCountRef.current++;
        totalMotionRef.current++;
      } else {
        motionCountRef.current = 0;
      }

      const consecutiveNeeded = simonSaysRef.current ? CONSECUTIVE_NEEDED_SIMON : CONSECUTIVE_NEEDED_NO_SIMON;
      const sustained = motionCountRef.current >= consecutiveNeeded;
      setIsMoving(sustained);

      const totalNeeded = simonSaysRef.current ? TOTAL_NEEDED_SIMON : TOTAL_NEEDED_NO_SIMON;
      if (sustained || totalMotionRef.current >= totalNeeded) {
        motionDetectedRef.current = true;
      }
    }, 150);
  }, [detectMotion, stopMotionDetection]);

  // Capture photo
  const capturePhoto = useCallback((): string => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return '';
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Speak (cancels previous, returns promise)
  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.1; u.pitch = 1.3; u.volume = 1;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } else resolve();
    });
  };

  // Fetch Pokémon image
  const fetchPokemon = async (id: number) => {
    try {
      const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const d = await r.json();
      return d.sprites.other['official-artwork'].front_default;
    } catch { return ''; }
  };

  // Process round result
  const processRoundResult = useCallback((correct: boolean) => {
    if (correct) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      speak(Math.random() > 0.5 ? 'Great job!' : 'You got it!');
      setScore(prev => prev + 10);
      setRound(prev => prev + 1);
      if (round % 5 === 0) {
        setSpeed(prev => Math.max(2, prev - 0.5));
        speak('Faster now!');
      }
      setGameState('between');
      setCountdownTime(3);
    } else {
      speak('Oops! Try again!');
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives === 0) {
          setGameState('gameover');
          stopMotionDetection();
          speak(`Game over! Your score is ${score}!`);
        } else {
          setGameState('between');
          setCountdownTime(3);
        }
        return newLives;
      });
    }
  }, [score, round, stopMotionDetection]);

  // Handle round end
  const handleRoundEnd = useCallback(async () => {
    stopMotionDetection();
    const wasSimonSays = simonSaysRef.current;
    const hadMotion = motionDetectedRef.current;

    let correct = false;
    if (wasSimonSays) {
      correct = hadMotion;
      if (correct) {
        const photoData = capturePhoto();
        if (photoData && currentPokemon) {
          const framedPhoto = await addFrameToPhoto(photoData, currentPokemon, pokemonImageUrl);
          const pose: CapturedPose = {
            imageData: photoData, framedImageData: framedPhoto,
            pokemonName: currentPokemon.name, pokemonEmoji: currentPokemon.emoji,
            action: currentPokemon.action, pokemonId: currentPokemon.id, pokemonType: currentPokemon.type
          };
          setCapturedPoses(prev => [...prev, pose]);
          setLatestPose(pose);
          setShowCapturedPose(true);
          setTimeout(() => setShowCapturedPose(false), 2000);
        }
      }
    } else {
      correct = !hadMotion;
    }
    processRoundResult(correct);
  }, [currentPokemon, pokemonImageUrl, processRoundResult, stopMotionDetection, capturePhoto]);

  // Start new round
  const startNewRound = useCallback(async () => {
    stopMotionDetection();
    motionDetectedRef.current = false;
    setIsMoving(false);
    previousFrameRef.current = null;

    const randomPokemon = POKEMON_ACTIONS[Math.floor(Math.random() * POKEMON_ACTIONS.length)];
    setCurrentPokemon(randomPokemon);
    const imageUrl = await fetchPokemon(randomPokemon.id);
    setPokemonImageUrl(imageUrl);

    const isTrickRound = Math.random() > 0.7;
    setSimonSays(!isTrickRound);
    simonSaysRef.current = !isTrickRound;

    // Show the prompt but don't start timer yet
    setGameState('waiting');
    setTimeLeft(speed);

    const command = isTrickRound
      ? `${randomPokemon.action} like ${randomPokemon.name}!`
      : `Simon says... ${randomPokemon.action} like ${randomPokemon.name}!`;

    // Wait for speech, then start
    await speak(command);
    await new Promise(r => setTimeout(r, 400));

    // NOW start detection and timer
    startMotionDetection();
    setGameState('playing');
  }, [speed, startMotionDetection, stopMotionDetection]);

  // Timer countdown — only ticks in 'playing' state
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(prev => prev - 0.1), 100);
      return () => clearTimeout(t);
    } else if (gameState === 'playing' && timeLeft <= 0) {
      handleRoundEnd();
    }
  }, [gameState, timeLeft, handleRoundEnd]);

  // Between-rounds / initial countdown
  useEffect(() => {
    if (gameState !== 'countdown' && gameState !== 'between') return;
    if (countdownTime > 1) {
      const t = setTimeout(() => setCountdownTime(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else if (countdownTime === 1) {
      const t = setTimeout(() => { setCountdownTime(0); speak('Go!'); startNewRound(); }, 1000);
      return () => clearTimeout(t);
    }
  }, [gameState, countdownTime, startNewRound]);

  // Skip handler
  const handleSkip = () => {
    speak('Skipping!');
    stopMotionDetection();
    setGameState('between');
    setCountdownTime(3);
  };

  // Start game
  const startGame = async () => {
    setScore(0); setLives(3); setRound(1); setSpeed(5);
    setCapturedPoses([]); setLatestPose(null);
    setGameStarted(true);

    if (!cameraReady) {
      setGameState('countdown');
      setCountdownTime(99);
      await speak('Starting camera...');
      await initCamera();
      await new Promise(r => setTimeout(r, 500));
    }

    setGameState('countdown');
    setCountdownTime(5);
    speak('Get ready!');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopMotionDetection();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [stopMotionDetection]);

  // ============================================================
  // RENDER
  // ============================================================
  const showGame = gameState !== 'title' && gameState !== 'gameover' && gameStarted;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center overflow-hidden relative">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={motionCanvasRef} style={{ display: 'none' }} />

      {/* === CAMERA LAYER (persistent, behind everything) === */}
      {gameStarted && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-300 ${showGame ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="w-full max-w-lg mx-auto h-[100dvh] py-2 px-2 flex flex-col">
            <div style={{ height: '180px', flexShrink: 0 }} />
            <div className="flex-1 min-h-0 relative mb-2">
              <motion.div
                className="relative w-full h-full rounded-2xl overflow-hidden"
                animate={{
                  boxShadow: isMoving
                    ? '0 0 30px 8px rgba(239, 68, 68, 0.7)'
                    : '0 0 30px 8px rgba(34, 197, 94, 0.7)'
                }}
              >
                {/* THE video element — one and only */}
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-2xl"
                />

                {/* Motion indicator */}
                <div className="absolute top-2 right-2 px-3 py-1 rounded-full font-black text-base"
                  style={{
                    backgroundColor: isMoving ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
                    color: 'white'
                  }}
                >
                  {isMoving ? '🔴 MOVING' : '🟢 STILL'}
                </div>

                {/* Between-rounds overlay */}
                {gameState === 'between' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                    <div className="text-center">
                      <div className="text-2xl font-black text-white mb-2">NEXT ROUND...</div>
                      <motion.div key={countdownTime} initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="text-8xl font-black text-yellow-300">
                        {countdownTime > 0 ? countdownTime : '🎯'}
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Initial countdown overlay */}
                {gameState === 'countdown' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                    <div className="text-center">
                      <div className="text-2xl font-black text-white mb-2">🎮 GET READY! 🎮</div>
                      <motion.div key={countdownTime} initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="text-8xl font-black text-yellow-300">
                        {countdownTime > 0 ? countdownTime : '🎯'}
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Pose capture flash */}
                <AnimatePresence>
                  {showCapturedPose && latestPose && (
                    <motion.div initial={{ opacity: 0, scale: 1.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-4xl font-black text-white text-center">
                        🎉 GREAT {latestPose.action}! 🎉
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white text-xl font-bold">
                    📸 Starting Camera...
                  </div>
                )}
              </motion.div>
            </div>
            <div style={{ height: '44px', flexShrink: 0 }} />
          </div>
        </div>
      )}

      {/* === UI OVERLAY (on top of camera) === */}
      <AnimatePresence mode="wait">
        {gameState === 'title' && (
          <motion.div key="title" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-center p-4">
            <motion.h1
              className="text-6xl md:text-8xl font-black text-white mb-6 drop-shadow-2xl"
              animate={{ scale: [1, 1.1, 1], rotate: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
            >
              🎮 POKÉMON<br/>SIMON SAYS! 🎮
            </motion.h1>
            <div className="text-2xl text-white mb-6 font-bold">📸 Camera Motion Detection! 📸</div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={startGame}
              className="bg-yellow-400 hover:bg-yellow-500 text-5xl font-black text-blue-900 px-12 py-6 rounded-full shadow-2xl border-8 border-yellow-600">
              START! 🚀
            </motion.button>
          </motion.div>
        )}

        {showGame && (
          <motion.div key="game-ui" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} className="w-full max-w-lg mx-auto flex flex-col h-[100dvh] py-2 px-2 z-10 pointer-events-none">

            {/* Score + Lives */}
            <div className="flex justify-between items-center mb-1 text-white">
              <div className="bg-blue-900/60 px-4 py-1 rounded-2xl flex items-center gap-2">
                <span className="text-sm font-bold">SCORE</span>
                <span className="text-2xl font-black">{score}</span>
              </div>
              <div className="bg-black/40 px-3 py-1 rounded-2xl text-lg">
                {'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}
              </div>
            </div>

            {/* Timer bar */}
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
              <motion.div className="h-full rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / speed) * 100}%` }}
                style={{ backgroundColor: timeLeft < 2 ? '#ef4444' : timeLeft < 3 ? '#f59e0b' : '#22c55e' }}
              />
            </div>

            {/* Command card */}
            {(gameState === 'playing' || gameState === 'waiting') && currentPokemon && (
              <div className="bg-white rounded-2xl p-3 shadow-lg mb-2">
                <div className="flex items-center gap-3">
                  {pokemonImageUrl && (
                    <motion.div className="relative w-20 h-20 flex-shrink-0"
                      animate={{ y: [0, -4, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                      <Image src={pokemonImageUrl} alt={currentPokemon.name} fill style={{ objectFit: 'contain' }} />
                    </motion.div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-blue-900">
                      {simonSays ? '🎯 SIMON SAYS...' : '⚠️ TRICK!'}
                    </div>
                    <div className="text-2xl font-black text-purple-900 leading-tight">
                      {currentPokemon.emoji} {currentPokemon.action}
                    </div>
                    <div className="text-base font-bold text-gray-500">like {currentPokemon.name}!</div>
                    {simonSays
                      ? <div className="text-sm font-bold text-green-600">👉 MOVE! 👈</div>
                      : <div className="text-sm font-bold text-red-600">🚫 STAY STILL! 🚫</div>
                    }
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1" />

            {/* Skip button */}
            {(gameState === 'playing' || gameState === 'waiting') && (
              <div className="text-center pointer-events-auto">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSkip}
                  className="bg-orange-500 active:bg-orange-600 text-white text-lg font-black px-6 py-2 rounded-full shadow-lg">
                  ⏭️ SKIP
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div key="gameover" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
            className="text-center max-w-lg w-full p-4 overflow-y-auto max-h-[100dvh]">
            <div className="text-7xl mb-4">😢</div>
            <h2 className="text-5xl font-black text-white mb-4 drop-shadow-2xl">GAME OVER!</h2>
            <div className="text-4xl font-black text-yellow-300 mb-6">SCORE: {score}</div>

            {capturedPoses.length > 0 && (
              <div className="bg-white/90 rounded-3xl p-4 mb-6 shadow-2xl">
                <h3 className="text-3xl font-black text-purple-900 mb-4">🎭 YOUR POSES! 🎭</h3>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => downloadAllPhotos(capturedPoses)}
                  className="bg-blue-500 text-white text-lg font-black px-6 py-2 rounded-full shadow-lg mb-4">
                  📸 Download All
                </motion.button>
                <div className="grid grid-cols-2 gap-3">
                  {capturedPoses.map((pose, i) => (
                    <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                      className="bg-purple-100 rounded-xl p-2 shadow">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pose.framedImageData} alt={`Pose ${i+1}`} className="w-full rounded-lg mb-1" />
                      <div className="text-xs font-bold text-purple-900">{pose.pokemonEmoji} {pose.pokemonName}</div>
                      <div className="flex gap-1 justify-center mt-1">
                        <button onClick={() => downloadPhoto(pose.framedImageData, pose.pokemonName)} className="bg-green-500 text-white text-sm px-2 py-0.5 rounded-full">⬇️</button>
                        <button onClick={() => sharePhoto(pose.framedImageData, pose.pokemonName)} className="bg-purple-500 text-white text-sm px-2 py-0.5 rounded-full">📤</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={startGame}
              className="bg-green-500 hover:bg-green-600 text-4xl font-black text-white px-12 py-6 rounded-full shadow-2xl border-8 border-green-700">
              PLAY AGAIN! 🔄
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
