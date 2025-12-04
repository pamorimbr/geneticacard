import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { diseases } from './data';
import { CardState, Classification, Disease } from './types';
import { Brain, RefreshCw, CheckCircle, AlertCircle, Award, Activity } from 'lucide-react';

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

const App: React.FC = () => {
  // --- State ---
  const [cards, setCards] = useState<CardState[]>(() => {
    // Initialize cards with 0 streak
    return diseases.map(d => ({
      diseaseId: d.id,
      streak: 0,
      isMastered: false
    }));
  });

  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
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
    // If no active cards left, user wins
    if (activeCards.length === 0) {
      setHasWon(true);
      setCurrentCardId(null);
      return;
    }

    // Weighted Random Selection:
    // We want to favor cards that are active. 
    // To prevent immediate repetition of the same card if possible:
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

  const handleAnswer = (classification: Classification) => {
    if (!currentCardId || feedback.status !== null) return; // Prevent double clicks

    const currentDisease = diseases.find(d => d.id === currentCardId);
    if (!currentDisease) return;

    const isCorrect = currentDisease.classification === classification;

    if (isCorrect) {
      setFeedback({ status: 'correct', message: 'Correto! Continue assim.' });
      
      // Update State
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

      // Delay for user to see feedback
      setTimeout(() => pickNextCard(), 1000);

    } else {
      setFeedback({ 
        status: 'incorrect', 
        message: 'Incorreto. A sequência foi resetada.',
        correctAnswer: currentDisease.classification 
      });

      // Update State: Reset streak to 0
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
      
      // Longer delay for error to read the correct answer
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
    setCurrentCardId(null); // Will trigger effect to pick new card
  };

  // --- Derived UI Data ---
  const currentDisease = diseases.find(d => d.id === currentCardId);
  const masteredCount = cards.filter(c => c.isMastered).length;
  const totalCount = cards.length;
  const progressPercentage = Math.round((masteredCount / totalCount) * 100);

  // Current streak for the displayed card
  const currentCardState = cards.find(c => c.diseaseId === currentCardId);
  const streakForUI = currentCardState ? currentCardState.streak : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center py-8 px-4">
      
      {/* Header */}
      <header className="w-full max-w-2xl mb-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
            <Activity className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Flashcards Genética</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase font-semibold">Progresso</p>
          <div className="flex items-center gap-2">
             <span className="text-xl font-bold text-indigo-600">{masteredCount}</span>
             <span className="text-slate-400">/</span>
             <span className="text-xl font-bold text-slate-400">{totalCount}</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full max-w-2xl h-3 bg-slate-200 rounded-full mb-8 overflow-hidden shadow-inner">
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
              <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-slate-100 relative overflow-hidden min-h-[300px] flex flex-col justify-center items-center text-center transition-all">
                
                {/* Visual Streak Indicator inside card */}
                <div className="absolute top-4 right-4 flex gap-1">
                   {[...Array(REQUIRED_STREAK)].map((_, i) => (
                     <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < streakForUI ? 'bg-green-500' : 'bg-slate-200'}`} />
                   ))}
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl mb-6">
                  <Brain className="w-10 h-10 text-indigo-600" />
                </div>
                
                <h2 className="text-2xl md:text-4xl font-extrabold text-slate-800 leading-tight">
                  {currentDisease.name}
                </h2>
                
                <p className="text-slate-400 mt-4 text-sm font-medium uppercase tracking-wider">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(Classification).map((classification) => {
                  const baseStyle = "p-6 rounded-2xl font-bold text-lg transition-all duration-200 shadow-sm border-2 relative overflow-hidden group";
                  const colorStyle = getClassificationColor(classification);
                  
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
              
              <div className="text-center">
                 <p className="text-sm text-slate-400">
                    Responda corretamente {REQUIRED_STREAK} vezes consecutivas para fixar.
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