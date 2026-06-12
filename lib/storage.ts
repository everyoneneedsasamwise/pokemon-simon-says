// ============================================================
// localStorage persistence for high scores and Pokedex
// ============================================================

import { type Difficulty, ALL_POKEMON } from './pokemon';

export interface PokedexEntry {
  caught: boolean;
  timesCaught: number;
  firstCaught: string;
}

export interface HighScoreEntry {
  score: number;
  round: number;
  date: string;
  difficulty: Difficulty;
}

export interface GameData {
  highScores: Record<Difficulty, HighScoreEntry[]>;
  pokedex: Record<number, PokedexEntry>;
  totalGamesPlayed: number;
  lastDifficulty: Difficulty;
}

const STORAGE_KEY = 'pokemon-simon-says-v2';
const MAX_HIGH_SCORES = 5;

function defaults(): GameData {
  return {
    highScores: { easy: [], normal: [], hard: [], master: [] },
    pokedex: {},
    totalGamesPlayed: 0,
    lastDifficulty: 'normal',
  };
}

export function loadGameData(): GameData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    const base = defaults();
    return {
      ...base,
      ...parsed,
      // Saved data from before the 'master' difficulty lacks its key
      highScores: { ...base.highScores, ...(parsed.highScores || {}) },
    };
  } catch {
    return defaults();
  }
}

export function saveGameData(data: GameData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

// ----------------------------------------------------------
// High scores
// ----------------------------------------------------------

export function addHighScore(
  difficulty: Difficulty,
  score: number,
  round: number
): boolean {
  const data = loadGameData();
  const list = data.highScores[difficulty];
  const lowestExisting = list.length >= MAX_HIGH_SCORES
    ? list[list.length - 1]?.score ?? 0
    : -1;

  const isNew = score > 0 && (list.length < MAX_HIGH_SCORES || score > lowestExisting);

  if (isNew) {
    list.push({ score, round, date: new Date().toISOString(), difficulty });
    list.sort((a, b) => b.score - a.score);
    data.highScores[difficulty] = list.slice(0, MAX_HIGH_SCORES);
  }

  data.totalGamesPlayed++;
  saveGameData(data);
  return isNew;
}

export function getHighScores(difficulty: Difficulty): HighScoreEntry[] {
  return loadGameData().highScores[difficulty];
}

export function getTopScore(difficulty: Difficulty): number {
  const scores = getHighScores(difficulty);
  return scores[0]?.score ?? 0;
}

// ----------------------------------------------------------
// Pokedex
// ----------------------------------------------------------

export function catchPokemon(pokemonId: number): boolean {
  const data = loadGameData();
  const existing = data.pokedex[pokemonId];
  const isFirstCatch = !existing?.caught;

  data.pokedex[pokemonId] = {
    caught: true,
    timesCaught: (existing?.timesCaught ?? 0) + 1,
    firstCaught: existing?.firstCaught ?? new Date().toISOString(),
  };

  saveGameData(data);
  return isFirstCatch;
}

export function getPokedexData(): Record<number, PokedexEntry> {
  return loadGameData().pokedex;
}

export function getPokedexProgress(): { caught: number; total: number } {
  const data = loadGameData();
  const caught = Object.values(data.pokedex).filter(p => p.caught).length;
  return { caught, total: ALL_POKEMON.length };
}

// ----------------------------------------------------------
// Preferences
// ----------------------------------------------------------

export function saveLastDifficulty(difficulty: Difficulty): void {
  const data = loadGameData();
  data.lastDifficulty = difficulty;
  saveGameData(data);
}

export function getLastDifficulty(): Difficulty {
  return loadGameData().lastDifficulty;
}
