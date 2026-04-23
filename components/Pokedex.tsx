'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ALL_POKEMON, TYPE_COLORS, type PokemonAction } from '../lib/pokemon';
import { getPokedexData, type PokedexEntry } from '../lib/storage';
import { sounds } from '../lib/sounds';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PokedexProps {
  open: boolean;
  onClose: () => void;
}

export default function Pokedex({ open, onClose }: PokedexProps) {
  const [pokedex, setPokedex] = useState<Record<number, PokedexEntry>>({});
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonAction | null>(null);
  const [spriteUrls, setSpriteUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open) setPokedex(getPokedexData());
  }, [open]);

  // Lazy-load sprites for caught Pokemon
  useEffect(() => {
    const caught = ALL_POKEMON.filter(p => pokedex[p.id]?.caught);
    caught.forEach(async (p) => {
      if (spriteUrls[p.id]) return;
      try {
        const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
        const d = await r.json();
        const url = d.sprites.other['official-artwork'].front_default;
        if (url) setSpriteUrls(prev => ({ ...prev, [p.id]: url }));
      } catch { /* ignore */ }
    });
  }, [pokedex, spriteUrls]);

  const caught = Object.values(pokedex).filter(p => p.caught).length;
  const total = ALL_POKEMON.length;
  const pct = total > 0 ? Math.round((caught / total) * 100) : 0;

  const regulars = ALL_POKEMON.filter(p => !p.legendary);
  const legendaries = ALL_POKEMON.filter(p => p.legendary);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => { setSelectedPokemon(null); onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-3xl p-4 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl border-4 border-red-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-black text-white">POKEDEX</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { sounds.click(); onClose(); }}
                className="bg-white/20 text-white font-black w-8 h-8 rounded-full text-lg"
              >
                X
              </motion.button>
            </div>

            {/* Progress bar */}
            <div className="bg-black/30 rounded-xl p-2 mb-4">
              <div className="flex justify-between text-sm text-white/80 font-bold mb-1">
                <span>{caught}/{total} caught</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full bg-black/30 rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="bg-green-400 h-3 rounded-full"
                />
              </div>
            </div>

            {/* Pokemon detail overlay */}
            <AnimatePresence>
              {selectedPokemon && pokedex[selectedPokemon.id]?.caught && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-xl p-3 mb-3 overflow-hidden"
                >
                  <div className="flex items-center gap-3">
                    {spriteUrls[selectedPokemon.id] && (
                      <div className="relative w-20 h-20">
                        <Image
                          src={spriteUrls[selectedPokemon.id]}
                          alt={selectedPokemon.name}
                          fill
                          style={{ objectFit: 'contain' }}
                          unoptimized
                        />
                      </div>
                    )}
                    <div>
                      <div className="font-black text-lg text-gray-900">
                        {selectedPokemon.emoji} {selectedPokemon.name}
                        {selectedPokemon.legendary && <span className="text-yellow-500 ml-1">LEGENDARY</span>}
                      </div>
                      <div className="text-sm text-gray-600">
                        Action: {selectedPokemon.action}
                      </div>
                      <div className="text-sm text-gray-600">
                        Caught {pokedex[selectedPokemon.id]?.timesCaught ?? 0}x
                      </div>
                      <span
                        className="inline-block text-xs font-bold text-white px-2 py-0.5 rounded-full mt-1"
                        style={{ backgroundColor: TYPE_COLORS[selectedPokemon.type].primary }}
                      >
                        {TYPE_COLORS[selectedPokemon.type].emoji} {selectedPokemon.type}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Regular Pokemon grid */}
            <h3 className="text-sm font-black text-white/80 mb-2">POKEMON</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {regulars.map((p) => {
                const isCaught = pokedex[p.id]?.caught;
                const typeStyle = TYPE_COLORS[p.type];
                return (
                  <motion.button
                    key={p.id}
                    whileTap={isCaught ? { scale: 0.95 } : undefined}
                    onClick={() => {
                      if (isCaught) {
                        sounds.click();
                        setSelectedPokemon(selectedPokemon?.id === p.id ? null : p);
                      }
                    }}
                    className="rounded-xl p-2 text-center transition-all relative overflow-hidden"
                    style={{
                      backgroundColor: isCaught ? typeStyle.primary : 'rgba(0,0,0,0.3)',
                      opacity: isCaught ? 1 : 0.5,
                    }}
                  >
                    {isCaught && spriteUrls[p.id] ? (
                      <div className="relative w-12 h-12 mx-auto mb-1">
                        <Image
                          src={spriteUrls[p.id]}
                          alt={p.name}
                          fill
                          style={{ objectFit: 'contain' }}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center text-2xl opacity-30">
                        ?
                      </div>
                    )}
                    <div className="text-xs font-black text-white truncate">
                      {isCaught ? p.name : '???'}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Legendary Pokemon */}
            <h3 className="text-sm font-black text-yellow-300 mb-2">LEGENDARY</h3>
            <div className="grid grid-cols-3 gap-2">
              {legendaries.map((p) => {
                const isCaught = pokedex[p.id]?.caught;
                const typeStyle = TYPE_COLORS[p.type];
                return (
                  <motion.button
                    key={p.id}
                    whileTap={isCaught ? { scale: 0.95 } : undefined}
                    onClick={() => {
                      if (isCaught) {
                        sounds.click();
                        setSelectedPokemon(selectedPokemon?.id === p.id ? null : p);
                      }
                    }}
                    className="rounded-xl p-2 text-center relative overflow-hidden"
                    style={{
                      backgroundColor: isCaught ? typeStyle.primary : 'rgba(0,0,0,0.3)',
                      opacity: isCaught ? 1 : 0.5,
                      border: isCaught ? '2px solid rgba(255,215,0,0.7)' : '2px solid transparent',
                    }}
                  >
                    {isCaught && spriteUrls[p.id] ? (
                      <div className="relative w-12 h-12 mx-auto mb-1">
                        <Image
                          src={spriteUrls[p.id]}
                          alt={p.name}
                          fill
                          style={{ objectFit: 'contain' }}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center text-2xl opacity-30">
                        ?
                      </div>
                    )}
                    <div className="text-xs font-black text-white truncate">
                      {isCaught ? p.name : '???'}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
