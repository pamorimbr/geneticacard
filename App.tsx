import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { diseases, syndromes, concepts } from './data';
import { CardState, Classification, Syndrome, Concept } from './types';
import { RefreshCw, CheckCircle, AlertCircle, Award, Activity, Dna, Stethoscope, Heart, Timer, Trophy, Play, BookOpen, User, Rocket, Home, BarChart3, Loader2 } from 'lucide-react';

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
  isCurrent?: boolean; // Flag para identificar jogo em andamento
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
  const [isSaving, setIsSaving] = useState(false); // New state for feedback
  const [scoreSaved, setScoreSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      setLeaderboard(scores); // Store all, filter later

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
    // If opening ranking from game, just switch view, don't reset
    setCurrentView('ranking');
  };

  const handleBackToGame = () => {
    setCurrentView('game');
  }

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
    setSaveError(null);
    setIsSaving(false);
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

  // --- Logic for Identification Mode (Syndromes) ---
  const activeSyndromeCards = useMemo(() => {
    const unmastered = syndromeCards.filter(c => !c.isMastered);
    // Level 3: All random
    if (difficulty >= 3) return unmastered;
    
    // Level 1 or 2: Chunk logic
    const chunkSize = difficulty === 1 ? 3 : 6;
    for (let i = 0; i < syndromes.length; i += chunkSize) {
      const chunkSlice = syndromes.slice(i, i + chunkSize);
      const chunkIds = chunkSlice.map(s => s.id);
      
      const chunkHasUnmastered = unmastered.some(c => chunkIds.includes(c.diseaseId));
      if (chunkHasUnmastered) {
        return unmastered.filter(c => chunkIds.includes(c.diseaseId));
      }
    }
    return unmastered;
  }, [syndromeCards, difficulty]);

  const pickNextSyndromeCard = useCallback(() => {
    if (activeSyndromeCards.length === 0) return;
    let pool = activeSyndromeCards;
    if (activeSyndromeCards.length > 1 && currentSyndromeId) {
      pool = activeSyndromeCards.filter(c => c.diseaseId !== currentSyndromeId);
    }
    
    // If pool is empty (shouldn't happen if game not won), fallback
    if (pool.length === 0) return;

    const randomIndex = Math.floor(Math.random() * pool.length);
    const nextId = pool[randomIndex].diseaseId;
    setCurrentSyndromeId(nextId);
    
    // Generate Options
    const correct = syndromes.find(s => s.id === nextId);
    if (!correct) return;

    const otherSyndromes = syndromes.filter(s => s.id !== nextId);
    const shuffledOthers = shuffleArray(otherSyndromes).slice(0, 3);
    const options = shuffleArray([correct, ...shuffledOthers]);
    
    setSyndromeOptions(options);
    setFeedback({ status: null });

  }, [activeSyndromeCards, currentSyndromeId]);


  // --- Logic for Concepts Mode (1º Seminario) ---
  const activeConceptCards = useMemo(() => {
    const unmastered = conceptCards.filter(c => !c.isMastered);
    // Similar logic to Syndromes if we want chunking, or just random
    // Assuming same chunk logic applies as requested "ranking for all 3 modules" implies similar structure
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
    return unmastered;
  }, [conceptCards, difficulty]);

  const pickNextConceptCard = useCallback(() => {
    if (activeConceptCards.length === 0) return;
    let pool = activeConceptCards;
    if (activeConceptCards.length > 1 && currentConceptId) {
      pool = activeConceptCards.filter(c => c.diseaseId !== currentConceptId);
    }

     if (pool.length === 0) return;

    const randomIndex = Math.floor(Math.random() * pool.length);
    const nextId = pool[randomIndex].diseaseId;
    setCurrentConceptId(nextId);

    const correct = concepts.find(c => c.id === nextId);
    if (!correct) return;

    const otherConcepts = concepts.filter(c => c.id !== nextId);
    const shuffledOthers = shuffleArray(otherConcepts).slice(0, 3);
    const options = shuffleArray([correct, ...shuffledOthers]);

    setConceptOptions(options);
    setFeedback({ status: null });
  }, [activeConceptCards, currentConceptId]);


  // --- Game Loop Triggers ---
  useEffect(() => {
    if (currentView !== 'game') return;
    if (isCountingDown) return;

    if (gameMode === 'classification') {
      if (activeClassCards.length === 0 && classCards.length > 0) {
        setHasWon(true);
        setIsTimerRunning(false);
      } else if (!currentClassId) {
        pickNextClassCard();
      }
    } else if (gameMode === 'identification') {
      if (activeSyndromeCards.length === 0 && syndromeCards.some(c => c.isMastered)) {
         // Check if ALL cards are mastered, not just current chunk
         const allMastered = syndromeCards.every(c => c.isMastered);
         if (allMastered) {
             setHasWon(true);
             setIsTimerRunning(false);
         } else {
             // If current chunk finished but game not over, pick next immediately
             pickNextSyndromeCard();
         }
      } else if (!currentSyndromeId) {
        pickNextSyndromeCard();
      }
    } else if (gameMode === 'concepts') {
        if (activeConceptCards.length === 0 && conceptCards.some(c => c.isMastered)) {
            const allMastered = conceptCards.every(c => c.isMastered);
            if (allMastered) {
                setHasWon(true);
                setIsTimerRunning(false);
            } else {
                pickNextConceptCard();
            }
        } else if (!currentConceptId) {
            pickNextConceptCard();
        }
    }
  }, [
    currentView, isCountingDown, gameMode, 
    activeClassCards, classCards, currentClassId, pickNextClassCard,
    activeSyndromeCards, syndromeCards, currentSyndromeId, pickNextSyndromeCard,
    activeConceptCards, conceptCards, currentConceptId, pickNextConceptCard
  ]);

  // --- Interaction Handlers ---
  const handleClassificationAnswer = (answer: Classification) => {
    if (!currentClassId || feedback.status) return;

    const currentCard = diseases.find(d => d.id === currentClassId);
    if (!currentCard) return;

    const isCorrect = currentCard.classification === answer;

    setFeedback({
      status: isCorrect ? 'correct' : 'incorrect',
      message: isCorrect ? 'Correto!' : 'Incorreto!',
      correctAnswer: isCorrect ? undefined : currentCard.classification
    });

    setTimeout(() => {
      setClassCards(prev => prev.map(card => {
        if (card.diseaseId !== currentClassId) return card;
        if (isCorrect) {
          const newStreak = card.streak + 1;
          return { ...card, streak: newStreak, isMastered: newStreak >= REQUIRED_STREAK };
        } else {
          return { ...card, streak: 0 };
        }
      }));
      pickNextClassCard();
    }, 1500); // Wait for feedback
  };

  const handleSyndromeAnswer = (selectedId: string) => {
    if (!currentSyndromeId || feedback.status) return;
    
    const isCorrect = selectedId === currentSyndromeId;
    const correctSyndrome = syndromes.find(s => s.id === currentSyndromeId);

    setFeedback({
      status: isCorrect ? 'correct' : 'incorrect',
      message: isCorrect ? 'Correto!' : 'Incorreto!',
      correctAnswer: isCorrect ? undefined : correctSyndrome?.name
    });

    setTimeout(() => {
      setSyndromeCards(prev => prev.map(card => {
        if (card.diseaseId !== currentSyndromeId) return card;
        if (isCorrect) {
          const newStreak = card.streak + 1;
          return { ...card, streak: newStreak, isMastered: newStreak >= REQUIRED_STREAK };
        } else {
          return { ...card, streak: 0 };
        }
      }));
      pickNextSyndromeCard();
    }, 1500);
  };

  const handleConceptAnswer = (selectedId: string) => {
      if (!currentConceptId || feedback.status) return;

      const isCorrect = selectedId === currentConceptId;
      const correctConcept = concepts.find(c => c.id === currentConceptId);

      setFeedback({
          status: isCorrect ? 'correct' : 'incorrect',
          message: isCorrect ? 'Correto!' : 'Incorreto!',
          correctAnswer: isCorrect ? undefined : correctConcept?.name
      });

      setTimeout(() => {
          setConceptCards(prev => prev.map(card => {
              if (card.diseaseId !== currentConceptId) return card;
              if (isCorrect) {
                  const newStreak = card.streak + 1;
                  return { ...card, streak: newStreak, isMastered: newStreak >= REQUIRED_STREAK };
              } else {
                  return { ...card, streak: 0 };
              }
          }));
          pickNextConceptCard();
      }, 1500);
  }

  // --- Save Score Logic ---
  const saveScore = async () => {
    if (scoreSaved || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    const scoreData = {
      name: String(playerName).substring(0, 20),
      time: Number(elapsedTime),
      difficulty: Number(difficulty),
      mode: String(gameMode),
      date: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "leaderboard"), scoreData);
      setScoreSaved(true);
      // Optional: Refresh leaderboard
      fetchLeaderboard();
    } catch (e: any) {
      console.error("Error adding document: ", e);
      setSaveError(e.message || "Erro desconhecido ao salvar");
      // Don't set scoreSaved to true so they can try again
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Helpers ---
  const getCurrentProgress = () => {
    let cards = gameMode === 'classification' ? classCards : (gameMode === 'concepts' ? conceptCards : syndromeCards);
    const mastered = cards.filter(c => c.isMastered).length;
    return Math.round((mastered / cards.length) * 100);
  };

  // Randomized buttons logic (Mode 1)
  const classificationOptions = useMemo(() => {
    const options = [
      Classification.X_DOMINANTE,
      Classification.X_RECESSIVA,
      Classification.AUTO_DOMINANTE,
      Classification.AUTO_RECESSIVA
    ];
    // If difficulty is 2 or 4, shuffle every time currentClassId changes
    if (difficulty === 2 || difficulty === 4) {
      return shuffleArray(options);
    }
    return options;
  }, [difficulty, currentClassId]); // re-shuffle when card changes

  // --- Views ---

  // 1. INTRO VIEW
  if (currentView === 'intro') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-slate-800 p-8 text-center">
            <Dna className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Flashcards de Genética</h1>
            <p className="text-slate-300">Treine sua memória com repetição espaçada</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Como gostaria de ser chamado?
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  placeholder="Seu Nome"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                * Necessário para o Ranking Global.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleStartGame}
                disabled={!playerName.trim()}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg
                  ${playerName.trim() 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                <Play className="w-5 h-5 fill-current" />
                Iniciar Jogo
              </button>
              
              <button 
                onClick={handleOpenRanking}
                className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
              >
                <Trophy className="w-5 h-5 text-amber-500" />
                Ver Ranking Global
              </button>
            </div>
          </div>
          <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
             <div className="flex flex-col items-center justify-center text-slate-400 text-sm gap-1">
                <div className="flex items-center gap-1">
                  <span>Feito com</span>
                  <Heart className="w-4 h-4 text-red-500 fill-current" />
                  <span>para estudantes de medicina.</span>
                </div>
                <div className="font-bold text-slate-600">Desenvolvido por Pedro Amorim</div>
                <div className="text-xs">© 2025 Flashcards de Genética. Todos os direitos reservados.</div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. RANKING VIEW
  if (currentView === 'ranking') {
    // Determine which list to show based on selected tab (reusing gameMode state for tab selection)
    const currentTabScores = leaderboard.filter(s => s.mode === gameMode);
    
    // Create a combined list with current player status if game is in progress
    let displayList = [...currentTabScores];
    
    // Only inject "In Progress" entry if we are paused in a game (timer running or not won yet) AND view switched
    if (elapsedTime > 0 && !hasWon && playerName) {
        const tempEntry: ScoreEntry = {
            name: playerName,
            time: elapsedTime,
            difficulty: difficulty,
            mode: gameMode,
            date: new Date().toISOString(),
            isCurrent: true
        };
        displayList.push(tempEntry);
        displayList.sort((a, b) => a.time - b.time);
    }
    
    // Limit to top 50 for display
    displayList = displayList.slice(0, 50);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-slate-800 p-6 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3">
               <Trophy className="w-8 h-8 text-amber-400" />
               <h1 className="text-2xl font-bold text-white">Ranking Global</h1>
             </div>
             <button 
               onClick={hasWon || elapsedTime === 0 ? handleBackToMenu : handleBackToGame}
               className="p-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
             >
               <Home className="w-5 h-5" />
             </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto shrink-0">
             <button 
                onClick={() => setGameMode('concepts')}
                className={`flex-1 py-3 px-4 font-medium text-sm whitespace-nowrap transition-colors ${gameMode === 'concepts' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'}`}
             >
                1º Seminário
             </button>
             <button 
                onClick={() => setGameMode('classification')}
                className={`flex-1 py-3 px-4 font-medium text-sm whitespace-nowrap transition-colors ${gameMode === 'classification' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'}`}
             >
                2º Seminário
             </button>
             <button 
                onClick={() => setGameMode('identification')}
                className={`flex-1 py-3 px-4 font-medium text-sm whitespace-nowrap transition-colors ${gameMode === 'identification' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Síndromes
             </button>
          </div>

          {/* Table */}
          <div className="overflow-y-auto overflow-x-auto p-0 flex-1">
             {isLoadingScores ? (
               <div className="flex flex-col items-center justify-center h-40 gap-3">
                 <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                 <p className="text-slate-500">Carregando recordes...</p>
               </div>
             ) : displayList.length === 0 ? (
               <div className="text-center p-10 text-slate-500">
                 Nenhum recorde registrado para este modo ainda. Seja o primeiro!
               </div>
             ) : (
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50 sticky top-0 z-10">
                   <tr>
                     <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">#</th>
                     <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Jogador</th>
                     <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tempo</th>
                     {/* Hidden columns on mobile */}
                     <th className="hidden sm:table-cell py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Nível</th>
                     <th className="hidden md:table-cell py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Data</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {displayList.map((entry, index) => {
                     const isTop3 = index < 3;
                     const rankColor = index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-amber-700' : 'text-slate-600';
                     
                     return (
                       <tr key={index} className={`hover:bg-slate-50 transition-colors ${entry.isCurrent ? 'bg-red-50' : ''}`}>
                         <td className="py-3 px-4 text-center">
                           {isTop3 ? (
                             <Award className={`w-5 h-5 mx-auto ${rankColor}`} />
                           ) : (
                             <span className="text-slate-500 text-xs font-medium">{index + 1}º</span>
                           )}
                         </td>
                         <td className="py-3 px-2">
                           <div className="flex flex-col">
                             <span className={`font-medium text-sm truncate max-w-[120px] sm:max-w-[200px] ${entry.isCurrent ? 'text-red-600' : 'text-slate-800'}`}>
                               {entry.name} {entry.isCurrent && "(Não concluiu)"}
                             </span>
                           </div>
                         </td>
                         <td className="py-3 px-2 text-right">
                           <span className={`font-mono text-sm ${entry.isCurrent ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                              {formatTime(entry.time)}
                           </span>
                         </td>
                         <td className="hidden sm:table-cell py-3 px-4 text-center">
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                             Lvl {entry.difficulty}
                           </span>
                         </td>
                         <td className="hidden md:table-cell py-3 px-4 text-right text-xs text-slate-400">
                           {new Date(entry.date).toLocaleDateString()}
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             )}
          </div>
        </div>
      </div>
    );
  }

  // 3. GAME VIEW (Default)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 3, 2, 1 Countdown Overlay */}
      {isCountingDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="text-9xl font-black text-white animate-count">
            {countdownValue === 0 ? 'JÁ!' : countdownValue}
          </div>
        </div>
      )}

      {/* Header Compacto Mobile */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-2">
          {/* Linha Superior: Logo, Timer e Controles */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 p-1.5 rounded-lg">
                <Dna className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                 <h1 className="text-sm font-bold text-slate-800 hidden md:block">Flashcards de Genética</h1>
                 <p className="text-xs text-slate-500 flex items-center gap-1">
                   <User className="w-3 h-3" /> {playerName}
                 </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                  <Timer className={`w-4 h-4 ${isTimerRunning ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                  <span className="font-mono font-bold text-slate-700 text-sm">{formatTime(elapsedTime)}</span>
               </div>
               <button 
                 onClick={handleOpenRanking}
                 className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                 title="Ver Ranking"
               >
                 <BarChart3 className="w-5 h-5" />
               </button>
               <button 
                 onClick={() => {
                   if (window.confirm("Deseja sair do jogo atual?")) {
                     handleBackToMenu();
                   }
                 }}
                 className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                 title="Sair"
               >
                 <Home className="w-5 h-5" />
               </button>
            </div>
          </div>

          {/* Linha Inferior: Modos e Dificuldade (Scrollavel se necessario, mas ajustado com wrap) */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
            
            {/* Seletor de Modo */}
            <div className="flex bg-slate-100 p-1 rounded-lg overflow-hidden shrink-0">
               <button
                  onClick={() => { setGameMode('concepts'); startCountdown(); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    gameMode === 'concepts' 
                      ? 'bg-white text-emerald-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Rocket className="w-3 h-3" />
                  <span className="hidden sm:inline">1º Sem.</span>
                  <span className="sm:hidden">1º</span>
                </button>
                <button
                  onClick={() => { setGameMode('classification'); startCountdown(); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    gameMode === 'classification' 
                      ? 'bg-white text-emerald-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span className="hidden sm:inline">2º Sem.</span>
                  <span className="sm:hidden">2º</span>
                </button>
                <button
                  onClick={() => { setGameMode('identification'); startCountdown(); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    gameMode === 'identification' 
                      ? 'bg-white text-emerald-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Stethoscope className="w-3 h-3" />
                  <span className="hidden sm:inline">Síndromes</span>
                  <span className="sm:hidden">Sind</span>
                </button>
            </div>

            {/* Níveis */}
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((level) => {
                    // Hide level 4 for 'identification' or 'concepts' as requested
                    if (level === 4 && (gameMode === 'identification' || gameMode === 'concepts')) return null;

                    return (
                      <button
                        key={level}
                        onClick={() => { 
                            setDifficulty(level); 
                            // Restart game immediately on difficulty change to apply settings
                            setTimeout(() => startCountdown(), 10);
                        }}
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all border-2
                          ${difficulty === level 
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                            : 'border-slate-200 text-slate-400 hover:border-emerald-200'}`}
                      >
                        {level}
                      </button>
                    );
                })}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 w-full">
           <div 
             className="h-full bg-emerald-500 transition-all duration-500 ease-out"
             style={{ width: `${getCurrentProgress()}%` }}
           />
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 flex flex-col justify-center">
        
        {/* WIN SCREEN */}
        {hasWon ? (
           <div className="bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in duration-300 border-2 border-emerald-100">
             <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
               <Trophy className="w-10 h-10 text-emerald-600" />
             </div>
             <h2 className="text-3xl font-black text-slate-800 mb-2">Parabéns, {playerName}!</h2>
             <p className="text-slate-600 mb-6">
               Você dominou o módulo 
               <span className="font-bold text-emerald-600">
                 {gameMode === 'classification' ? ' 2º Seminário' : (gameMode === 'concepts' ? ' 1º Seminário' : ' Síndromes')}
               </span>!
             </p>
             
             <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
               <div className="text-sm text-slate-500 uppercase tracking-wide font-semibold mb-1">Tempo Total</div>
               <div className="text-4xl font-mono font-bold text-slate-800">{formatTime(elapsedTime)}</div>
             </div>

             {/* Feedback de erro ao salvar */}
             {saveError && (
               <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center justify-center gap-2">
                 <AlertCircle className="w-4 h-4" />
                 {saveError}
               </div>
             )}

             <div className="space-y-3">
               {!scoreSaved ? (
                 <button 
                   onClick={saveScore}
                   disabled={isSaving}
                   className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                 >
                   {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
                   {isSaving ? "Salvando..." : "Registrar no Ranking"}
                 </button>
               ) : (
                 <div className="w-full py-4 bg-green-50 text-green-700 rounded-xl font-bold border border-green-200 flex items-center justify-center gap-2">
                   <CheckCircle className="w-5 h-5" />
                   Pontuação Salva!
                 </div>
               )}

               <div className="flex gap-3">
                  <button 
                    onClick={startCountdown}
                    className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Jogar Novamente
                  </button>
                  <button 
                    onClick={handleBackToMenu}
                    className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Home className="w-5 h-5" />
                    Menu
                  </button>
               </div>
             </div>
           </div>
        ) : (
          /* GAME CARD */
          <div className="w-full">
            {/* CARD DISPLAY */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[250px] flex flex-col items-center justify-center p-6 text-center border border-slate-100 relative mb-6">
               {/* Streak Dots */}
               <div className="absolute top-4 right-4 flex gap-1">
                 {[...Array(REQUIRED_STREAK)].map((_, i) => (
                   <div 
                     key={i}
                     className={`w-2 h-2 rounded-full transition-colors duration-300 
                       ${i < (
                         gameMode === 'classification' 
                           ? (classCards.find(c => c.diseaseId === currentClassId)?.streak || 0)
                           : (gameMode === 'concepts'
                               ? (conceptCards.find(c => c.diseaseId === currentConceptId)?.streak || 0)
                               : (syndromeCards.find(c => c.diseaseId === currentSyndromeId)?.streak || 0)
                             )
                         ) 
                         ? 'bg-emerald-400' 
                         : 'bg-slate-200'}`}
                   />
                 ))}
               </div>

               {gameMode === 'classification' && currentClassId && (
                  <>
                     <div className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">Doença</div>
                     <h2 className="text-2xl md:text-4xl font-black text-slate-800 leading-tight">
                       {diseases.find(d => d.id === currentClassId)?.name}
                     </h2>
                  </>
               )}

               {(gameMode === 'identification' || gameMode === 'concepts') && (
                  <div className="w-full text-left">
                     {gameMode === 'identification' && currentSyndromeId && (
                        <>
                           <div className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4 text-center">Identifique a Síndrome</div>
                           <ul className="space-y-3">
                              {syndromes.find(s => s.id === currentSyndromeId)?.features.map((feature, idx) => {
                                 const parts = feature.split(':');
                                 const label = parts[0];
                                 const content = parts.slice(1).join(':');
                                 return (
                                    <li key={idx} className="text-sm md:text-base text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                       <span className="font-bold text-slate-900">{label}:</span>{content}
                                    </li>
                                 )
                              })}
                           </ul>
                        </>
                     )}
                     {gameMode === 'concepts' && currentConceptId && (
                         <>
                             <div className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4 text-center">Identifique o Conceito</div>
                             <ul className="space-y-3">
                                 {concepts.find(c => c.id === currentConceptId)?.description.map((desc, idx) => (
                                     <li key={idx} className="text-sm md:text-base text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 flex gap-2">
                                         <div className="min-w-[6px] h-[6px] rounded-full bg-emerald-400 mt-2 shrink-0" />
                                         <span>{desc}</span>
                                     </li>
                                 ))}
                             </ul>
                         </>
                     )}
                  </div>
               )}
            </div>

            {/* FEEDBACK OVERLAY */}
            {feedback.status && (
               <div className={`mb-6 p-4 rounded-2xl flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-2
                 ${feedback.status === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                 {feedback.status === 'correct' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                 <div className="text-center">
                   <p className="font-bold text-lg">{feedback.message}</p>
                   {feedback.correctAnswer && (
                     <p className="text-sm opacity-90 mt-1">Resposta: {feedback.correctAnswer}</p>
                   )}
                 </div>
               </div>
            )}

            {/* ANSWER BUTTONS */}
            <div className={`grid gap-3 ${gameMode === 'classification' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* MODE 1: CLASSIFICATION OPTIONS */}
              {gameMode === 'classification' && classificationOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleClassificationAnswer(option)}
                  disabled={!!feedback.status}
                  className={`p-4 rounded-xl border-2 font-bold text-sm md:text-base transition-all transform active:scale-[0.98] shadow-sm
                    ${feedback.status 
                      ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400' 
                      : (difficulty === 3 || difficulty === 4) // Grayscale check
                        ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                        : getClassificationColor(option)
                    }`}
                >
                  {option}
                </button>
              ))}

              {/* MODE 2: SYNDROME OPTIONS */}
              {gameMode === 'identification' && syndromeOptions.map((option, idx) => (
                <button
                  key={option.id}
                  onClick={() => handleSyndromeAnswer(option.id)}
                  disabled={!!feedback.status}
                  className={`p-4 rounded-xl border-2 font-bold text-left md:text-center text-sm md:text-lg transition-all transform active:scale-[0.98] shadow-sm flex items-center gap-3 md:justify-center
                    ${feedback.status 
                       ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400' 
                       : getOptionColor(idx) // Always colored for syndromes as requested
                    }`}
                >
                   {/* Option Letter (A, B, C, D) for easier mobile tapping */}
                   <span className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-xs font-black uppercase shrink-0">
                      {String.fromCharCode(65 + idx)}
                   </span>
                   {option.name}
                </button>
              ))}

               {/* MODE 3: CONCEPT OPTIONS */}
               {gameMode === 'concepts' && conceptOptions.map((option, idx) => (
                   <button
                       key={option.id}
                       onClick={() => handleConceptAnswer(option.id)}
                       disabled={!!feedback.status}
                       className={`p-4 rounded-xl border-2 font-bold text-left md:text-center text-sm md:text-lg transition-all transform active:scale-[0.98] shadow-sm flex items-center gap-3 md:justify-center
                    ${feedback.status
                           ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                           : getOptionColor(idx)
                       }`}
                   >
                       <span className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-xs font-black uppercase shrink-0">
                           {String.fromCharCode(65 + idx)}
                       </span>
                       {option.name}
                   </button>
               ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
