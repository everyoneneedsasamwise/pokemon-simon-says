'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// Pokémon actions database
const POKEMON_ACTIONS = [
  { id: 68, name: 'Machamp', action: 'FLEX', emoji: '💪' },
  { id: 143, name: 'Snorlax', action: 'SLEEP', emoji: '😴' },
  { id: 25, name: 'Pikachu', action: 'LIGHTNING POSE', emoji: '⚡' },
  { id: 6, name: 'Charizard', action: 'BREATHE FIRE', emoji: '🔥' },
  { id: 7, name: 'Squirtle', action: 'HIDE IN SHELL', emoji: '🐢' },
  { id: 12, name: 'Butterfree', action: 'FLY', emoji: '🦋' },
  { id: 39, name: 'Jigglypuff', action: 'SING', emoji: '💃' },
  { id: 23, name: 'Ekans', action: 'SLITHER', emoji: '🐍' },
  { id: 107, name: 'Hitmonchan', action: 'PUNCH', emoji: '👊' },
  { id: 150, name: 'Mewtwo', action: 'MEDITATE', emoji: '🧘' },
  { id: 78, name: 'Rapidash', action: 'RUN FAST', emoji: '🏃' },
  { id: 131, name: 'Lapras', action: 'SURF', emoji: '🌊' },
  { id: 94, name: 'Gengar', action: 'SNEAK', emoji: '👻' },
  { id: 18, name: 'Pidgeot', action: 'SOAR', emoji: '🦅' },
  { id: 3, name: 'Venusaur', action: 'GROW TALL', emoji: '🌿' },
  { id: 130, name: 'Gyarados', action: 'ROAR', emoji: '🐉' },
  { id: 106, name: 'Hitmonlee', action: 'SPIN', emoji: '🤸' },
  { id: 95, name: 'Onix', action: 'STOMP', emoji: '😤' },
];

type GameState = 'title' | 'playing' | 'waiting' | 'gameover';

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(1);
  const [currentPokemon, setCurrentPokemon] = useState<typeof POKEMON_ACTIONS[0] | null>(null);
  const [simonSays, setSimonSays] = useState(true);
  const [timeLeft, setTimeLeft] = useState(5);
  const [pokemonImageUrl, setPokemonImageUrl] = useState('');
  const [speed, setSpeed] = useState(5); // seconds per round

  // Fetch Pokémon image
  const fetchPokemon = async (id: number) => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await response.json();
      return data.sprites.other['official-artwork'].front_default;
    } catch (error) {
      console.error('Error fetching Pokémon:', error);
      return '';
    }
  };

  // Speak command
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.3;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start new round
  const startNewRound = async () => {
    setGameState('playing');
    
    // Pick random Pokémon
    const randomPokemon = POKEMON_ACTIONS[Math.floor(Math.random() * POKEMON_ACTIONS.length)];
    setCurrentPokemon(randomPokemon);
    
    // Fetch image
    const imageUrl = await fetchPokemon(randomPokemon.id);
    setPokemonImageUrl(imageUrl);
    
    // 30% chance for trick round (no "Simon says")
    const isTrickRound = Math.random() > 0.7;
    setSimonSays(!isTrickRound);
    
    // Announce command
    const command = isTrickRound 
      ? `${randomPokemon.action} like ${randomPokemon.name}!`
      : `Simon says... ${randomPokemon.action} like ${randomPokemon.name}!`;
    
    setTimeout(() => speak(command), 500);
    
    // Start timer
    setTimeLeft(speed);
  };

  // Timer countdown
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 0.1), 100);
      return () => clearTimeout(timer);
    }
  }, [gameState, timeLeft]);

  // Handle answer
  const handleAnswer = (didAction: boolean) => {
    const correct = (simonSays && didAction) || (!simonSays && !didAction);
    
    if (correct) {
      // Correct answer!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      speak(Math.random() > 0.5 ? 'Great job!' : 'You got it!');
      setScore(score + 10);
      setRound(round + 1);
      
      // Increase speed every 5 rounds
      if (round % 5 === 0) {
        setSpeed(Math.max(2, speed - 0.5));
        speak('Faster now!');
      }
      
      // Next round
      setTimeout(() => startNewRound(), 2000);
    } else {
      // Wrong answer
      speak('Oops! Try again!');
      const newLives = lives - 1;
      setLives(newLives);
      
      if (newLives === 0) {
        setGameState('gameover');
        speak(`Game over! Your score is ${score}!`);
      } else {
        setTimeout(() => startNewRound(), 2000);
      }
    }
    
    setGameState('waiting');
  };

  // Start game
  const startGame = () => {
    setScore(0);
    setLives(3);
    setRound(1);
    setSpeed(5);
    startNewRound();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {gameState === 'title' && (
          <motion.div
            key="title"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="text-center"
          >
            <motion.h1 
              className="text-7xl md:text-9xl font-black text-white mb-8 drop-shadow-2xl"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [-5, 5, -5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              🎮 POKÉMON<br/>SIMON SAYS! 🎮
            </motion.h1>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={startGame}
              className="bg-yellow-400 hover:bg-yellow-500 text-6xl font-black text-blue-900 px-16 py-8 rounded-full shadow-2xl border-8 border-yellow-600"
            >
              START! 🚀
            </motion.button>
          </motion.div>
        )}

        {(gameState === 'playing' || gameState === 'waiting') && currentPokemon && (
          <motion.div
            key="game"
            initial={{ x: 1000 }}
            animate={{ x: 0 }}
            exit={{ x: -1000 }}
            className="w-full max-w-4xl"
          >
            {/* Score and Lives */}
            <div className="flex justify-between mb-8 text-white">
              <div className="bg-blue-900 bg-opacity-50 px-8 py-4 rounded-3xl">
                <div className="text-3xl font-black">SCORE</div>
                <div className="text-6xl font-black">{score}</div>
              </div>
              
              <div className="bg-red-900 bg-opacity-50 px-8 py-4 rounded-3xl">
                <div className="text-3xl font-black">LIVES</div>
                <div className="text-6xl">
                  {'⚪'.repeat(lives)}{'⚫'.repeat(3-lives)}
                </div>
              </div>
            </div>

            {/* Pokémon Display */}
            <motion.div 
              className="bg-white rounded-3xl p-8 shadow-2xl mb-8"
              animate={{ rotate: [0, -2, 2, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <div className="text-center">
                <div className="text-5xl font-black mb-4 text-blue-900">
                  {simonSays ? '🎯 SIMON SAYS...' : '⚠️ TRICK ROUND!'}
                </div>
                
                {pokemonImageUrl && (
                  <motion.img
                    src={pokemonImageUrl}
                    alt={currentPokemon.name}
                    className="w-64 h-64 mx-auto mb-4"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                
                <div className="text-6xl font-black text-purple-900 mb-2">
                  {currentPokemon.emoji} {currentPokemon.action}
                </div>
                <div className="text-4xl font-bold text-gray-600">
                  like {currentPokemon.name}!
                </div>
              </div>

              {/* Timer */}
              <div className="mt-8">
                <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                  <motion.div
                    className="bg-green-500 h-full"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / speed) * 100}%` }}
                    style={{
                      backgroundColor: timeLeft < 2 ? '#ef4444' : timeLeft < 3 ? '#f59e0b' : '#22c55e'
                    }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            {gameState === 'playing' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAnswer(true)}
                  className="bg-green-500 hover:bg-green-600 text-white text-5xl font-black py-12 rounded-3xl shadow-2xl border-8 border-green-700"
                >
                  I DID IT! ✅
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAnswer(false)}
                  className="bg-red-500 hover:bg-red-600 text-white text-5xl font-black py-12 rounded-3xl shadow-2xl border-8 border-red-700"
                >
                  I STAYED STILL! 🚫
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-center"
          >
            <div className="text-8xl mb-8">😢</div>
            <h2 className="text-7xl font-black text-white mb-8 drop-shadow-2xl">
              GAME OVER!
            </h2>
            <div className="text-6xl font-black text-yellow-300 mb-8">
              FINAL SCORE: {score}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={startGame}
              className="bg-green-500 hover:bg-green-600 text-5xl font-black text-white px-16 py-8 rounded-full shadow-2xl border-8 border-green-700"
            >
              PLAY AGAIN! 🔄
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
