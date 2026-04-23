'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Image from 'next/image';

import {
  type PokemonAction, type Difficulty, type DifficultyConfig,
  TYPE_COLORS, DIFFICULTY_CONFIGS, POINTS_REGULAR, POINTS_BOSS,
  fetchPokemonImage, getRandomPokemon, getRandomBoss, getStreakBonus,
  getSequenceLength, getSpeechRate,
} from '../lib/pokemon';
import { sounds } from '../lib/sounds';
import {
  addHighScore, catchPokemon, saveLastDifficulty,
} from '../lib/storage';
import type { CapturedPose } from '../components/GameOverScreen';
import TitleScreen from '../components/TitleScreen';
import GameOverScreen from '../components/GameOverScreen';
import Pokedex from '../components/Pokedex';

// ============================================================
// Types
// ============================================================

type GameState =
  | 'title'
  | 'countdown'
  | 'watching'   // memory phase: showing all commands in sequence
  | 'playing'    // performing: player acts on each command from memory
  | 'between'
  | 'gameover';

interface SequenceAction {
  pokemon: PokemonAction;
  imageUrl: string;
  simonSays: boolean;
  isBoss: boolean;
}

// ============================================================
// Helpers
// ============================================================

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function speak(text: string, rate = 1.1): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 1.3;
    u.volume = 1;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

async function addFrameToPhoto(
  photoDataUrl: string,
  pokemon: PokemonAction,
  pokemonSpriteUrl: string
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(photoDataUrl); return; }

    const img = document.createElement('img');
    img.onload = () => {
      const pad = 24, bottom = 70;
      canvas.width = img.width + pad * 2;
      canvas.height = img.height + pad * 2 + bottom;

      const tc = TYPE_COLORS[pokemon.type];
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, tc.primary);
      grad.addColorStop(1, tc.secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'white';
      ctx.fillRect(pad - 4, pad - 4, img.width + 8, img.height + 8);
      ctx.drawImage(img, pad, pad);

      ctx.font = '32px Arial';
      ctx.fillText(tc.emoji, 8, 38);
      ctx.fillText(tc.emoji, canvas.width - 42, 38);

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, canvas.height - bottom, canvas.width, bottom);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 26px "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `I posed like ${pokemon.name}! ${pokemon.emoji}`,
        canvas.width / 2, canvas.height - bottom / 2
      );

      const spriteImg = document.createElement('img');
      spriteImg.crossOrigin = 'anonymous';
      spriteImg.onload = () => {
        const s = 100, sx = canvas.width - s - 12, sy = canvas.height - bottom - s - 12;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(sx + s / 2, sy + s / 2, s / 2 + 4, 0, Math.PI * 2);
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

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Home() {
  // ----------------------------------------------------------
  // Game state
  // ----------------------------------------------------------
  const [gameState, setGameState] = useState<GameState>('title');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [config, setConfig] = useState<DifficultyConfig>(DIFFICULTY_CONFIGS.normal);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(1);
  const [currentTimer, setCurrentTimer] = useState(5);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Sequence state
  const [sequence, setSequence] = useState<SequenceAction[]>([]);
  const [watchIndex, setWatchIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [countdownTime, setCountdownTime] = useState(3);

  const [capturedPoses, setCapturedPoses] = useState<CapturedPose[]>([]);
  const [showCapturedPose, setShowCapturedPose] = useState(false);
  const [latestPose, setLatestPose] = useState<CapturedPose | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const [showPokedex, setShowPokedex] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [streakPopup, setStreakPopup] = useState<string | null>(null);
  const [resultFlash, setResultFlash] = useState<'correct' | 'wrong' | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [newCatches, setNewCatches] = useState<PokemonAction[]>([]);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [sequenceIntro, setSequenceIntro] = useState(false); // "WATCH!" banner

  // Derived display values
  const displayIdx = gameState === 'watching' ? watchIndex : actionIndex;
  const displayAction = sequence[displayIdx] ?? null;
  const displayPokemon = displayAction?.pokemon ?? null;
  const displayImageUrl = displayAction?.imageUrl ?? '';
  const isBossRound = displayAction?.isBoss ?? false;
  const isMultiAction = sequence.length > 1;

  // ----------------------------------------------------------
  // Refs
  // ----------------------------------------------------------
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const previousFrameRef = useRef<ImageData | null>(null);
  const motionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const motionCountRef = useRef(0);
  const totalMotionRef = useRef(0);
  const motionDetectedRef = useRef(false);
  const simonSaysRef = useRef(true);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capturedPokemonIdsRef = useRef<Set<number>>(new Set());

  // Stable refs for values used in async flows
  const sequenceRef = useRef<SequenceAction[]>([]);
  const actionIndexRef = useRef(0);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const roundRef = useRef(1);
  const currentTimerRef = useRef(5);
  const configRef = useRef(config);
  const difficultyRef = useRef(difficulty);
  const livesRef = useRef(3);

  // Keep refs synced
  useEffect(() => { sequenceRef.current = sequence; }, [sequence]);
  useEffect(() => { actionIndexRef.current = actionIndex; }, [actionIndex]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { bestStreakRef.current = bestStreak; }, [bestStreak]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { currentTimerRef.current = currentTimer; }, [currentTimer]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  // Motion thresholds
  const MOTION_THRESHOLD_SIMON = 12;
  const MOTION_THRESHOLD_NO_SIMON = 25;
  const CONSECUTIVE_NEEDED_SIMON = 1;
  const CONSECUTIVE_NEEDED_NO_SIMON = 2;
  const TOTAL_NEEDED_SIMON = 2;
  const TOTAL_NEEDED_NO_SIMON = 4;

  // ----------------------------------------------------------
  // Camera
  // ----------------------------------------------------------
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      alert('Camera access needed to play!');
    }
  }, []);

  useEffect(() => {
    if (streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  // ----------------------------------------------------------
  // Motion detection
  // ----------------------------------------------------------
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
      diff += (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2])) / 3;
    }
    const avgDiff = diff / (d1.length / 4);
    previousFrameRef.current = currentFrame;

    const threshold = simonSaysRef.current ? MOTION_THRESHOLD_SIMON : MOTION_THRESHOLD_NO_SIMON;
    return avgDiff > threshold;
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
      if (moving) { motionCountRef.current++; totalMotionRef.current++; }
      else { motionCountRef.current = 0; }

      const consNeeded = simonSaysRef.current ? CONSECUTIVE_NEEDED_SIMON : CONSECUTIVE_NEEDED_NO_SIMON;
      const sustained = motionCountRef.current >= consNeeded;
      setIsMoving(sustained);

      const totalNeeded = simonSaysRef.current ? TOTAL_NEEDED_SIMON : TOTAL_NEEDED_NO_SIMON;
      if (sustained || totalMotionRef.current >= totalNeeded) {
        motionDetectedRef.current = true;
      }
    }, 150);
  }, [detectMotion, stopMotionDetection]);

  // ----------------------------------------------------------
  // Photo capture
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // Type-themed confetti
  // ----------------------------------------------------------
  const fireConfetti = useCallback((pokemonType: string, intensity = 1) => {
    const ts = TYPE_COLORS[pokemonType as keyof typeof TYPE_COLORS];
    const colors = ts ? [ts.primary, ts.secondary, '#FFD700'] : ['#FFD700', '#FF6B6B', '#4ECDC4'];
    confetti({ particleCount: Math.round(80 * intensity), spread: 60 + 20 * intensity, origin: { y: 0.6 }, colors });
  }, []);

  // ----------------------------------------------------------
  // Handle action end (one action within a sequence)
  // ----------------------------------------------------------
  const handleActionEnd = useCallback(async () => {
    stopMotionDetection();
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    setShowHint(false);

    const seq = sequenceRef.current;
    const idx = actionIndexRef.current;
    const action = seq[idx];
    if (!action) return;

    const wasSimonSays = action.simonSays;
    const hadMotion = motionDetectedRef.current;
    const correct = wasSimonSays ? hadMotion : !hadMotion;

    if (correct) {
      // Score
      const points = action.isBoss ? POINTS_BOSS : POINTS_REGULAR;
      const newStreak = streakRef.current + 1;
      let bonusPoints = 0;

      setStreak(newStreak);
      if (newStreak > bestStreakRef.current) setBestStreak(newStreak);

      const bonus = getStreakBonus(newStreak);
      if (bonus) {
        bonusPoints = bonus.points;
        sounds.streak(newStreak);
        setStreakPopup(`${bonus.emoji} ${bonus.label} +${bonus.points}`);
        setTimeout(() => setStreakPopup(null), 1500);
        if (bonus.extraLife) { sounds.extraLife(); setLives(prev => prev + 1); }
      }

      setScore(prev => prev + points + bonusPoints);
      setResultFlash('correct');
      sounds.success();
      fireConfetti(action.pokemon.type, action.isBoss ? 2 : 1);

      if (action.isBoss) {
        sounds.bossDefeated();
        setTimeout(() => fireConfetti(action.pokemon.type, 1.5), 300);
      }

      // Pokemon cry
      sounds.pokemonCry(action.pokemon.id);

      // Photo — one per character per game
      if (wasSimonSays && !capturedPokemonIdsRef.current.has(action.pokemon.id)) {
        capturedPokemonIdsRef.current.add(action.pokemon.id);
        const photoData = capturePhoto();
        if (photoData) {
          const framedPhoto = await addFrameToPhoto(photoData, action.pokemon, action.imageUrl);
          const pose: CapturedPose = {
            imageData: photoData, framedImageData: framedPhoto,
            pokemonName: action.pokemon.name, pokemonEmoji: action.pokemon.emoji,
            action: action.pokemon.action, pokemonId: action.pokemon.id,
            pokemonType: action.pokemon.type,
          };
          setCapturedPoses(prev => [...prev, pose]);
          setLatestPose(pose);
          setShowCapturedPose(true);
          setTimeout(() => setShowCapturedPose(false), 1200);
        }
        const isFirstCatch = catchPokemon(action.pokemon.id);
        if (isFirstCatch) setNewCatches(prev => [...prev, action.pokemon]);
      }

      // More actions in this sequence?
      if (idx < seq.length - 1) {
        // Advance to next action in sequence
        setTimeout(() => {
          setResultFlash(null);
          const nextIdx = idx + 1;
          setActionIndex(nextIdx);
          actionIndexRef.current = nextIdx;
          simonSaysRef.current = seq[nextIdx].simonSays;
          motionDetectedRef.current = false;
          setIsMoving(false);
          previousFrameRef.current = null;
          setTimeLeft(currentTimerRef.current);
          startMotionDetection();
          // No hints during multi-action (must remember!)
        }, 800);
      } else {
        // Sequence complete — speed check + next round
        const cfg = configRef.current;
        const rd = roundRef.current;
        if (rd > 0 && rd % cfg.speedIncreaseEvery === 0) {
          setCurrentTimer(prev => Math.max(cfg.minTimer, prev - cfg.speedDecrease));
          sounds.speedUp();
        }
        setRound(prev => prev + 1);
        setTimeout(() => {
          setResultFlash(null);
          setGameState('between');
          setCountdownTime(2);
        }, 800);
      }
    } else {
      // Wrong — lose a life, abandon rest of sequence
      sounds.fail();
      setResultFlash('wrong');
      setShakeScreen(true);
      setStreak(0);
      setTimeout(() => setShakeScreen(false), 500);

      const newLives = livesRef.current - 1;
      setLives(newLives);

      if (newLives <= 0) {
        setTimeout(() => {
          setResultFlash(null);
          const isNew = addHighScore(difficultyRef.current, scoreRef.current, roundRef.current);
          setIsNewHighScore(isNew);
          setGameState('gameover');
        }, 1000);
      } else {
        sounds.loseLife();
        setTimeout(() => {
          setResultFlash(null);
          setGameState('between');
          setCountdownTime(2);
        }, 1000);
      }
    }
  }, [stopMotionDetection, startMotionDetection, capturePhoto, fireConfetti]);

  // ----------------------------------------------------------
  // Build and start a new sequence
  // ----------------------------------------------------------
  const startNewSequence = useCallback(async () => {
    stopMotionDetection();
    motionDetectedRef.current = false;
    setIsMoving(false);
    setShowHint(false);
    previousFrameRef.current = null;

    const rd = roundRef.current;
    const diff = difficultyRef.current;
    const cfg = configRef.current;

    // Boss?
    const isBoss = rd > 1 && rd % cfg.bossEvery === 0;

    // Sequence length (boss rounds are always 1)
    const seqLen = isBoss ? 1 : getSequenceLength(rd, diff);

    // Speech rate (gets faster each round)
    const rate = getSpeechRate(rd, diff);

    // Build sequence actions
    const actions: SequenceAction[] = [];
    for (let i = 0; i < seqLen; i++) {
      const pokemon = isBoss ? getRandomBoss() : getRandomPokemon();
      const imageUrl = await fetchPokemonImage(pokemon.id);
      const isTrick = !isBoss && Math.random() < cfg.trickChance;
      actions.push({ pokemon, imageUrl, simonSays: !isTrick, isBoss });
    }

    setSequence(actions);
    sequenceRef.current = actions;
    setWatchIndex(0);
    setActionIndex(0);
    actionIndexRef.current = 0;

    // Show sequence intro banner for multi-action
    if (seqLen > 1) {
      setSequenceIntro(true);
      await speak('Watch carefully!', rate);
      await delay(300);
      setSequenceIntro(false);
    }

    // Boss announcement
    if (isBoss) {
      sounds.bossAppear();
      await speak('Boss round!', rate);
      await delay(400);
    }

    // Enter watching phase — the effect will drive it
    setGameState('watching');
  }, [stopMotionDetection]);

  // ----------------------------------------------------------
  // Watching phase — show each command in sequence
  // ----------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'watching') return;
    const seq = sequenceRef.current;
    const action = seq[watchIndex];
    if (!action) return;

    let aborted = false;
    const rate = getSpeechRate(roundRef.current, difficultyRef.current);

    (async () => {
      // Pokemon cry
      sounds.pokemonCry(action.pokemon.id);
      await delay(500);
      if (aborted) return;

      // Speak command
      const cmd = action.simonSays
        ? `Simon says... ${action.pokemon.action} like ${action.pokemon.name}!`
        : `${action.pokemon.action} like ${action.pokemon.name}!`;
      await speak(cmd, rate);
      if (aborted) return;

      await delay(300);
      if (aborted) return;

      // Advance or transition to playing
      if (watchIndex < seq.length - 1) {
        setWatchIndex(prev => prev + 1);
      } else {
        // Done watching
        if (seq.length > 1) {
          await speak('Your turn!', rate);
          if (aborted) return;
          await delay(200);
          if (aborted) return;
        }

        // Start performing first action
        setActionIndex(0);
        actionIndexRef.current = 0;
        simonSaysRef.current = seq[0].simonSays;
        setTimeLeft(currentTimerRef.current);
        startMotionDetection();
        setGameState('playing');

        // Hints only for single-action sequences
        const cfg = configRef.current;
        if (seq.length === 1) {
          if (cfg.hintDelay === 0) {
            setShowHint(true);
          } else if (cfg.hintDelay < Infinity) {
            hintTimerRef.current = setTimeout(() => setShowHint(true), cfg.hintDelay * 1000);
          }
        }
      }
    })();

    return () => { aborted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, watchIndex, startMotionDetection]);

  // ----------------------------------------------------------
  // Timer tick (playing only)
  // ----------------------------------------------------------
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(prev => prev - 0.1), 100);
      return () => clearTimeout(t);
    }
    if (gameState === 'playing' && timeLeft <= 0) {
      handleActionEnd();
    }
  }, [gameState, timeLeft, handleActionEnd]);

  // ----------------------------------------------------------
  // Countdown (between rounds)
  // ----------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'countdown' && gameState !== 'between') return;
    if (countdownTime > 1) {
      sounds.countdown();
      const t = setTimeout(() => setCountdownTime(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    }
    if (countdownTime === 1) {
      const t = setTimeout(() => {
        setCountdownTime(0);
        sounds.countdownGo();
        startNewSequence();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [gameState, countdownTime, startNewSequence]);

  // ----------------------------------------------------------
  // Start game
  // ----------------------------------------------------------
  const startGame = useCallback(async (diff: Difficulty) => {
    const cfg = DIFFICULTY_CONFIGS[diff];
    setDifficulty(diff);
    difficultyRef.current = diff;
    setConfig(cfg);
    configRef.current = cfg;
    saveLastDifficulty(diff);

    setScore(0); scoreRef.current = 0;
    setLives(cfg.lives); livesRef.current = cfg.lives;
    setRound(1); roundRef.current = 1;
    setCurrentTimer(cfg.timer); currentTimerRef.current = cfg.timer;
    setStreak(0); streakRef.current = 0;
    setBestStreak(0); bestStreakRef.current = 0;
    setSequence([]); sequenceRef.current = [];
    setCapturedPoses([]);
    setLatestPose(null);
    setNewCatches([]);
    setIsNewHighScore(false);
    capturedPokemonIdsRef.current = new Set();
    setGameStarted(true);

    if (!cameraReady) {
      setGameState('countdown');
      setCountdownTime(99);
      await speak('Starting camera...');
      await initCamera();
      await delay(500);
    }

    setGameState('countdown');
    setCountdownTime(3);
    speak('Get ready!');
  }, [cameraReady, initCamera]);

  // ----------------------------------------------------------
  // Skip
  // ----------------------------------------------------------
  const handleSkip = () => {
    sounds.click();
    stopMotionDetection();
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    setShowHint(false);
    setGameState('between');
    setCountdownTime(2);
  };

  // ----------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------
  useEffect(() => {
    return () => {
      stopMotionDetection();
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [stopMotionDetection]);

  // ============================================================
  // RENDER
  // ============================================================

  const showCamera = gameState !== 'title' && gameState !== 'gameover' && gameStarted;
  const isActive = gameState === 'playing' || gameState === 'watching';
  const typeStyle = displayPokemon ? TYPE_COLORS[displayPokemon.type] : null;

  return (
    <motion.div
      animate={shakeScreen ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
      transition={{ duration: 0.5 }}
      className="min-h-[100dvh] bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center overflow-hidden relative"
    >
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={motionCanvasRef} style={{ display: 'none' }} />

      {/* =============== CAMERA LAYER =============== */}
      {gameStarted && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-300 ${showCamera ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="w-full max-w-lg mx-auto h-[100dvh] py-2 px-2 flex flex-col">
            <div style={{ height: '160px', flexShrink: 0 }} />

            <div className="flex-1 min-h-0 relative mb-2">
              <motion.div
                className="relative w-full h-full rounded-2xl overflow-hidden"
                animate={{
                  boxShadow: gameState === 'playing'
                    ? isMoving
                      ? '0 0 30px 8px rgba(239, 68, 68, 0.7)'
                      : '0 0 30px 8px rgba(34, 197, 94, 0.7)'
                    : '0 0 15px 4px rgba(255, 255, 255, 0.2)',
                }}
              >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="w-full h-full object-cover rounded-2xl"
                />

                {/* Type glow */}
                {isActive && typeStyle && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded-2xl"
                    style={{
                      background: `radial-gradient(ellipse at center, ${typeStyle.glow} 0%, transparent 70%)`,
                      opacity: 0.3,
                    }}
                  />
                )}

                {/* Motion indicator (playing only) */}
                {gameState === 'playing' && (
                  <div
                    className="absolute top-2 right-2 px-3 py-1 rounded-full font-black text-sm"
                    style={{
                      backgroundColor: isMoving ? 'rgba(239,68,68,0.9)' : 'rgba(34,197,94,0.9)',
                      color: 'white',
                    }}
                  >
                    {isMoving ? 'MOVING' : 'STILL'}
                  </div>
                )}

                {/* Result flash */}
                <AnimatePresence>
                  {resultFlash && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 rounded-2xl"
                      style={{ backgroundColor: resultFlash === 'correct' ? '#22c55e' : '#ef4444' }}
                    />
                  )}
                </AnimatePresence>

                {/* Countdown overlays */}
                {(gameState === 'countdown' || gameState === 'between') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                    <div className="text-center">
                      <div className="text-xl font-black text-white mb-2">
                        {gameState === 'countdown' ? 'GET READY!' : 'NEXT ROUND...'}
                      </div>
                      <motion.div
                        key={countdownTime}
                        initial={{ scale: 3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-7xl font-black text-yellow-300"
                      >
                        {countdownTime > 0 ? countdownTime : 'GO!'}
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Watching overlay */}
                {gameState === 'watching' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                      {sequenceIntro ? (
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                          className="text-3xl font-black text-yellow-300"
                        >
                          WATCH CAREFULLY!
                        </motion.div>
                      ) : (
                        <>
                          {isBossRound && (
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                              className="text-xl font-black text-yellow-300 mb-2"
                            >
                              BOSS ROUND!
                            </motion.div>
                          )}
                          <div className="text-2xl font-black text-white">
                            {isMultiAction ? `LISTEN... (${watchIndex + 1}/${sequence.length})` : 'Listen...'}
                          </div>
                        </>
                      )}
                    </motion.div>
                  </div>
                )}

                {/* Captured pose flash */}
                <AnimatePresence>
                  {showCapturedPose && latestPose && (
                    <motion.div
                      initial={{ opacity: 0, scale: 1.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"
                    >
                      <div className="text-3xl font-black text-white text-center">
                        GREAT {latestPose.action}!
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Camera loading */}
                {!cameraReady && gameStarted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white text-lg font-bold">
                    Starting Camera...
                  </div>
                )}
              </motion.div>
            </div>

            <div style={{ height: '50px', flexShrink: 0 }} />
          </div>
        </div>
      )}

      {/* =============== UI OVERLAY =============== */}
      <AnimatePresence mode="wait">
        {/* TITLE */}
        {gameState === 'title' && (
          <TitleScreen
            onStart={startGame}
            onOpenPokedex={() => setShowPokedex(true)}
          />
        )}

        {/* GAMEPLAY HUD */}
        {showCamera && (
          <motion.div
            key="game-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg mx-auto flex flex-col h-[100dvh] py-2 px-2 z-10 pointer-events-none"
          >
            {/* Top bar */}
            <div className="flex justify-between items-center mb-1">
              <div className="bg-blue-900/60 backdrop-blur px-3 py-1 rounded-2xl flex items-center gap-2 text-white">
                <span className="text-xs font-bold">SCORE</span>
                <span className="text-xl font-black">{score}</span>
              </div>

              {streak >= 2 && (
                <motion.div
                  key={streak}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-orange-500/80 backdrop-blur px-3 py-1 rounded-2xl text-white"
                >
                  <span className="text-xs font-bold">STREAK </span>
                  <span className="text-lg font-black">{streak}</span>
                </motion.div>
              )}

              <div className="bg-black/40 backdrop-blur px-3 py-1 rounded-2xl text-lg">
                {'❤️'.repeat(Math.min(lives, 10))}
              </div>
            </div>

            {/* Round + sequence indicator */}
            <div className="text-center text-white/70 text-xs font-bold mb-1">
              ROUND {round}
              {isBossRound && <span className="text-yellow-300 ml-1">BOSS!</span>}
              {isMultiAction && gameState === 'playing' && (
                <span className="text-cyan-300 ml-1">
                  ACTION {actionIndex + 1}/{sequence.length}
                </span>
              )}
            </div>

            {/* Timer bar (playing only) */}
            {gameState === 'playing' && (
              <div className="bg-gray-200/30 rounded-full h-2.5 overflow-hidden mb-2">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: `${Math.max(0, (timeLeft / currentTimer) * 100)}%` }}
                  style={{
                    backgroundColor:
                      timeLeft < currentTimer * 0.3 ? '#ef4444' :
                      timeLeft < currentTimer * 0.6 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
            )}

            {/* Command card */}
            {(gameState === 'playing' || gameState === 'watching') && displayPokemon && (
              <motion.div
                key={`${displayPokemon.id}-${displayIdx}`}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="rounded-2xl p-3 shadow-lg mb-2"
                style={{
                  backgroundColor: isBossRound ? 'rgba(255,215,0,0.95)' : 'rgba(255,255,255,0.95)',
                  border: isBossRound ? '3px solid #B8860B' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  {displayImageUrl && (
                    <motion.div
                      className="relative w-16 h-16 flex-shrink-0"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Image
                        src={displayImageUrl}
                        alt={displayPokemon.name}
                        fill
                        style={{ objectFit: 'contain' }}
                        unoptimized
                      />
                    </motion.div>
                  )}
                  <div className="flex-1 min-w-0">
                    {isBossRound && (
                      <div className="text-xs font-black text-yellow-700">LEGENDARY!</div>
                    )}
                    {isMultiAction && gameState === 'watching' && (
                      <div className="text-xs font-black text-blue-600">
                        {watchIndex + 1} of {sequence.length}
                      </div>
                    )}
                    {isMultiAction && gameState === 'playing' && (
                      <div className="text-xs font-black text-purple-600">
                        PERFORM {actionIndex + 1} of {sequence.length}
                      </div>
                    )}
                    <div className="text-xl font-black text-purple-900 leading-tight">
                      {displayPokemon.emoji} {displayPokemon.action}
                    </div>
                    <div className="text-sm font-bold text-gray-500">like {displayPokemon.name}!</div>

                    {/* Hint — single-action only, based on difficulty delay */}
                    {showHint && gameState === 'playing' && !isMultiAction && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`text-xs font-bold mt-0.5 ${
                          sequence[actionIndex]?.simonSays ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {sequence[actionIndex]?.simonSays ? 'MOVE!' : 'STAY STILL!'}
                      </motion.div>
                    )}

                    {/* Memory reminder for multi-action */}
                    {isMultiAction && gameState === 'playing' && (
                      <div className="text-xs font-bold text-gray-400 mt-0.5">
                        Remember what you heard!
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Streak popup */}
            <AnimatePresence>
              {streakPopup && (
                <motion.div
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="text-center mb-2"
                >
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-lg px-4 py-1.5 rounded-full shadow-lg">
                    {streakPopup}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1" />

            {/* Skip button */}
            {(gameState === 'playing' || gameState === 'watching') && (
              <div className="flex justify-center gap-3 pointer-events-auto">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSkip}
                  className="bg-orange-500 active:bg-orange-600 text-white text-base font-black px-5 py-2 rounded-full shadow-lg"
                >
                  SKIP
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* GAME OVER */}
        {gameState === 'gameover' && (
          <GameOverScreen
            score={score}
            round={round}
            streak={bestStreak}
            capturedPoses={capturedPoses}
            newCatches={newCatches}
            isNewHighScore={isNewHighScore}
            onPlayAgain={() => startGame(difficulty)}
            onTitleScreen={() => setGameState('title')}
            onOpenPokedex={() => setShowPokedex(true)}
          />
        )}
      </AnimatePresence>

      {/* =============== POKEDEX OVERLAY =============== */}
      <Pokedex open={showPokedex} onClose={() => setShowPokedex(false)} />
    </motion.div>
  );
}
