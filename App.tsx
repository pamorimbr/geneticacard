import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { diseases, syndromes } from './data';
import { CardState, Classification, Disease, Syndrome } from './types';
import { Brain, RefreshCw, CheckCircle, AlertCircle, Award, Activity, Dna, Stethoscope, Heart } from 'lucide-react';

const REQUIRED_STREAK = 3;

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

// Helper for button colors in Game Mode 2
const getSyndromeOptionColor = (index: number) => {
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

type GameMode = 'classification' | 'identification';

const App: React.FC = () => {
  // --- Global State ---
  const [gameMode, setGameMode] = useState<GameMode>('classification');
  const [difficulty, setDifficulty] = useState<number>(2); // 1-4
  const [hasWon, setHasWon] = useState(false);

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

  // --- Shared Feedback State ---
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'incorrect' | null;
    message?: string;
    correctAnswer?: string;
  }>({ status: null });

  // --- Logic for Classification Mode ---
  const activeClassCards = useMemo(() => classCards.filter(c => !c.isMastered), [classCards]);
  
  const pickNextClassCard = useCallback(() => {
    if (activeClassCards.length === 0) {
      setHasWon(true);
      setCurrentClassId(null);
      return;
    }
    let pool = activeClassCards;
    // Avoid repeating the immediate previous card if possible
    if (activeClassCards.length > 1 && currentClassId) {
      pool = activeClassCards.filter(c => c.diseaseId !== currentClassId);
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    setCurrentClassId(pool[randomIndex].diseaseId);
    setFeedback({ status: null });
  }, [activeClassCards, currentClassId]);

  // --- Logic for Identification Mode ---
  // Calculates the active pool of syndrome cards based on difficulty (chunking)
  const activeSyndromeCards = useMemo(() => {
    const unmastered = syndromeCards.filter(c => !c.isMastered);
    
    // Level 3 uses the full pool
    if (difficulty >= 3) return unmastered;

    // Level 1: Chunks of 3. Level 2: Chunks of 6.
    const chunkSize = difficulty === 1 ? 3 : 6;
    
    // Determine which chunk is currently active.
    // We iterate through the static 'syndromes' list in chunks.
    // The first chunk that contains ANY unmastered card becomes the active chunk.
    for (let i = 0; i < syndromes.length; i += chunkSize) {
      const chunkSlice = syndromes.slice(i, i + chunkSize);
      const chunkIds = chunkSlice.map(s => s.id);
      
      const chunkHasUnmastered = unmastered.some(c => chunkIds.includes(c.diseaseId));
      
      if (chunkHasUnmastered) {
        // Return only the unmastered cards belonging to this chunk
        return unmastered.filter(c => chunkIds.includes(c.diseaseId));
      }
    }
    
    // If no chunks have unmastered cards (should be caught by hasWon logic, but safe fallback)
    return [];
  }, [syndromeCards, difficulty]);

  const pickNextSyndromeCard = useCallback(() => {
    if (activeSyndromeCards.length === 0) {
      setHasWon(true);
      setCurrentSyndromeId(null);
      return;
    }
    
    // Pick next card
    let pool = activeSyndromeCards;
    if (activeSyndromeCards.length > 1 && currentSyndromeId) {
      pool = activeSyndromeCards.filter(c => c.diseaseId !== currentSyndromeId);
    }
    const nextCard = pool[Math.floor(Math.random() * pool.length)];
    const correctSyndrome = syndromes.find(s => s.id === nextCard.diseaseId);
    
    if (correctSyndrome) {
      // Generate Options: Correct + 3 Random Distractors
      const otherSyndromes = syndromes.filter(s => s.id !== correctSyndrome.id);
      const distractors = shuffleArray(otherSyndromes).slice(0, 3);
      const options = shuffleArray([correctSyndrome, ...distractors]);
      
      setSyndromeOptions(options);
      setCurrentSyndromeId(nextCard.diseaseId);
      setFeedback({ status: null });
    }
  }, [activeSyndromeCards, currentSyndromeId]);

  // --- Initial Load & Mode Switching ---
  // Reset states when mode changes
  useEffect(() => {
    setHasWon(false);
    setFeedback({ status: null });
    setCurrentClassId(null);
    setCurrentSyndromeId(null);

    // Clamp difficulty if switching to identification (max 3)
    if (gameMode === 'identification' && difficulty > 3) {
      setDifficulty(3);
    }
  }, [gameMode]);

  // Trigger the first card pick safely
  useEffect(() => {
    if (hasWon) return;

    if (gameMode === 'classification') {
      if (activeClassCards.length === 0) {
        setHasWon(true);
      } else if (!currentClassId) {
        // Only pick if no card is currently selected
        pickNextClassCard();
      }
    } else {
      if (activeSyndromeCards.length === 0) {
        // We check if ALL cards are mastered, not just the chunk
        // However, activeSyndromeCards logic returns [] only if ALL chunks are done
        const allMastered = syndromeCards.every(c => c.isMastered);
        if (allMastered) {
          setHasWon(true);
        } else {
          // This case handles chunk transitions automatically 
          // (activeSyndromeCards updates to next chunk, useEffect fires)
          if (!currentSyndromeId) pickNextSyndromeCard();
        }
      } else if (!currentSyndromeId) {
        // Only pick if no card is currently selected
        pickNextSyndromeCard();
      }
    }
  }, [
    gameMode, 
    hasWon, 
    activeClassCards.length, 
    activeSyndromeCards, // Depend on the array itself or length
    currentClassId, 
    currentSyndromeId, 
    pickNextClassCard, 
    pickNextSyndromeCard,
    syndromeCards
  ]);

  // --- Helpers ---
  // Grayscale only applies to Classification mode, levels 3+
  const isGrayscale = gameMode === 'classification' && difficulty >= 3;
  
  // Define available levels based on mode
  const availableLevels = gameMode === 'classification' ? [1, 2, 3, 4] : [1, 2, 3];

  // --- Handlers ---

  const handleClassAnswer = (classification: Classification) => {
    if (!currentClassId || feedback.status !== null) return;
    const currentDisease = diseases.find(d => d.id === currentClassId);
    if (!currentDisease) return;

    const isCorrect = currentDisease.classification === classification;
    processAnswer(isCorrect, currentDisease.classification, setClassCards, pickNextClassCard, currentClassId);
  };

  const handleSyndromeAnswer = (selectedSyndromeName: string) => {
    if (!currentSyndromeId || feedback.status !== null) return;
    const currentSyndrome = syndromes.find(s => s.id === currentSyndromeId);
    if (!currentSyndrome) return;

    const isCorrect = currentSyndrome.name === selectedSyndromeName;
    processAnswer(isCorrect, currentSyndrome.name, setSyndromeCards, pickNextSyndromeCard, currentSyndromeId);
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
      setCardsFn(prev => prev.map(card => {
        if (card.diseaseId === currentId) {
          return { ...card, streak: 0, isMastered: false };
        }
        return card;
      }));
      setTimeout(() => nextCardFn(), 2500);
    }
  };

  const handleReset = () => {
    setHasWon(false);
    setFeedback({ status: null });
    
    if (gameMode === 'classification') {
      setClassCards(diseases.map(d => ({ diseaseId: d.id, streak: 0, isMastered: false })));
      setCurrentClassId(null); // Will trigger useEffect to pick new
    } else {
      setSyndromeCards(syndromes.map(s => ({ diseaseId: s.id, streak: 0, isMastered: false })));
      setCurrentSyndromeId(null); // Will trigger useEffect to pick new
    }
  };

  // --- Render Helpers ---
  const currentMasteredCount = gameMode === 'classification' 
    ? classCards.filter(c => c.isMastered).length 
    : syndromeCards.filter(c => c.isMastered).length;
  
  const totalCount = gameMode === 'classification' ? diseases.length : syndromes.length;
  const progressPercentage = Math.round((currentMasteredCount / totalCount) * 100);

  // Current Card Data
  const currentClassData = diseases.find(d => d.id === currentClassId);
  const currentSyndromeData = syndromes.find(s => s.id === currentSyndromeId);
  
  const currentCardState = gameMode === 'classification'
    ? classCards.find(c => c.diseaseId === currentClassId)
    : syndromeCards.find(c => c.diseaseId === currentSyndromeId);
    
  const streakForUI = currentCardState ? currentCardState.streak : 0;

  // Options for Classification Mode
  const classOptions = useMemo(() => {
    const base = Object.values(Classification);
    // Level 1/3 = Fixed, Level 2/4 = Shuffled
    return (difficulty === 1 || difficulty === 3) ? base : shuffleArray(base);
  }, [difficulty, currentClassId]);

  // Labels for difficulty based on mode
  const getDifficultyLabel = (level: number) => {
    if (gameMode === 'classification') {
      if (level === 1) return 'Cores + Fixo';
      if (level === 2) return 'Cores + Alternado';
      if (level === 3) return 'Cinza + Fixo';
      if (level === 4) return 'Cinza + Alternado';
    } else {
      if (level === 1) return 'Grupos de 3';
      if (level === 2) return 'Grupos de 6';
      if (level === 3) return 'Aleatório (12)';
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center py-6 px-4 font-sans">
      
      {/* Header & Mode Switcher */}
      <header className="w-full max-w-2xl mb-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
              <Activity className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Flashcards Genética</h1>
          </div>

          <div className="flex gap-2">
             <button
               onClick={() => setGameMode('classification')}
               className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${gameMode === 'classification' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
             >
               <Dna className="w-4 h-4" />
               Classificação
             </button>
             <button
               onClick={() => setGameMode('identification')}
               className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${gameMode === 'identification' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
             >
               <Stethoscope className="w-4 h-4" />
               Síndromes
             </button>
          </div>
        </div>

        {/* Difficulty & Stats */}
        <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase hidden md:inline">Dificuldade:</span>
                <div className="flex gap-1">
                  {availableLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`w-8 h-8 rounded-md text-sm font-bold transition-all ${
                        difficulty === level 
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                          : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Progresso</p>
                  <p className="text-sm font-bold text-slate-700">{currentMasteredCount} / {totalCount}</p>
                </div>
             </div>
           </div>
           
           <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide text-center bg-slate-50 py-1 rounded">
              Modo Atual: {getDifficultyLabel(difficulty)}
           </div>
        </div>

        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
        </div>
      </header>
      
      {/* Game Area */}
      <main className="w-full max-w-2xl relative perspective-1000">
        
        {hasWon ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center border-2 border-emerald-100 flex flex-col items-center animate-fade-in-up">
            <div className="bg-emerald-100 p-6 rounded-full mb-6">
              <Award className="w-16 h-16 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Parabéns!</h2>
            <p className="text-slate-600 mb-8 text-lg">
              Você completou o módulo de {gameMode === 'classification' ? 'Classificação' : 'Identificação de Síndromes'}!
            </p>
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Reiniciar Módulo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* --- CARD DISPLAY --- */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden min-h-[300px] flex flex-col transition-all">
               {/* Streak Dots */}
               <div className="absolute top-4 right-4 flex gap-1 z-10">
                  {[...Array(REQUIRED_STREAK)].map((_, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < streakForUI ? 'bg-green-500' : 'bg-slate-200'}`} />
                  ))}
               </div>

               {/* Feedback Overlay */}
               {feedback.status && (
                 <div className={`absolute inset-0 flex flex-col items-center justify-center bg-opacity-95 backdrop-blur-sm z-20 transition-all duration-300 p-6 text-center ${feedback.status === 'correct' ? 'bg-emerald-50/95' : 'bg-rose-50/95'}`}>
                   {feedback.status === 'correct' ? (
                     <>
                       <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                       <h3 className="text-2xl font-bold text-emerald-700">Correto!</h3>
                     </>
                   ) : (
                     <>
                       <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
                       <h3 className="text-2xl font-bold text-rose-700">Incorreto</h3>
                       <p className="text-rose-600 mt-2 font-medium">Resposta correta:</p>
                       <p className="text-rose-800 font-bold mt-1 text-lg">{feedback.correctAnswer}</p>
                     </>
                   )}
                 </div>
               )}

               {/* Card Content */}
               <div className="p-8 md:p-10 flex flex-col items-center justify-center flex-grow">
                 
                 {gameMode === 'classification' && currentClassData && (
                   <>
                     <div className="bg-indigo-50 p-4 rounded-2xl mb-6">
                       <Brain className="w-10 h-10 text-indigo-600" />
                     </div>
                     <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight text-center">
                       {currentClassData.name}
                     </h2>
                     <p className="text-slate-400 mt-6 text-xs font-bold uppercase tracking-wider">Qual a classificação?</p>
                   </>
                 )}

                 {gameMode === 'identification' && currentSyndromeData && (
                   <div className="w-full">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Stethoscope className="w-6 h-6 text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Identifique a Síndrome</span>
                      </div>
                      <div className="space-y-3 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {currentSyndromeData.features.map((feature, idx) => {
                          const [title, content] = feature.split(':');
                          return (
                            <div key={idx} className="text-sm md:text-base text-slate-700">
                              {content ? (
                                <>
                                  <span className="font-bold text-slate-900">{title}:</span>{content}
                                </>
                              ) : (
                                <span>{feature}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                   </div>
                 )}
               </div>
            </div>

            {/* --- BUTTON OPTIONS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {gameMode === 'classification' && classOptions.map((classification) => {
                  const colorClass = isGrayscale 
                    ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-indigo-300' 
                    : getClassificationColor(classification);

                  return (
                    <button
                      key={classification}
                      onClick={() => handleClassAnswer(classification)}
                      disabled={feedback.status !== null}
                      className={`p-4 rounded-xl font-bold text-sm md:text-base border-2 shadow-sm transition-all active:scale-95 hover:shadow-md min-h-[70px] ${colorClass} ${feedback.status !== null ? 'opacity-50' : ''}`}
                    >
                      {classification}
                    </button>
                  );
              })}

              {gameMode === 'identification' && syndromeOptions.map((syndrome, idx) => {
                 const colorClass = isGrayscale
                    ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-indigo-300'
                    : getSyndromeOptionColor(idx); // Use random colors for options since they aren't categories

                 return (
                   <button
                      key={syndrome.id}
                      onClick={() => handleSyndromeAnswer(syndrome.name)}
                      disabled={feedback.status !== null}
                      className={`p-4 rounded-xl font-bold text-sm md:text-base border-2 shadow-sm transition-all active:scale-95 hover:shadow-md min-h-[60px] ${colorClass} ${feedback.status !== null ? 'opacity-50' : ''}`}
                   >
                     {syndrome.name}
                   </button>
                 );
              })}

            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 mb-6 text-center space-y-2">
         <p className="text-slate-500 text-sm font-medium flex items-center justify-center gap-1.5">
           Feito com <Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> para estudantes de medicina.
         </p>
         <p className="text-slate-700 font-bold text-sm">
           Desenvolvido por Pedro Amorim
         </p>
         <p className="text-slate-400 text-xs">
           © 2025 Flashcards de Genética. Todos os direitos reservados.
         </p>
      </footer>
    </div>
  );
};

export default App;