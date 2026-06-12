'use client';

import { motion } from 'framer-motion';
import { type Difficulty, DIFFICULTY_CONFIGS } from '../lib/pokemon';
import { getTopScore, getPokedexProgress, getLastDifficulty } from '../lib/storage';
import { sounds } from '../lib/sounds';
import { useState, useEffect } from 'react';

interface TitleScreenProps {
  onStart: (difficulty: Difficulty) => void;
  onOpenPokedex: () => void;
}

export default function TitleScreen({ onStart, onOpenPokedex }: TitleScreenProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [topScore, setTopScore] = useState(0);
  const [pokedexProgress, setPokedexProgress] = useState({ caught: 0, total: 24 });

  useEffect(() => {
    setSelectedDifficulty(getLastDifficulty());
  }, []);

  useEffect(() => {
    setTopScore(getTopScore(selectedDifficulty));
    setPokedexProgress(getPokedexProgress());
  }, [selectedDifficulty]);

  const config = DIFFICULTY_CONFIGS[selectedDifficulty];
  const progressPct = pokedexProgress.total > 0
    ? Math.round((pokedexProgress.caught / pokedexProgress.total) * 100)
    : 0;

  return (
    <motion.div
      key="title"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="text-center p-4 max-w-md mx-auto"
    >
      {/* Title */}
      <motion.h1
        className="text-5xl sm:text-7xl font-black text-white mb-2 drop-shadow-2xl"
        animate={{ scale: [1, 1.05, 1], rotate: [-2, 2, -2] }}
        transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
      >
        POKEMON
        <br />
        SIMON SAYS!
      </motion.h1>

      <p className="text-lg text-white/90 font-bold mb-6">
        Camera Motion Detection
      </p>

      {/* Difficulty selector */}
      <div className="bg-white/20 backdrop-blur rounded-2xl p-3 mb-4">
        <p className="text-white font-bold text-sm mb-2">DIFFICULTY</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((d) => {
            const c = DIFFICULTY_CONFIGS[d];
            const active = d === selectedDifficulty;
            return (
              <motion.button
                key={d}
                whileTap={{ scale: 0.95 }}
                onClick={() => { sounds.click(); setSelectedDifficulty(d); }}
                className="px-3 py-2 rounded-xl font-black text-sm transition-all"
                style={{
                  backgroundColor: active ? c.color : 'rgba(255,255,255,0.15)',
                  color: active ? 'white' : 'rgba(255,255,255,0.7)',
                  border: active ? '3px solid white' : '3px solid transparent',
                }}
              >
                {c.emoji} {c.label}
              </motion.button>
            );
          })}
        </div>
        <div className="text-white/70 text-xs mt-2">
          {config.lives} lives &bull; {config.timer}s timer
          {config.hintDelay === Infinity ? ' \u00b7 No hints!' : ''}
          {!config.showCardDuringPlay ? ' \u00b7 MEMORY ONLY \u2014 no card while you play!' : ''}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-4 justify-center">
        {/* High score */}
        <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 flex-1 max-w-[140px]">
          <div className="text-white/70 text-xs font-bold">BEST SCORE</div>
          <div className="text-2xl font-black text-yellow-300">
            {topScore > 0 ? topScore : '--'}
          </div>
        </div>

        {/* Pokedex progress */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { sounds.click(); onOpenPokedex(); }}
          className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 flex-1 max-w-[140px] text-left"
        >
          <div className="text-white/70 text-xs font-bold">POKEDEX</div>
          <div className="text-lg font-black text-white">
            {pokedexProgress.caught}/{pokedexProgress.total}
          </div>
          <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
            <div
              className="bg-green-400 h-1.5 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </motion.button>
      </div>

      {/* Start button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          sounds.click();
          sounds.unlock();
          onStart(selectedDifficulty);
        }}
        className="text-4xl font-black px-10 py-5 rounded-full shadow-2xl border-[6px] w-full max-w-xs"
        style={{
          backgroundColor: config.color,
          borderColor: 'rgba(255,255,255,0.5)',
          color: 'white',
        }}
      >
        START!
      </motion.button>
    </motion.div>
  );
}
