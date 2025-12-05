import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { diseases, syndromes, concepts } from './data';
import { CardState, Classification, Syndrome, Concept } from './types';
import { RefreshCw, CheckCircle, AlertCircle, Award, Activity, Dna, Stethoscope, Heart, Timer, Trophy, Play, BookOpen, User, Rocket, Home, BarChart3 } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs } from "firebase/firestore";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAdUjkkUeCZ9UrXftGMkgBuwEtM7fzKDJ4",
  authDomain: "geneticacard.firebaseapp.com",
  projectId: "geneticacard",
  storageBucket: "geneticacard.firebasestorage.app",
  messagingSenderId: "315992420778",
  appId: "1:315992420778:web:b1b0b461e9848cd8c2fbd3",
  measurementId: "G-4R8G2X3CQW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const REQUIRED_STREAK = 3;

// --- Interfaces para o Ranking ---
interface ScoreEntry {
  id?: string;
  name: string;
  time: number; // em segundos
  date: string;
  difficulty: number;
  mode: string; // 'classification' | 'identification' | 'concepts'
}

// Helper to get color for visual feedback (Game Mode 1)
const getClassificationColor = (type: Classification) => {
  switch (type) {
    case Classification.X_DOMINANTE: return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
    case Classification.X_RECESSIVA: return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    case Classification.AUTO_DOMINANTE: return 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200';
    case Classification.AUTO_RECESSIVA: return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200';
    default: return 'bg-gray-100';
  }
};

// Helper for button colors in Game Mode 2 & 3
const getOptionColor = (index: number) => {
  const colors = [
    'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200',
    'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200',
    'bg-lime-100 text-lime-800 border-lime-200 hover:bg-lime-200',
    'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200'
  ];
  return colors[index % colors.length];
};

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Helper format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

type GameMode = 'classification' | 'identification' | 'concepts';
type ViewState = 'intro' | 'game' | 'ranking';

const App: React.FC = () => {
  // --- Global State ---
  const [currentView, setCurrentView] = useState<ViewState>('intro');
  const [gameMode, setGameMode] = useState<GameMode>('concepts'); // Default changed to concepts (1º Seminario) logic order
  const [difficulty, setDifficulty] = useState<number>(2); // 1-4
  const [hasWon, setHasWon] = useState(false);

  // --- Countdown & Timer State ---
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  
  // --- Leaderboard State ---
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  // --- Mode 1 State (Classification) ---
  const [classCards, setClassCards] = useState<CardState[]>(() => 
    diseases.map(d => ({ diseaseId: d.id, streak: 0, isMastered: false }))
  );
  const [currentClassId, setCurrentClassId] = useState<string | null>(null);

  // --- Mode 2 State (Identification) ---
  const [syndromeCards, setSyndromeCards] = useState<CardState[]>(() => 
    syndromes.map(s => ({ diseaseId: s.id, streak: 0, isMastered: false }))
  );
  const [currentSyndromeId, setCurrentSyndromeId] = useState<string | null>(null);
  const [syndromeOptions, setSyndromeOptions] = useState<Syndrome[]>([]);

  // --- Mode 3 State (Concepts) ---
  const [conceptCards, setConceptCards] = useState<CardState[]>(() => 
    concepts.map(c => ({ diseaseId: c.id, streak: 0, isMastered: false }))
  );
  const [currentConceptId, setCurrentConceptId] = useState<string | null>(null);
  const [conceptOptions, setConceptOptions] = useState<Concept[]>([]);

  // --- Shared Feedback State ---
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'incorrect' | null;
    message?: string;
    correctAnswer?: string;
  }>({ status: null });

  // --- Load Leaderboard from Firebase ---
  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingScores(true);
    try {
      const q = query(
        collection(db, "leaderboard"),
        where("mode", "==", gameMode)
      );
      
      const querySnapshot = await getDocs(q);
      const scores: ScoreEntry[] = [];
      querySnapshot.forEach((doc) => {
        scores.push({ id: doc.id, ...doc.data() } as ScoreEntry);
      });

      // Sort by time (ascending) and take top 10
      scores.sort((a, b) => a.time - b.time);
      setLeaderboard(scores.slice(0, 10));

    } catch (error) {
      console.error("Error fetching leaderboard: ", error);
    } finally {
      setIsLoadingScores(false);
    }
  }, [gameMode]);

  useEffect(() => {
    if (currentView === 'ranking' || hasWon) {
      fetchLeaderboard();
    }
  }, [fetchLeaderboard, currentView, hasWon]);

  // --- Navigation Handlers ---
  const handleStartGame = () => {
    if (playerName.trim().length === 0) {
      alert("Por favor, digite seu nome para iniciar.");
      return;
    }
    setCurrentView('game');
    startCountdown();
  };

  const handleOpenRanking = () => {
    setCurrentView('ranking');
  };

  const handleBackToMenu = () => {
    setIsTimerRunning(false);
    setIsCountingDown(false);
    setHasWon(false);
    setCurrentView('intro');
  };

  // --- Countdown Logic ---
  const startCountdown = useCallback(() => {
    setIsTimerRunning(false);
    setIsCountingDown(true);
    setCountdownValue(3);
    setHasWon(false);
    setScoreSaved(false);
    setElapsedTime(0);
    setFeedback({ status: null });

    // Reset game state based on mode
    if (gameMode === 'classification') {
      setClassCards(diseases.map(d => ({ diseaseId: d.id, streak: 0, isMastered: false })));
      setCurrentClassId(null);
    } else if (gameMode === 'identification') {
      setSyndromeCards(syndromes.map(s => ({ diseaseId: s.id, streak: 0, isMastered: false })));
      setCurrentSyndromeId(null);
    } else {
      setConceptCards(concepts.map(c => ({ diseaseId: c.id, streak: 0, isMastered: false })));
      setCurrentConceptId(null);
    }
  }, [gameMode]);

  useEffect(() => {
    let interval: any;
    if (isCountingDown) {
      interval = setInterval(() => {
        setCountdownValue((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsCountingDown(false);
            setIsTimerRunning(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCountingDown]);

  // --- Timer Logic ---
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && !hasWon) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, hasWon]);

  // --- Logic for Classification Mode ---
  const activeClassCards = useMemo(() => classCards.filter(c => !c.isMastered), [classCards]);
  
  const pickNextClassCard = useCallback(() => {
    if (activeClassCards.length === 0) return;
    let pool = activeClassCards;
    if (activeClassCards.length > 1 && currentClassId) {
      pool = activeClassCards.filter(c => c.diseaseId !== currentClassId);
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    setCurrentClassId(pool[randomIndex].diseaseId);
    setFeedback({ status: null });
  }, [activeClassCards, currentClassId]);

  // --- Logic for Identification Mode ---
  const activeSyndromeCards = useMemo(() => {
    const unmastered = syndromeCards.filter(c => !c.isMastered);
    if (difficulty >= 3) return unmastered;
    const chunkSize = difficulty === 1 ? 3 : 6;
    for (let i = 0; i < syndromes.length; i += chunkSize) {
      const chunkSlice = syndromes.slice(i, i + chunkSize);
      const chunkIds = chunkSlice.map(s => s.id);
      const chunkHasUnmastered = unmastered.some(c => chunkIds.includes(c.diseaseId));
      if (chunkHasUnmastered) {
        return unmastered.filter(c => chunkIds.includes(c.diseaseId));
      }
    }
    return [];
  }, [syndromeCards, difficulty]);

  const pickNextSyndromeCard = useCallback(() => {
    if (activeSyndromeCards.length === 0) return;
    
    let pool = activeSyndromeCards;
    if (activeSyndromeCards.length > 1 && currentSyndromeId) {
      pool = activeSyndromeCards.filter(c => c.diseaseId !== currentSyndromeId);
    }
    const nextCard = pool[Math.floor(Math.random() * pool.length)];
    const correctSyndrome = syndromes.find(s => s.id === nextCard.diseaseId);
    
    if (correctSyndrome) {
      const otherSyndromes = syndromes.filter(s => s.id !== correctSyndrome.id);
      const distractors = shuffleArray(otherSyndromes).slice(0, 3);
      const options = shuffleArray([correctSyndrome, ...distractors]);
      
      setSyndromeOptions(options);
      setCurrentSyndromeId(nextCard.diseaseId);
      setFeedback({ status: null });
    }
  }, [activeSyndromeCards, currentSyndromeId]);

  // --- Logic for Concepts Mode ---
  const activeConceptCards = useMemo(() => {
    const unmastered = conceptCards.filter(c => !c.isMastered);
    if (difficulty >= 3) return unmastered;
    const chunkSize = difficulty === 1 ? 3 : 6;
    for (let i = 0; i < concepts.length; i += chunkSize) {
      const chunkSlice = concepts.slice(i, i + chunkSize);
      const chunkIds = chunkSlice.map(c => c.id);
      const chunkHasUnmastered = unmastered.some(c => chunkIds.includes(c.diseaseId));
      if (chunkHasUnmastered) {
        return unmastered.filter(c => chunkIds.includes(c.diseaseId));
      }
    }
    return [];
  }, [conceptCards, difficulty]);

  const pickNextConceptCard = useCallback(() => {
    if (activeConceptCards.length === 0) return;

    let pool = activeConceptCards;
    if (activeConceptCards.length > 1 && currentConceptId) {
      pool = activeConceptCards.filter(c => c.diseaseId !== currentConceptId);
    }
    const nextCard = pool[Math.floor(Math.random() * pool.length)];
    const correctConcept = concepts.find(c => c.id === nextCard.diseaseId);

    if (correctConcept) {
      const otherConcepts = concepts.filter(c => c.id !== correctConcept.id);
      const distractors = shuffleArray(otherConcepts).slice(0, 3);
      const options = shuffleArray([correctConcept, ...distractors]);

      setConceptOptions(options);
      setCurrentConceptId(nextCard.diseaseId);
      setFeedback({ status: null });
    }
  }, [activeConceptCards, currentConceptId]);


  // --- Mode Switching Triggers ---
  useEffect(() => {
    if (gameMode !== 'classification' && difficulty > 3) {
      setDifficulty(3);
    }
  }, [gameMode, difficulty]);


  // --- Save Score Handler (Firebase) ---
  const handleSaveScore = async () => {
    if (!playerName.trim() || scoreSaved) return;

    try {
      await addDoc(collection(db, "leaderboard"), {
        name: playerName.trim(),
        time: elapsedTime,
        date: new Date().toLocaleDateString('pt-BR'),
        difficulty: difficulty,
        mode: gameMode
      });
      
      await fetchLeaderboard(); 
      setScoreSaved(true);
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Erro ao salvar pontuação. Tente novamente.");
    }
  };

  // --- Trigger First Card Pick (Only when playing) ---
  useEffect(() => {
    if (!isTimerRunning || hasWon || isCountingDown || currentView !== 'game') return;

    if (gameMode === 'classification') {
      if (activeClassCards.length === 0) {
        setHasWon(true);
        setIsTimerRunning(false);
        setCurrentClassId(null);
      } else if (!currentClassId) {
        pickNextClassCard();
      }
    } else if (gameMode === 'identification') {
      if (activeSyndromeCards.length === 0) {
        const allMastered = syndromeCards.every(c => c.isMastered);
        if (allMastered) {
          setHasWon(true);
          setIsTimerRunning(false);
          setCurrentSyndromeId(null);
        } else {
           if (!currentSyndromeId) pickNextSyndromeCard();
        }
      } else if (!currentSyndromeId) {
        pickNextSyndromeCard();
      }
    } else if (gameMode === 'concepts') {
      if (activeConceptCards.length === 0) {
        const allMastered = conceptCards.every(c => c.isMastered);
        if (allMastered) {
          setHasWon(true);
          setIsTimerRunning(false);
          setCurrentConceptId(null);
        } else {
          if (!currentConceptId) pickNextConceptCard();
        }
      } else if (!currentConceptId) {
        pickNextConceptCard();
      }
    }
  }, [
    isTimerRunning,
    isCountingDown,
    currentView,
    gameMode, 
    hasWon, 
    activeClassCards.length, 
    activeSyndromeCards,
    activeConceptCards,
    currentClassId, 
    currentSyndromeId, 
    currentConceptId,
    pickNextClassCard, 
    pickNextSyndromeCard,
    pickNextConceptCard,
    syndromeCards,
    conceptCards
  ]);

  // --- Helpers ---
  const isGrayscale = gameMode === 'classification' && difficulty >= 3;
  const availableLevels = gameMode === 'classification' ? [1, 2, 3, 4] : [1, 2, 3];

  const handleClassAnswer = (classification: Classification) => {
    if (!currentClassId || feedback.status !== null || isCountingDown) return;
    const currentDisease = diseases.find(d => d.id === currentClassId);
    if (!currentDisease) return;

    const isCorrect = currentDisease.classification === classification;
    processAnswer(isCorrect, currentDisease.classification, setClassCards, pickNextClassCard, currentClassId);
  };

  const handleSyndromeAnswer = (selectedSyndromeName: string) => {
    if (!currentSyndromeId || feedback.status !== null || isCountingDown) return;
    const currentSyndrome = syndromes.find(s => s.id === currentSyndromeId);
    if (!currentSyndrome) return;

    const isCorrect = currentSyndrome.name === selectedSyndromeName;
    processAnswer(isCorrect, currentSyndrome.name, setSyndromeCards, pickNextSyndromeCard, currentSyndromeId);
  };

  const handleConceptAnswer = (selectedConceptName: string) => {
    if (!currentConceptId || feedback.status !== null || isCountingDown) return;
    const currentConcept = concepts.find(c => c.id === currentConceptId);
    if (!currentConcept) return;

    const isCorrect = currentConcept.name === selectedConceptName;
    processAnswer(isCorrect, currentConcept.name, setConceptCards, pickNextConceptCard, currentConceptId);
  };

  const processAnswer = (
    isCorrect: boolean, 
    correctAnswerText: string, 
    setCardsFn: React.Dispatch<React.SetStateAction<CardState[]>>,
    nextCardFn: () => void,
    currentId: string
  ) => {
    if (isCorrect) {
      setFeedback({ status: 'correct', message: 'Correto!' });
      setCardsFn(prev => prev.map(card => {
        if (card.diseaseId === currentId) {
          const newStreak = card.streak + 1;
          return { ...card, streak: newStreak, isMastered: newStreak >= REQUIRED_STREAK };
        }
        return card;
      }));
      setTimeout(() => nextCardFn(), 1000);
    } else {
      setFeedback({ 
        status: 'incorrect', 
        message: 'Incorreto.',
        correctAnswer: correctAnswerText 
      });
      setElapsedTime(prev => prev + 5); // Time penalty
      
      setCardsFn(prev => prev.map(card => {
        if (card.diseaseId === currentId) {
          return { ...card, streak: 0 };
        }
        return card;
      }));
      setTimeout(() => nextCardFn(), 2500);
    }
  };

  // --- Render Functions ---
  const currentCardClass = currentClassId ? diseases.find(d => d.id === currentClassId) : null;
  const currentCardSyndrome = currentSyndromeId ? syndromes.find(s => s.id === currentSyndromeId) : null;
  const currentCardConcept = currentConceptId ? concepts.find(c => c.id === currentConceptId) : null;

  // Buttons Logic for Classification
  const classButtons = useMemo(() => {
    const buttons = Object.values(Classification).map(c => ({
      label: c,
      value: c,
    }));
    if (difficulty === 2 || difficulty === 4) {
      return shuffleArray(buttons);
    }
    return buttons;
  }, [difficulty, currentClassId]);

  // --- INTRO SCREEN RENDER ---
  if (currentView === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-white/50 backdrop-blur-sm">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-300 transform -rotate-6">
              <Dna className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-center text-slate-800 mb-2">Flashcards de Genética</h1>
          <p className="text-center text-slate-500 mb-8">Memorização ativa e repetição espaçada.</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" /> Seu Nome
              </label>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Digite seu nome para o ranking"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Modo de Jogo
              </label>
              <div className="grid grid-cols-1 gap-2">
                 {/* Reordered: 1º Seminário (Concepts) -> 2º Seminário (Classification) -> Síndromes */}
                <button
                  onClick={() => setGameMode('concepts')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                    gameMode === 'concepts' 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                      : 'border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Rocket className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left">
                    <span className="block font-bold">1º Seminário</span>
                    <span className="text-xs opacity-75">Aplicações e Conceitos (PCR, Forense...)</span>
                  </div>
                </button>

                <button
                  onClick={() => setGameMode('classification')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                    gameMode === 'classification' 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                      : 'border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Activity className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left">
                    <span className="block font-bold">2º Seminário</span>
                    <span className="text-xs opacity-75">Classificação das Doenças</span>
                  </div>
                </button>

                <button
                  onClick={() => setGameMode('identification')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                    gameMode === 'identification' 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                      : 'border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Stethoscope className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left">
                    <span className="block font-bold">Síndromes</span>
                    <span className="text-xs opacity-75">Associe características às síndromes.</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleStartGame}
                disabled={!playerName.trim()}
                className="col-span-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" fill="currentColor" /> Jogar
              </button>
              
              <button 
                onClick={handleOpenRanking}
                className="col-span-1 py-4 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <BarChart3 className="w-5 h-5" /> Ranking
              </button>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-400">Desenvolvido por Pedro Amorim • 2025</p>
          </div>
        </div>
      </div>
    );
  }

  // --- RANKING SCREEN RENDER ---
  if (currentView === 'ranking') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 font-sans">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-indigo-100 p-8">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
             <div className="bg-amber-100 p-3 rounded-full">
                <Trophy className="w-8 h-8 text-amber-600" />
             </div>
             <h1 className="text-2xl font-bold text-slate-800">Ranking Global</h1>
          </div>

          {/* Mode Selector Tabs for Ranking - Reordered and Scroll Removed */}
          <div className="flex flex-wrap justify-center gap-2 mb-6 pb-2">
            <button
              onClick={() => setGameMode('concepts')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${gameMode === 'concepts' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              1º Seminário
            </button>
            <button
              onClick={() => setGameMode('classification')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${gameMode === 'classification' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              2º Seminário
            </button>
            <button
              onClick={() => setGameMode('identification')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${gameMode === 'identification' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Síndromes
            </button>
          </div>

          {/* Table */}
          {isLoadingScores ? (
             <div className="text-center py-12 text-slate-400">Carregando scores...</div>
           ) : (
             <div className="overflow-hidden rounded-xl border border-slate-200 mb-8">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-100 text-slate-600 font-semibold">
                   <tr>
                     <th className="px-4 py-3">#</th>
                     <th className="px-4 py-3">Nome</th>
                     <th className="px-4 py-3 text-right">Tempo</th>
                     <th className="px-4 py-3 text-center">Nível</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {leaderboard.length > 0 ? leaderboard.map((score, index) => (
                     <tr key={score.id || index} className="hover:bg-slate-50">
                       <td className="px-4 py-3 font-medium text-slate-500">{index + 1}</td>
                       <td className="px-4 py-3 font-bold text-slate-800">{score.name}</td>
                       <td className="px-4 py-3 text-right font-mono text-indigo-600">{formatTime(score.time)}</td>
                       <td className="px-4 py-3 text-center">
                         <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">{score.difficulty}</span>
                       </td>
                     </tr>
                   )) : (
                     <tr>
                       <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum recorde encontrado para este modo.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           )}

           <button 
              onClick={handleBackToMenu}
              className="w-full py-3 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" /> Voltar ao Menu
            </button>
        </div>
      </div>
    );
  }

  // --- GAME RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* --- COUNTDOWN OVERLAY --- */}
      {isCountingDown && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-9xl font-black text-white animate-count drop-shadow-2xl">
            {countdownValue}
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                <Dna className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Flashcards de Genética</h1>
                <p className="text-xs text-slate-500 font-medium">Jogador: {playerName}</p>
              </div>
            </div>

            {/* Game Mode Indicator - Reordered and Scroll Removed */}
            <div className="bg-slate-100 p-1 rounded-lg flex flex-wrap justify-center gap-1 max-w-full">
               <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                  gameMode === 'concepts' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-400'
                }`}
              >
                <Rocket className="w-4 h-4" /> 1º Seminário
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                  gameMode === 'classification' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-400'
                }`}
              >
                <Activity className="w-4 h-4" /> 2º Seminário
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                  gameMode === 'identification' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-400'
                }`}
              >
                <Stethoscope className="w-4 h-4" /> Síndromes
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                <Timer className="w-4 h-4 text-slate-500" />
                <span className={`font-mono font-bold ${isTimerRunning ? 'text-indigo-600' : 'text-slate-600'}`}>
                  {formatTime(elapsedTime)}
                </span>
              </div>
              <button 
                onClick={startCountdown}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="Reiniciar Jogo"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button 
                onClick={handleBackToMenu}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Sair / Menu Principal"
              >
                <Home className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Difficulty Selector */}
          <div className="mt-4 flex flex-col items-center">
            <div className="flex gap-2">
              {availableLevels.map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`w-10 h-10 rounded-lg font-bold text-sm transition-all border-2 ${
                    difficulty === level
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform -translate-y-0.5'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              {gameMode === 'classification' ? (
                difficulty === 1 ? "Fixo + Cores" :
                difficulty === 2 ? "Alternado + Cores" :
                difficulty === 3 ? "Fixo + Sem Cores" : "Alternado + Sem Cores"
              ) : (
                difficulty === 1 ? "Grupos de 3 (Fixo)" :
                difficulty === 2 ? "Grupos de 6 (Fixo)" : "Todos (Aleatório)"
              )}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full flex flex-col gap-6">
        
        {/* --- WIN SCREEN --- */}
        {hasWon ? (
          <div className="bg-white rounded-3xl shadow-xl border border-indigo-100 p-8 text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Parabéns, {playerName}!</h2>
            <p className="text-slate-600 mb-6">
              Você completou o modo <span className="font-semibold text-indigo-600">
                {gameMode === 'concepts' ? '1º Seminário' : 
                 gameMode === 'classification' ? '2º Seminário' : 'Síndromes'}
              </span>!
            </p>
            
            <div className="inline-block bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 mb-8">
              <p className="text-sm text-slate-500 uppercase tracking-wide font-bold mb-1">Tempo Final</p>
              <p className="text-4xl font-black text-indigo-600">{formatTime(elapsedTime)}</p>
            </div>

            {!scoreSaved ? (
              <div className="max-w-xs mx-auto mb-8">
                <button 
                  onClick={handleSaveScore}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <Award className="w-5 h-5" /> Registrar no Ranking
                </button>
                <p className="text-xs text-slate-400 mt-2">Seu nome já foi preenchido.</p>
              </div>
            ) : (
              <div className="mb-8 text-green-600 font-bold flex items-center justify-center gap-2 bg-green-50 py-2 rounded-lg">
                <CheckCircle className="w-5 h-5" /> Pontuação Salva!
              </div>
            )}

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button 
                onClick={startCountdown}
                className="w-full px-8 py-3 bg-white border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" /> Jogar Novamente
              </button>

              <button 
                onClick={handleBackToMenu}
                className="w-full px-8 py-3 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" /> Voltar ao Menu
              </button>
            </div>
            
            {/* Mini Ranking Preview */}
            <div className="mt-12 opacity-80">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Top 5 Recentes</h3>
                 {isLoadingScores ? (
                 <div className="text-xs text-slate-400">Carregando...</div>
               ) : (
                 <div className="overflow-hidden rounded-xl border border-slate-100 max-w-lg mx-auto">
                   <table className="w-full text-sm text-left">
                     <tbody className="divide-y divide-slate-100">
                       {leaderboard.slice(0, 5).map((score, index) => (
                         <tr key={score.id || index} className={`bg-slate-50 ${score.name === playerName && score.time === elapsedTime ? 'bg-indigo-50' : ''}`}>
                           <td className="px-4 py-2 font-medium text-slate-500">{index + 1}</td>
                           <td className="px-4 py-2 font-bold text-slate-800">{score.name}</td>
                           <td className="px-4 py-2 text-right font-mono text-indigo-600">{formatTime(score.time)}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          </div>
        ) : (
          /* --- GAMEPLAY AREA --- */
          <>
            <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
              {/* Progress Bar */}
              <div className="mb-6">
                 <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                    <span>Progresso do Nível</span>
                    <span>
                      {gameMode === 'classification' 
                        ? `${classCards.filter(c => c.isMastered).length} / ${classCards.length}` 
                        : gameMode === 'identification' 
                        ? `${syndromeCards.filter(c => c.isMastered).length} / ${syndromeCards.length}`
                        : `${conceptCards.filter(c => c.isMastered).length} / ${conceptCards.length}`}
                    </span>
                 </div>
                 <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                      style={{ 
                        width: `${((gameMode === 'classification' 
                          ? classCards.filter(c => c.isMastered).length 
                          : gameMode === 'identification' 
                          ? syndromeCards.filter(c => c.isMastered).length
                          : conceptCards.filter(c => c.isMastered).length) / (gameMode === 'classification' ? classCards.length : gameMode === 'identification' ? syndromeCards.length : conceptCards.length)) * 100}%` 
                      }}
                    />
                 </div>
              </div>

              {/* Card */}
              <div className={`relative bg-white rounded-3xl shadow-xl border-2 p-8 md:p-12 mb-8 text-center transition-all duration-300 ${
                  feedback.status === 'correct' ? 'border-green-400 bg-green-50' : 
                  feedback.status === 'incorrect' ? 'border-red-400 bg-red-50' : 'border-slate-100'
                }`}>
                
                {/* Feedback Icon Overlay */}
                {feedback.status && (
                  <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                    {feedback.status === 'correct' ? (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    )}
                  </div>
                )}

                {gameMode === 'classification' ? (
                  <>
                    <h2 className="text-2xl md:text-4xl font-black text-slate-800 mb-2 tracking-tight">
                      {currentCardClass?.name || 'Carregando...'}
                    </h2>
                    <p className="text-slate-400 font-medium">Classifique a doença acima</p>
                  </>
                ) : gameMode === 'identification' ? (
                  <div className="text-left space-y-4">
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4 tracking-tight text-center border-b pb-4">
                      Identifique a Síndrome
                    </h2>
                    {currentCardSyndrome?.features.map((feature, idx) => (
                      <div key={idx} className="flex gap-3 text-slate-700">
                        <div className="min-w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2.5" />
                        <p className="leading-relaxed">{feature}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-left space-y-4">
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4 tracking-tight text-center border-b pb-4">
                      Conceito / Aplicação
                    </h2>
                    {currentCardConcept?.description.map((desc, idx) => (
                      <div key={idx} className="flex gap-3 text-slate-700">
                        <div className="min-w-1.5 h-1.5 rounded-full bg-purple-400 mt-2.5" />
                        <p className="leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback Message */}
              {feedback.status === 'incorrect' && (
                <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-4">
                  Resposta correta: <span className="font-bold">{feedback.correctAnswer}</span>
                </div>
              )}

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameMode === 'classification' ? (
                  classButtons.map((btn) => (
                    <button
                      key={btn.value}
                      onClick={() => handleClassAnswer(btn.value as Classification)}
                      disabled={feedback.status !== null || isCountingDown}
                      className={`p-4 rounded-xl border-2 font-bold text-sm md:text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                        ${isGrayscale 
                          ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300' 
                          : getClassificationColor(btn.value as Classification)
                        }`}
                    >
                      {btn.label}
                    </button>
                  ))
                ) : gameMode === 'identification' ? (
                  syndromeOptions.map((option, idx) => (
                    <button
                      key={option.id}
                      onClick={() => handleSyndromeAnswer(option.name)}
                      disabled={feedback.status !== null || isCountingDown}
                      className={`p-4 rounded-xl border-2 font-bold text-sm md:text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                        ${getOptionColor(idx)}`}
                    >
                      {option.name}
                    </button>
                  ))
                ) : (
                  conceptOptions.map((option, idx) => (
                    <button
                      key={option.id}
                      onClick={() => handleConceptAnswer(option.name)}
                      disabled={feedback.status !== null || isCountingDown}
                      className={`p-4 rounded-xl border-2 font-bold text-sm md:text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                        ${getOptionColor(idx)}`}
                    >
                      {option.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100 bg-white mt-auto">
        <div className="flex flex-col items-center gap-2">
          <p className="flex items-center gap-1.5">
            Feito com <Heart className="w-4 h-4 text-red-500 fill-red-500" /> para estudantes de medicina.
          </p>
          <p className="font-semibold text-slate-600">
            Desenvolvido por Pedro Amorim
          </p>
          <p className="text-xs">
            © 2025 Flashcards de Genética. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;