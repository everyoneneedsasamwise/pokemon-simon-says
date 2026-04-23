'use client';

import { motion } from 'framer-motion';
import { sounds } from '../lib/sounds';
import { type PokemonAction, TYPE_COLORS } from '../lib/pokemon';
import { useEffect, useState } from 'react';

interface CapturedPose {
  imageData: string;
  framedImageData: string;
  pokemonName: string;
  pokemonEmoji: string;
  action: string;
  pokemonId: number;
  pokemonType: string;
}

interface GameOverScreenProps {
  score: number;
  round: number;
  streak: number;
  capturedPoses: CapturedPose[];
  newCatches: PokemonAction[];
  isNewHighScore: boolean;
  onPlayAgain: () => void;
  onTitleScreen: () => void;
  onOpenPokedex: () => void;
}

function downloadPhoto(imageData: string, name: string) {
  const link = document.createElement('a');
  link.href = imageData;
  link.download = `pokemon-simon-says-${name.toLowerCase()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadAllPhotos(poses: CapturedPose[]) {
  poses.forEach((pose, i) => {
    setTimeout(() => downloadPhoto(pose.framedImageData, `${pose.pokemonName}-${i + 1}`), i * 300);
  });
}

async function sharePhoto(imageData: string, name: string) {
  try {
    const response = await fetch(imageData);
    const blob = await response.blob();
    const file = new File([blob], `pokemon-simon-says-${name.toLowerCase()}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `I posed like ${name}!`, text: `Check out my ${name} pose!`, files: [file] });
    } else {
      downloadPhoto(imageData, name);
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') downloadPhoto(imageData, name);
  }
}

export default function GameOverScreen({
  score, round, streak, capturedPoses, newCatches, isNewHighScore,
  onPlayAgain, onTitleScreen, onOpenPokedex,
}: GameOverScreenProps) {
  const [showHighScore, setShowHighScore] = useState(false);

  useEffect(() => {
    if (isNewHighScore) {
      const t = setTimeout(() => {
        setShowHighScore(true);
        sounds.newHighScore();
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isNewHighScore]);

  const rating = score >= 200 ? 'INCREDIBLE!' :
                 score >= 100 ? 'GREAT JOB!' :
                 score >= 50  ? 'NICE TRY!' : 'GAME OVER!';

  const ratingEmoji = score >= 200 ? '🏆' :
                      score >= 100 ? '🌟' :
                      score >= 50  ? '👍' : '😢';

  return (
    <motion.div
      key="gameover"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      className="text-center max-w-lg w-full p-4 overflow-y-auto max-h-[100dvh]"
    >
      {/* Rating */}
      <div className="text-6xl mb-2">{ratingEmoji}</div>
      <h2 className="text-4xl font-black text-white mb-1 drop-shadow-2xl">{rating}</h2>

      {/* New high score banner */}
      {showHighScore && (
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className="bg-yellow-400 text-yellow-900 font-black text-xl px-6 py-2 rounded-full mb-3 inline-block shadow-lg"
        >
          NEW HIGH SCORE!
        </motion.div>
      )}

      {/* Stats */}
      <div className="flex justify-center gap-3 mb-4">
        <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
          <div className="text-white/70 text-xs font-bold">SCORE</div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="text-3xl font-black text-yellow-300"
          >
            {score}
          </motion.div>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
          <div className="text-white/70 text-xs font-bold">ROUNDS</div>
          <div className="text-3xl font-black text-white">{round - 1}</div>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
          <div className="text-white/70 text-xs font-bold">BEST STREAK</div>
          <div className="text-3xl font-black text-orange-300">{streak}</div>
        </div>
      </div>

      {/* New Pokemon caught */}
      {newCatches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/90 rounded-2xl p-3 mb-4 shadow-xl"
        >
          <h3 className="text-lg font-black text-purple-900 mb-2">
            NEW POKEMON CAUGHT!
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {newCatches.map((p) => {
              const typeStyle = TYPE_COLORS[p.type];
              return (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.8, type: 'spring' }}
                  className="px-3 py-1 rounded-full font-bold text-white text-sm"
                  style={{ backgroundColor: typeStyle.primary }}
                >
                  {p.emoji} {p.name}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Photo gallery */}
      {capturedPoses.length > 0 && (
        <div className="bg-white/90 rounded-2xl p-3 mb-4 shadow-xl">
          <h3 className="text-lg font-black text-purple-900 mb-2">YOUR POSES!</h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => downloadAllPhotos(capturedPoses)}
            className="bg-blue-500 text-white text-sm font-black px-4 py-1.5 rounded-full shadow mb-3"
          >
            Download All
          </motion.button>
          <div className="grid grid-cols-2 gap-2">
            {capturedPoses.map((pose, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-purple-100 rounded-xl p-1.5 shadow"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pose.framedImageData} alt={`Pose ${i + 1}`} className="w-full rounded-lg mb-1" />
                <div className="text-xs font-bold text-purple-900">{pose.pokemonEmoji} {pose.pokemonName}</div>
                <div className="flex gap-1 justify-center mt-1">
                  <button onClick={() => downloadPhoto(pose.framedImageData, pose.pokemonName)} className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Save</button>
                  <button onClick={() => sharePhoto(pose.framedImageData, pose.pokemonName)} className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">Share</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { sounds.click(); onPlayAgain(); }}
          className="bg-green-500 text-white text-2xl font-black px-8 py-4 rounded-full shadow-xl border-4 border-green-700 w-full"
        >
          PLAY AGAIN!
        </motion.button>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { sounds.click(); onOpenPokedex(); }}
            className="bg-purple-500 text-white text-base font-black px-4 py-2 rounded-full shadow flex-1"
          >
            Pokedex
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { sounds.click(); onTitleScreen(); }}
            className="bg-white/30 text-white text-base font-black px-4 py-2 rounded-full shadow flex-1"
          >
            Menu
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export type { CapturedPose };
