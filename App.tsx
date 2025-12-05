import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { diseases } from './data';
import { CardState, Classification, Disease } from './types';
import { Brain, RefreshCw, CheckCircle, AlertCircle, Award, Activity, Settings, BarChart3 } from 'lucide-react';

const REQUIRED_STREAK = 3;

// Helper to get color for visual feedback
const getClassificationColor = (type: Classification) => {
  switch (type) {
    case Classification.X_DOMINANTE: return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
    case Classification.X_RECESSIVA: return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    case Classification.AUTO_DOMINANTE: return 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200';
    case Classification.AUTO_RECESSIVA: return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200';
    default: return 'bg-gray-100';
  }
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

const App: React.FC = () => {
  // --- State ---
  const [cards, setCards] = useState<CardState[]>(() => {
    return diseases.map(d => ({
      diseaseId: d.id,
      streak: 0,
      isMastered: false
    }));
  });

  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<number>(2); // Default to Level 2 (Color + Shuffle)
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'incorrect' | null;
    message?: string;
    correctAnswer?: Classification;
  }>({ status: null });
  
  const [hasWon, setHasWon] = useState(false);

  // --- Logic ---

  // Filter active cards (those not yet mastered)
  const activeCards = useMemo(() => cards.filter(c => !c.isMastered), [cards]);
  
  // Select a new card
  const pickNextCard = useCallback(() => {
    if (activeCards.length === 0) {
      setHasWon(true);
      setCurrentCardId(null);
      return;
    }

    let pool = activeCards;
    if (activeCards.length > 1 && currentCardId) {
      pool = activeCards.filter(c => c.diseaseId !== currentCardId);
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    setCurrentCardId(pool[randomIndex].diseaseId);
    setFeedback({ status: null });
  }, [activeCards, currentCardId]);

  // Initial load
  useEffect(() => {
    if (!currentCardId && !hasWon) {
      pickNextCard();
    }
  }, [pickNextCard, currentCardId, hasWon]);

  // Determine options to display based on difficulty
  const displayOptions = useMemo(() => {
    const baseOptions = Object.values(Classification);
    
    // Level 1 (Color Fixed) & Level 3 (No-Color Fixed) -> Fixed Order
    if (difficulty === 1 || difficulty === 3) {
      return baseOptions;
    }
    
    // Level 2 (Color Shuffle) & Level 4 (No-Color Shuffle) -> Shuffled Order
    return shuffleArray(baseOptions);
  }, [currentCardId, difficulty]);

  // Determine button style based on difficulty
  const getButtonStyle = (classification: Classification) => {
    // Level 3 & 4 -> No Colors (Grayscale/Neutral)
    if (difficulty >= 3) {
      return 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-indigo-300';
    }
    // Level 1 & 2 -> Colored
    return getClassificationColor(classification);
  };

  const getDifficultyLabel = (level: number) => {
    switch(level) {
      case 1: return "Cores + Fixo";
      case 2: return "Cores + Alternando";
      case 3: return "Sem Cores + Fixo";
      case 4: return "Sem Cores + Alternando";
      default: return "";
    }
  };

  const handleAnswer = (classification: Classification) => {
    if (!currentCardId || feedback.status !== null) return;

    const currentDisease = diseases.find(d => d.id === currentCardId);
    if (!currentDisease) return;

    const isCorrect = currentDisease.classification === classification;

    if (isCorrect) {
      setFeedback({ status: 'correct', message: 'Correto! Continue assim.' });
      
      setCards(prev => prev.map(card => {
        if (card.diseaseId === currentCardId) {
          const newStreak = card.streak + 1;
          return {
            ...card,
            streak: newStreak,
            isMastered: newStreak >= REQUIRED_STREAK
          };
        }
        return card;
      }));

      setTimeout(() => pickNextCard(), 1000);

    } else {
      setFeedback({ 
        status: 'incorrect', 
        message: 'Incorreto. A sequência foi resetada.',
        correctAnswer: currentDisease.classification 
      });

      setCards(prev => prev.map(card => {
        if (card.diseaseId === currentCardId) {
          return {
            ...card,
            streak: 0, 
            isMastered: false 
          };
        }
        return card;
      }));
      
      setTimeout(() => pickNextCard(), 2500);
    }
  };

  const handleReset = () => {
    setCards(diseases.map(d => ({
      diseaseId: d.id,
      streak: 0,
      isMastered: false
    })));
    setHasWon(false);
    setCurrentCardId(null);
  };

  const currentDisease = diseases.find(d => d.id === currentCardId);
  const masteredCount = cards.filter(c => c.isMastered).length;
  const totalCount = cards.length;
  const progressPercentage = Math.round((masteredCount / totalCount) * 100);
  const currentCardState = cards.find(c => c.diseaseId === currentCardId);
  const streakForUI = currentCardState ? currentCardState.streak : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center py-6 px-4">
      
      {/* Header */}
      <header className="w-full max-w-2xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
            <Activity className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Flashcards Genética</h1>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            {/* Difficulty Selector */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex">
                {[1, 2, 3, 4].map((level) => (
                <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${
                    difficulty === level 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                    title={`Nível ${level}: ${getDifficultyLabel(level)}`}
                >
                    {level}
                </button>
                ))}
            </div>

            <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Progresso</p>
                <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-indigo-600">{masteredCount}</span>
                    <span className="text-slate-400 text-sm">/</span>
                    <span className="text-lg font-bold text-slate-400">{totalCount}</span>
                </div>
            </div>
        </div>
      </header>
      
      {/* Difficulty Info Badge */}
      <div className="w-full max-w-2xl flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-500">
             <BarChart3 className="w-3 h-3" />
             <span>Dificuldade: <span className="text-indigo-600 font-bold">{getDifficultyLabel(difficulty)}</span></span>
          </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-2xl h-2.5 bg-slate-200 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Game Area */}
      <main className="w-full max-w-2xl relative perspective-1000">
        
        {hasWon ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center border-2 border-emerald-100 flex flex-col items-center animate-fade-in-up">
            <div className="bg-emerald-100 p-6 rounded-full mb-6">
              <Award className="w-16 h-16 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Parabéns!</h2>
            <p className="text-slate-600 mb-8 text-lg">
              Você zerou todas as doenças! Você fixou os nomes e classificações com sucesso.
            </p>
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-1"
            >
              <RefreshCw className="w-5 h-5" />
              Reiniciar Estudo
            </button>
          </div>
        ) : (
          currentDisease && (
            <div className="flex flex-col gap-6">
              
              {/* The Card */}
              <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-slate-100 relative overflow-hidden min-h-[280px] flex flex-col justify-center items-center text-center transition-all">
                
                {/* Visual Streak Indicator inside card */}
                <div className="absolute top-4 right-4 flex gap-1">
                   {[...Array(REQUIRED_STREAK)].map((_, i) => (
                     <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < streakForUI ? 'bg-green-500' : 'bg-slate-200'}`} />
                   ))}
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl mb-6">
                  <Brain className="w-10 h-10 text-indigo-600" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight">
                  {currentDisease.name}
                </h2>
                
                <p className="text-slate-400 mt-4 text-xs font-bold uppercase tracking-wider">
                  Qual a classificação?
                </p>

                {/* Feedback Overlay */}
                {feedback.status && (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center bg-opacity-95 backdrop-blur-sm z-10 transition-all duration-300 ${feedback.status === 'correct' ? 'bg-emerald-50/95' : 'bg-rose-50/95'}`}>
                    {feedback.status === 'correct' ? (
                      <>
                        <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 drop-shadow-sm" />
                        <h3 className="text-2xl font-bold text-emerald-700">Correto!</h3>
                        <p className="text-emerald-600 mt-2 font-medium">Streak: {streakForUI} / {REQUIRED_STREAK}</p>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-16 h-16 text-rose-500 mb-4 drop-shadow-sm" />
                        <h3 className="text-2xl font-bold text-rose-700">Incorreto</h3>
                        <p className="text-rose-600 mt-2 font-medium">A resposta correta é:</p>
                        <p className="text-rose-800 font-bold mt-1 text-lg px-4 text-center">{feedback.correctAnswer}</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Interaction Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayOptions.map((classification) => {
                  const baseStyle = "p-5 rounded-2xl font-bold text-base md:text-lg transition-all duration-200 shadow-sm border-2 relative overflow-hidden group min-h-[80px] flex items-center justify-center text-center";
                  const colorStyle = getButtonStyle(classification);
                  
                  return (
                    <button
                      key={classification}
                      onClick={() => handleAnswer(classification)}
                      disabled={feedback.status !== null}
                      className={`${baseStyle} ${colorStyle} ${feedback.status !== null ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-md active:scale-95'}`}
                    >
                      <span className="relative z-10">{classification}</span>
                    </button>
                  );
                })}
              </div>
              
              <div className="text-center mt-2">
                 <p className="text-xs text-slate-400">
                    Responda corretamente {REQUIRED_STREAK} vezes seguidas para fixar.
                 </p>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;