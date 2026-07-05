import React, { useState, useEffect, useRef } from 'react';
import { Workout, WorkoutExercise, Exercise } from '../types';
import { X, Play, Pause, Timer, History, Check, ShieldAlert, Dumbbell, Clock, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActiveWorkoutViewProps {
  workout: Workout;
  workoutExercises: WorkoutExercise[];
  exercises: Exercise[];
  onExit: () => void;
  onSubmitLog: (payload: {
    workout_id: string;
    workout_name: string;
    duration: number;
    calories: number;
    notes: string;
  }) => void;
}

export default function ActiveWorkoutView({
  workout,
  workoutExercises,
  exercises,
  onExit,
  onSubmitLog,
}: ActiveWorkoutViewProps) {
  // Active states
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSeries, setCurrentSeries] = useState(1);

  // Time tracking
  const startTimeRef = useRef(Date.now());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Rest Timer States
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Final submit states
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [customCalories, setCustomCalories] = useState(0);
  const [customDuration, setCustomDuration] = useState(0);

  // Fetch current items
  const activeWorkoutExercises = workoutExercises.filter((we) => we.workout_id === workout.id);
  const activeWE = activeWorkoutExercises[currentExIdx] || null;
  const activeEx = activeWE ? exercises.find((ex) => ex.id === activeWE.exercise_id) : null;

  // Track session elapsed minutes
  useEffect(() => {
    const elapsedTimer = setInterval(() => {
      const mins = Math.floor((Date.now() - startTimeRef.current) / 60000);
      setElapsedMinutes(mins || 1); // default to at least 1 min
    }, 10000);
    return () => clearInterval(elapsedTimer);
  }, []);

  // Timer interval control
  useEffect(() => {
    if (isResting && !isTimerPaused) {
      timerIntervalRef.current = setInterval(() => {
        setRestSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsResting(false);
            // Flash or play a subtle sound if possible, but standard alert or notification is fine
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isResting, isTimerPaused]);

  // Handle concluding a series
  const handleConcludeSeries = () => {
    if (!activeWE) return;

    if (currentSeries < activeWE.series) {
      // Move to next series and trigger rest timer!
      setCurrentSeries(currentSeries + 1);

      // Parse rest time (e.g. "01:45" to seconds)
      const restParts = activeWE.rest_time.split(':');
      const mins = parseInt(restParts[0]) || 1;
      const secs = parseInt(restParts[1]) || 30;
      const totalSecs = mins * 60 + secs;

      setRestSecondsLeft(totalSecs);
      setIsResting(true);
      setIsTimerPaused(false);
    } else {
      // Concluding last series of current exercise -> move to next exercise!
      handleNextExercise();
    }
  };

  // Handle advancing to next exercise
  const handleNextExercise = () => {
    setIsResting(false);
    if (currentExIdx < activeWorkoutExercises.length - 1) {
      setCurrentExIdx(currentExIdx + 1);
      setCurrentSeries(1);
    } else {
      // Workout is finished! Open summary modal
      handleOpenSummary();
    }
  };

  const handleOpenSummary = () => {
    const totalMins = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 60000));
    setCustomDuration(totalMins);
    setCustomCalories(totalMins * 8); // estimate 8 calories per minute of high intensity
    setShowSummaryModal(true);
  };

  const handleSaveLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitLog({
      workout_id: workout.id,
      workout_name: workout.name,
      duration: customDuration,
      calories: customCalories,
      notes: sessionNotes.trim(),
    });
  };

  const formatRestTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage completed
  const totalSteps = activeWorkoutExercises.length;
  const currentStep = currentExIdx + 1;
  const progressPercent = Math.round((currentExIdx / totalSteps) * 100);

  if (!activeWE || !activeEx) {
    return (
      <div className="glass-panel p-lg rounded-2xl text-center space-y-md">
        <ShieldAlert className="w-10 h-10 text-primary-container mx-auto" />
        <div>
          <h3 className="text-body-lg font-bold text-white">Nenhum Exercício Configurado</h3>
          <p className="text-body-md text-on-surface-variant">Este treino não possui exercícios. Adicione exercícios no planejador primeiro.</p>
        </div>
        <button onClick={onExit} className="bg-primary-container text-on-primary px-4 py-2 rounded-lg font-bold">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="space-y-md pb-12"
    >
      {/* Top Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#131313]/90 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-margin-mobile h-16">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-2xl animate-pulse">bolt</span>
          <h1 className="text-headline-md font-extrabold tracking-tight text-white uppercase">
            {workout.name}
          </h1>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#201f1f] text-on-surface-variant hover:text-white transition-colors"
        >
          <span className="text-label-md font-bold uppercase tracking-wider text-xs">Sair</span>
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Spacer for fixed header */}
      <div className="pt-16" />

      {/* Progress Indicator */}
      <div className="space-y-xs pt-xs">
        <div className="flex justify-between items-end">
          <span className="text-label-md text-on-surface-variant font-bold uppercase tracking-wider">
            Exercício {currentStep} de {totalSteps}
          </span>
          <span className="text-headline-md font-extrabold text-primary-container tracking-tight">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-[#201f1f] rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-container rounded-full transition-all duration-500" 
            style={{ width: `${progressPercent || 5}%` }}
          />
        </div>
      </div>

      {/* Active Exercise Card */}
      <section className="glass-card rounded-2xl p-md space-y-md relative overflow-hidden border border-white/10 shadow-xl">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container" />
        
        <div className="flex justify-between items-start pl-xs">
          <div>
            <h2 className="text-headline-md font-extrabold text-white tracking-tight">
              {activeEx.name_pt}
            </h2>
            <p className="text-body-md text-on-surface-variant font-medium">
              Foco: {activeEx.muscle_group}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-label-md text-primary-container uppercase font-bold tracking-wider">
              Série {currentSeries}/{activeWE.series}
            </span>
            <div className="flex gap-1.5 mt-1.5">
              {Array.from({ length: activeWE.series }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    idx < currentSeries ? 'bg-primary-container scale-110 shadow-[0_0_8px_#CCFF00]' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Target Metrics Display */}
        <div className="grid grid-cols-2 gap-gutter pl-xs">
          <div className="bg-[#0F1115] p-md rounded-xl border border-white/5 text-center">
            <span className="text-label-md text-on-surface-variant block mb-1 uppercase font-bold tracking-wider">
              Meta de Reps
            </span>
            <span className="text-headline-md font-extrabold text-white">{activeWE.repetitions}</span>
          </div>
          <div className="bg-[#0F1115] p-md rounded-xl border border-white/5 text-center">
            <span className="text-label-md text-on-surface-variant block mb-1 uppercase font-bold tracking-wider">
              Carga
            </span>
            <span className="text-headline-md font-extrabold text-white">
              {activeWE.weight} <span className="text-xs text-on-surface-variant font-medium">KG</span>
            </span>
          </div>
        </div>

        {/* Timer countdown controls */}
        <div className="pt-md border-t border-white/5 flex items-center justify-between pl-xs">
          {isResting ? (
            <div className="flex items-center gap-sm bg-primary-container/10 border border-primary-container/20 px-4 py-2 rounded-xl">
              <Timer className="w-5 h-5 text-primary-container animate-pulse" />
              <span className="text-body-lg font-mono font-black text-primary-container tracking-wide animate-pulse">
                Descanso: {formatRestTimer(restSecondsLeft)}
              </span>
              <button 
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="text-white hover:text-primary-container transition-colors p-1"
              >
                {isTimerPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
              </button>
              <button 
                onClick={() => setIsResting(false)}
                className="text-xs text-on-surface-variant hover:text-white uppercase font-bold underline px-1"
              >
                Pular
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Clock className="w-5 h-5 text-[#CCFF00]" />
              <span className="text-sm font-semibold">Descanso sugerido: {activeWE.rest_time}</span>
            </div>
          )}

          <button className="text-label-md text-on-surface-variant flex items-center gap-1 uppercase font-bold hover:text-white transition-colors">
            <History className="w-4 h-4 text-primary-container" />
            Anterior: {activeWE.weight - 5} kg
          </button>
        </div>
      </section>

      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-sm">
        <button
          onClick={handleConcludeSeries}
          className="bg-primary-container text-on-primary font-black h-14 rounded-xl active:scale-95 hover:brightness-110 transition-all flex items-center justify-center gap-2 uppercase shadow-lg shadow-primary-container/10 tracking-wider text-sm"
        >
          <Check className="w-5 h-5 stroke-[3px]" />
          Concluir Série
        </button>
        <button
          onClick={handleNextExercise}
          className="border-2 border-primary-container text-primary-container font-black h-14 rounded-xl active:scale-95 hover:bg-primary-container/5 transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
        >
          Próximo Exercício
        </button>
      </div>

      {/* Routine Queue */}
      <div className="space-y-sm">
        <h3 className="text-label-md text-on-surface-variant tracking-widest uppercase font-bold">
          Rotina do Treino Ativo
        </h3>
        <div className="space-y-xs">
          {activeWorkoutExercises.map((we, index) => {
            const ex = exercises.find((e) => e.id === we.exercise_id);
            if (!ex) return null;

            const isCompleted = index < currentExIdx;
            const isCurrent = index === currentExIdx;
            const isUpcoming = index > currentExIdx;

            return (
              <div
                key={we.id}
                className={`flex items-center justify-between p-sm rounded-xl transition-all ${
                  isCompleted 
                    ? 'bg-[#1c1b1b]/50 opacity-50' 
                    : isCurrent 
                    ? 'bg-[#2a2a2a] border-l-4 border-primary-container shadow-md' 
                    : 'bg-[#1c1b1b]/30'
                }`}
              >
                <div className="flex items-center gap-md">
                  {isCompleted ? (
                    <div className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
                      <Check className="w-4.5 h-4.5 stroke-[3px]" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
                      <Dumbbell className="w-4.5 h-4.5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1c1b1b] border border-white/5 flex items-center justify-center text-on-surface-variant">
                      <Clock className="w-4 h-4" />
                    </div>
                  )}

                  <span 
                    className={`text-body-md ${
                      isCompleted ? 'line-through text-on-surface-variant font-medium' : isCurrent ? 'font-black text-white' : 'text-on-surface-variant font-medium'
                    }`}
                  >
                    {ex.name_pt}
                  </span>
                </div>

                <span className="text-label-md text-on-surface-variant font-bold">
                  {isCurrent ? 'Atual' : `${we.series}/${we.series} Séries`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Concluir Treino manual footer shortcut */}
      <div className="pt-md text-center">
        <button
          onClick={handleOpenSummary}
          className="text-xs font-bold text-primary-container bg-primary-container/10 hover:bg-primary-container/15 border border-primary-container/20 px-5 py-2.5 rounded-xl uppercase tracking-wider"
        >
          Finalizar Treino Manualmente
        </button>
      </div>

      {/* Summary Concluido Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel w-full max-w-md rounded-2xl p-md md:p-lg border border-primary-container/20 space-y-md text-center my-auto"
          >
            <div className="flex flex-col items-center gap-xs">
              <div className="w-16 h-16 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container mb-xs animate-bounce">
                <Sparkles className="w-8 h-8 fill-current" />
              </div>
              <h2 className="text-headline-md font-black text-white uppercase tracking-tight">Treino Concluído!</h2>
              <p className="text-sm text-on-surface-variant font-semibold">Excelente desempenho! Vamos registrar esta conquista.</p>
            </div>

            <form onSubmit={handleSaveLogSubmit} className="space-y-md text-left">
              <div className="grid grid-cols-2 gap-sm">
                {/* Duration */}
                <div className="space-y-xs bg-[#1c1b1b] p-md rounded-xl border border-white/5 text-center relative">
                  <Clock className="w-5 h-5 text-primary-container absolute right-md top-md" />
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Number(e.target.value))}
                    className="bg-transparent border-none focus:ring-0 text-center text-headline-md font-black text-white w-full py-0"
                    required
                    min="1"
                  />
                </div>

                {/* Calories */}
                <div className="space-y-xs bg-[#1c1b1b] p-md rounded-xl border border-white/5 text-center relative">
                  <Flame className="w-5 h-5 text-secondary-container absolute right-md top-md" />
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
                    Calorias (kcal)
                  </label>
                  <input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(Number(e.target.value))}
                    className="bg-transparent border-none focus:ring-0 text-center text-headline-md font-black text-white w-full py-0"
                    required
                    min="1"
                  />
                </div>
              </div>

              {/* Notes input */}
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant font-bold uppercase tracking-wider">
                  Observações e Sensações (Opcional)
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={3}
                  placeholder="Ex: Pump animal no peito, progredi carga no supino reto e me senti muito forte!"
                  className="w-full bg-[#1c1b1b] border border-white/10 focus:border-primary-container focus:outline-none rounded-xl p-md text-white font-medium text-sm leading-relaxed"
                />
              </div>

              <div className="flex gap-sm pt-md border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-white font-bold rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary-container text-on-primary font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary-container/20 uppercase text-center"
                >
                  Salvar Treino
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
