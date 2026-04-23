// ============================================================
// Pokemon data, types, difficulty configs, and utilities
// ============================================================

export type PokemonType =
  | 'fire' | 'water' | 'electric' | 'psychic' | 'normal'
  | 'fighting' | 'ghost' | 'poison' | 'flying' | 'rock'
  | 'grass' | 'dragon' | 'ice';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface PokemonAction {
  id: number;
  name: string;
  action: string;
  emoji: string;
  type: PokemonType;
  legendary?: boolean;
}

export interface TypeStyle {
  primary: string;
  secondary: string;
  glow: string;
  emoji: string;
}

export interface DifficultyConfig {
  label: string;
  emoji: string;
  color: string;
  timer: number;
  minTimer: number;
  trickChance: number;
  speedIncreaseEvery: number;
  speedDecrease: number;
  lives: number;
  bossEvery: number;
  hintDelay: number; // seconds before trick hint shows (Infinity = never)
}

export interface StreakBonus {
  threshold: number;
  label: string;
  points: number;
  emoji: string;
  extraLife?: boolean;
}

// ----------------------------------------------------------
// Type colors & styles
// ----------------------------------------------------------
export const TYPE_COLORS: Record<PokemonType, TypeStyle> = {
  fire:     { primary: '#FF4500', secondary: '#FF8C00', glow: 'rgba(255,69,0,0.5)',   emoji: '🔥' },
  water:    { primary: '#1E90FF', secondary: '#00BFFF', glow: 'rgba(30,144,255,0.5)', emoji: '🌊' },
  electric: { primary: '#FFD700', secondary: '#FFFF00', glow: 'rgba(255,215,0,0.5)',  emoji: '⚡' },
  psychic:  { primary: '#9370DB', secondary: '#BA55D3', glow: 'rgba(147,112,219,0.5)',emoji: '🔮' },
  normal:   { primary: '#FFB6C1', secondary: '#FFC0CB', glow: 'rgba(255,182,193,0.5)',emoji: '⭐' },
  fighting: { primary: '#C62828', secondary: '#E53935', glow: 'rgba(198,40,40,0.5)',  emoji: '👊' },
  ghost:    { primary: '#483D8B', secondary: '#6A5ACD', glow: 'rgba(72,61,139,0.5)',  emoji: '👻' },
  poison:   { primary: '#7B1FA2', secondary: '#AB47BC', glow: 'rgba(123,31,162,0.5)', emoji: '☠️' },
  flying:   { primary: '#87CEEB', secondary: '#B0E0E6', glow: 'rgba(135,206,235,0.5)',emoji: '🦅' },
  rock:     { primary: '#A0522D', secondary: '#D2B48C', glow: 'rgba(160,82,45,0.5)',  emoji: '🪨' },
  grass:    { primary: '#228B22', secondary: '#66BB6A', glow: 'rgba(34,139,34,0.5)',  emoji: '🌿' },
  dragon:   { primary: '#4B0082', secondary: '#311B92', glow: 'rgba(75,0,130,0.5)',   emoji: '🐉' },
  ice:      { primary: '#00BCD4', secondary: '#80DEEA', glow: 'rgba(0,188,212,0.5)',  emoji: '❄️' },
};

// ----------------------------------------------------------
// Regular Pokemon (18)
// ----------------------------------------------------------
export const POKEMON_ACTIONS: PokemonAction[] = [
  { id: 68,  name: 'Machamp',    action: 'FLEX',           emoji: '💪', type: 'fighting' },
  { id: 143, name: 'Snorlax',    action: 'SLEEP',          emoji: '😴', type: 'normal' },
  { id: 25,  name: 'Pikachu',    action: 'LIGHTNING POSE', emoji: '⚡', type: 'electric' },
  { id: 6,   name: 'Charizard',  action: 'BREATHE FIRE',   emoji: '🔥', type: 'fire' },
  { id: 7,   name: 'Squirtle',   action: 'HIDE IN SHELL',  emoji: '🐢', type: 'water' },
  { id: 12,  name: 'Butterfree', action: 'FLY',            emoji: '🦋', type: 'flying' },
  { id: 39,  name: 'Jigglypuff', action: 'SING',           emoji: '💃', type: 'normal' },
  { id: 23,  name: 'Ekans',      action: 'SLITHER',        emoji: '🐍', type: 'poison' },
  { id: 107, name: 'Hitmonchan', action: 'PUNCH',          emoji: '👊', type: 'fighting' },
  { id: 150, name: 'Mewtwo',     action: 'MEDITATE',       emoji: '🧘', type: 'psychic' },
  { id: 78,  name: 'Rapidash',   action: 'RUN FAST',       emoji: '🏃', type: 'fire' },
  { id: 131, name: 'Lapras',     action: 'SURF',           emoji: '🌊', type: 'water' },
  { id: 94,  name: 'Gengar',     action: 'SNEAK',          emoji: '👻', type: 'ghost' },
  { id: 18,  name: 'Pidgeot',    action: 'SOAR',           emoji: '🦅', type: 'flying' },
  { id: 3,   name: 'Venusaur',   action: 'GROW TALL',      emoji: '🌿', type: 'grass' },
  { id: 130, name: 'Gyarados',   action: 'ROAR',           emoji: '🐉', type: 'dragon' },
  { id: 106, name: 'Hitmonlee',  action: 'SPIN',           emoji: '🤸', type: 'fighting' },
  { id: 95,  name: 'Onix',       action: 'STOMP',          emoji: '😤', type: 'rock' },
];

// ----------------------------------------------------------
// Boss / Legendary Pokemon (6)
// ----------------------------------------------------------
export const BOSS_POKEMON: PokemonAction[] = [
  { id: 144, name: 'Articuno',  action: 'ICE POSE',      emoji: '❄️', type: 'ice',      legendary: true },
  { id: 145, name: 'Zapdos',    action: 'THUNDER STRIKE',emoji: '⚡', type: 'electric',  legendary: true },
  { id: 146, name: 'Moltres',   action: 'FLAME WINGS',   emoji: '🔥', type: 'fire',      legendary: true },
  { id: 151, name: 'Mew',       action: 'FLOAT',         emoji: '✨', type: 'psychic',   legendary: true },
  { id: 249, name: 'Lugia',     action: 'DIVE',          emoji: '🌊', type: 'water',     legendary: true },
  { id: 250, name: 'Ho-Oh',     action: 'RAINBOW POSE',  emoji: '🌈', type: 'fire',      legendary: true },
];

export const ALL_POKEMON = [...POKEMON_ACTIONS, ...BOSS_POKEMON];

// ----------------------------------------------------------
// Difficulty settings
// ----------------------------------------------------------
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    emoji: '🟢',
    color: '#22c55e',
    timer: 7,
    minTimer: 4,
    trickChance: 0.15,
    speedIncreaseEvery: 7,
    speedDecrease: 0.4,
    lives: 5,
    bossEvery: 8,
    hintDelay: 0,       // hints shown immediately
  },
  normal: {
    label: 'Normal',
    emoji: '🟡',
    color: '#eab308',
    timer: 5,
    minTimer: 2.5,
    trickChance: 0.3,
    speedIncreaseEvery: 5,
    speedDecrease: 0.5,
    lives: 3,
    bossEvery: 10,
    hintDelay: 2,       // hints after 2 seconds
  },
  hard: {
    label: 'Hard',
    emoji: '🔴',
    color: '#ef4444',
    timer: 4,
    minTimer: 2,
    trickChance: 0.4,
    speedIncreaseEvery: 3,
    speedDecrease: 0.5,
    lives: 3,
    bossEvery: 10,
    hintDelay: Infinity, // no hints, listen only
  },
};

// ----------------------------------------------------------
// Streak bonuses
// ----------------------------------------------------------
export const STREAK_BONUSES: StreakBonus[] = [
  { threshold: 3,  label: 'Nice!',      points: 5,  emoji: '🔥' },
  { threshold: 5,  label: 'Amazing!',    points: 10, emoji: '⚡' },
  { threshold: 10, label: 'LEGENDARY!',  points: 25, emoji: '🌟', extraLife: true },
  { threshold: 15, label: 'UNSTOPPABLE!',points: 50, emoji: '💎' },
];

// ----------------------------------------------------------
// Scoring
// ----------------------------------------------------------
export const POINTS_REGULAR = 10;
export const POINTS_BOSS = 50;

// ----------------------------------------------------------
// Utilities
// ----------------------------------------------------------
export async function fetchPokemonImage(id: number): Promise<string> {
  try {
    const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const d = await r.json();
    return d.sprites.other['official-artwork'].front_default || '';
  } catch {
    return '';
  }
}

export function getRandomPokemon(): PokemonAction {
  return POKEMON_ACTIONS[Math.floor(Math.random() * POKEMON_ACTIONS.length)];
}

export function getRandomBoss(): PokemonAction {
  return BOSS_POKEMON[Math.floor(Math.random() * BOSS_POKEMON.length)];
}

export function getStreakBonus(streak: number): StreakBonus | null {
  // Return the highest threshold bonus that matches exactly
  for (let i = STREAK_BONUSES.length - 1; i >= 0; i--) {
    if (streak === STREAK_BONUSES[i].threshold) return STREAK_BONUSES[i];
  }
  return null;
}

// ----------------------------------------------------------
// Sequence length — grows with rounds, based on difficulty
// ----------------------------------------------------------
export function getSequenceLength(round: number, difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return round >= 10 ? 2 : 1;
    case 'normal':
      if (round >= 14) return 3;
      if (round >= 8) return 2;
      return 1;
    case 'hard':
      if (round >= 13) return 4;
      if (round >= 9) return 3;
      if (round >= 5) return 2;
      return 1;
  }
}

// ----------------------------------------------------------
// Speech rate — voice gets faster with rounds
// ----------------------------------------------------------
export function getSpeechRate(round: number, difficulty: Difficulty): number {
  const base = difficulty === 'easy' ? 1.0 : difficulty === 'normal' ? 1.1 : 1.2;
  const inc  = difficulty === 'easy' ? 0.025 : difficulty === 'normal' ? 0.035 : 0.045;
  return Math.min(2.2, base + (round - 1) * inc);
}
