import React, { useState, useEffect } from 'react';
import { UserProfile, Exercise, Workout, WorkoutExercise, WorkoutLog } from './types';
import DashboardView from './components/DashboardView';
import WorkoutSetupView from './components/WorkoutSetupView';
import HistoryView from './components/HistoryView';
import ActiveWorkoutView from './components/ActiveWorkoutView';
import { Home, Dumbbell, Calendar, Sparkles, User, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [role, setRole] = useState<'aluno' | 'admin'>('aluno');

  // Relational Entities States
  const [user, setUser] = useState<UserProfile | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  // Active workout
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);

  // App loading and notification states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load all initial data from backend API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, exRes, workoutsRes, weRes, logsRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/exercises'),
        fetch('/api/workouts'),
        fetch('/api/workout-exercises'),
        fetch('/api/logs'),
      ]);

      if (!userRes.ok || !exRes.ok || !workoutsRes.ok || !weRes.ok || !logsRes.ok) {
        throw new Error("Erro ao carregar dados do servidor.");
      }

      const userData = await userRes.json();
      const exData = await exRes.json();
      const workoutsData = await workoutsRes.json();
      const weData = await weRes.json();
      const logsData = await logsRes.json();

      setUser(userData);
      setExercises(exData);
      setWorkouts(workoutsData);
      setWorkoutExercises(weData);
      setLogs(logsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- USER PROFILE OPERATIONS ---
  const handleLogWeight = async (weight: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        triggerToast("Peso atualizado com sucesso!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- WORKOUT CRUD OPERATIONS ---
  const handleAddWorkout = async (name: string) => {
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newW = await res.json();
        setWorkouts((prev) => [...prev, newW]);
        triggerToast(`Treino "${name}" criado com sucesso!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateWorkout = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const updated = await res.json();
        setWorkouts((prev) => prev.map((w) => (w.id === id ? updated : w)));
        triggerToast("Nome do treino atualizado!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este treino? Os exercícios vinculados serão removidos.")) return;
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkouts((prev) => prev.filter((w) => w.id !== id));
        setWorkoutExercises((prev) => prev.filter((we) => we.workout_id !== id));
        triggerToast("Treino excluído com sucesso.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- WORKOUT EXERCISE OPERATIONS ---
  const handleAddExerciseToWorkout = async (
    workoutId: string,
    payload: {
      exercise_id: string;
      series: number;
      repetitions: string;
      rest_time: string;
      weight: number;
    }
  ) => {
    try {
      const res = await fetch(`/api/workouts/${workoutId}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newWe = await res.json();
        setWorkoutExercises((prev) => [...prev, newWe]);
        triggerToast("Exercício adicionado ao treino!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateWorkoutExercise = async (id: string, payload: Partial<WorkoutExercise>) => {
    try {
      const res = await fetch(`/api/workout-exercises/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setWorkoutExercises((prev) => prev.map((we) => (we.id === id ? updated : we)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWorkoutExercise = async (id: string) => {
    try {
      const res = await fetch(`/api/workout-exercises/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkoutExercises((prev) => prev.filter((we) => we.id !== id));
        triggerToast("Exercício removido do treino.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- EXERCISE MASTER CRUD OPERATIONS ---
  const handleAddExercise = async (payload: Omit<Exercise, 'id' | 'created_at'>) => {
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newEx = await res.json();
        setExercises((prev) => [...prev, newEx]);
        triggerToast(`Exercício "${payload.name_pt}" cadastrado!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateExercise = async (id: string, payload: Partial<Omit<Exercise, 'id' | 'created_at'>>) => {
    try {
      const res = await fetch(`/api/exercises/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setExercises((prev) => prev.map((ex) => (ex.id === id ? updated : ex)));
        // also sync in state
        triggerToast("Exercício atualizado com sucesso!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este exercício do banco? Isso também o removerá de todos os treinos.")) return;
    try {
      const res = await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExercises((prev) => prev.filter((ex) => ex.id !== id));
        setWorkoutExercises((prev) => prev.filter((we) => we.exercise_id !== id));
        triggerToast("Exercício removido do banco.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- GEMINI AI SPREADSHEET IMPORT ---
  const handleImportAndTranslate = async (rawText: string) => {
    try {
      const res = await fetch('/api/exercises/translate-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { count: 0, error: data.error || "Erro desconhecido ao processar com IA." };
      }

      // Re-fetch database to get freshly imported exercises and update states!
      const freshExRes = await fetch('/api/exercises');
      if (freshExRes.ok) {
        const freshExData = await freshExRes.json();
        setExercises(freshExData);
      }

      return { count: data.importedCount || 0 };
    } catch (err: any) {
      console.error(err);
      return { count: 0, error: err.message };
    }
  };

  // --- WORKOUT LOG SUBMISSION ---
  const handleSubmitWorkoutLog = async (payload: {
    workout_id: string;
    workout_name: string;
    duration: number;
    calories: number;
    notes: string;
  }) => {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedLog = await res.json();
        // Update local logs list
        setLogs((prev) => [savedLog, ...prev]);

        // Sync fresh user stats automatically in the frontend
        if (user) {
          setUser({
            ...user,
            active_minutes: user.active_minutes + payload.duration,
            streak: Math.min(7, user.streak + 1),
          });
        }

        setActiveWorkout(null);
        setActiveTab('historico');
        triggerToast("Seu treino foi gravado e salvo no histórico!");
      } else {
        triggerToast("Falha ao salvar log do treino.");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Erro de rede ao salvar o treino.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] pb-24 md:pb-6 relative flex flex-col items-center">
      
      {/* Toast notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 z-50 bg-[#252525] border-l-4 border-l-primary-container border-y border-r border-white/10 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-sm text-sm font-bold text-white"
          >
            <Sparkles className="w-4 h-4 text-primary-container fill-primary-container" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {activeWorkout ? (
        // ACTIVE WORKOUT INTERACTION MODE
        <main className="w-full max-w-xl px-margin-mobile pt-4">
          <ActiveWorkoutView
            workout={activeWorkout}
            workoutExercises={workoutExercises}
            exercises={exercises}
            onExit={() => setActiveWorkout(null)}
            onSubmitLog={handleSubmitWorkoutLog}
          />
        </main>
      ) : (
        // REGULAR SPA LAYOUT (RESPONSIVE ADAPTATION)
        <div className="w-full flex flex-col md:flex-row min-h-screen">
          {/* Left Sidebar - Desktop only */}
          <aside className="hidden md:flex w-64 border-r border-white/10 flex-col bg-[#0F1115] shrink-0 h-screen sticky top-0 z-50">
            <div className="p-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#CCFF00] rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-black text-2xl font-bold">bolt</span>
                </div>
                <span className="font-black text-xl tracking-widest uppercase text-white">
                  KINE<span className="text-primary-container">TIC</span>
                </span>
              </div>
            </div>

            {/* Persona Selector on Desktop */}
            <div className="px-4 mb-6">
              <div className="bg-[#0A0B0D] p-1 rounded-xl border border-white/10 flex text-[11px] font-bold uppercase tracking-wider">
                <button
                  onClick={() => {
                    setRole('aluno');
                    triggerToast("Modo Aluno Ativo: visualize e execute seus treinos!");
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all text-center font-bold ${
                    role === 'aluno'
                      ? 'bg-primary-container text-on-primary font-black shadow-md'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  Aluno
                </button>
                <button
                  onClick={() => {
                    setRole('admin');
                    triggerToast("Modo Personal / Admin Ativo: gerencie exercícios e treinos!");
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 font-bold ${
                    role === 'admin'
                      ? 'bg-primary-container text-on-primary font-black shadow-md'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Personal
                </button>
              </div>
            </div>

            {/* Navigation links - Desktop only */}
            <nav className="flex-1 px-4 space-y-2">
              <button
                onClick={() => setActiveTab('inicio')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border font-medium transition-all ${
                  activeTab === 'inicio'
                    ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/20'
                    : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <Home className="w-5 h-5" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('treino')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border font-medium transition-all ${
                  activeTab === 'treino'
                    ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/20'
                    : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <Dumbbell className="w-5 h-5" />
                Treinos
              </button>
              <button
                onClick={() => setActiveTab('historico')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border font-medium transition-all ${
                  activeTab === 'historico'
                    ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/20'
                    : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <Calendar className="w-5 h-5" />
                Histórico
              </button>
            </nav>

            {/* Profile footer - Desktop only */}
            <div className="p-6 border-t border-white/5 bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-500 overflow-hidden flex items-center justify-center">
                  <span className="text-xs font-bold text-white uppercase">{user ? user.name.slice(0, 2) : 'JD'}</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate text-white">{user ? user.name : 'Visitante'}</p>
                  <p className="text-xs text-slate-500 truncate">{role === 'admin' ? 'Senior Personal' : 'Aluno Pro'}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Area - Header + Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header - Mobile only */}
            <header className="md:hidden w-full bg-[#0F1115]/80 backdrop-blur-md border-b border-white/10 h-16 flex items-center sticky top-0 z-40 justify-center">
              <div className="w-full max-w-2xl px-margin-mobile flex justify-between items-center">
                {/* Logo / Branding */}
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary-container text-2xl font-bold animate-pulse">bolt</span>
                  <span className="text-body-lg font-black text-white tracking-widest uppercase">
                    KINE<span className="text-primary-container">TIC</span>
                  </span>
                </div>

                {/* Persona / Role Selector Badge */}
                <div className="flex bg-[#0A0B0D] p-1 rounded-full border border-white/10 text-[11px] font-bold uppercase tracking-wider relative">
                  <button
                    onClick={() => {
                      setRole('aluno');
                      triggerToast("Modo Aluno Ativo: visualize e execute seus treinos!");
                    }}
                    className={`px-3 py-1.5 rounded-full transition-all ${
                      role === 'aluno'
                        ? 'bg-primary-container text-on-primary font-black shadow-md'
                        : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    Aluno
                  </button>
                  <button
                    onClick={() => {
                      setRole('admin');
                      triggerToast("Modo Personal / Admin Ativo: gerencie exercícios e traduza treinos!");
                    }}
                    className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                      role === 'admin'
                        ? 'bg-primary-container text-on-primary font-black shadow-md'
                        : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    Personal
                  </button>
                </div>
              </div>
            </header>

            {/* Main App Content View Switcher */}
            <main className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 flex-grow pb-32 md:pb-12">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-96 space-y-md">
                  <RefreshCw className="w-12 h-12 text-primary-container animate-spin" />
                  <p className="text-body-md text-on-surface-variant font-medium">Sincronizando banco de treinos com o servidor...</p>
                </div>
              ) : error ? (
                <div className="glass-panel p-lg rounded-2xl border-dashed border-red-500/30 text-center space-y-md my-auto max-w-md mx-auto">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                  <div>
                    <h3 className="text-body-lg font-bold text-white">Falha na Sincronização</h3>
                    <p className="text-body-md text-on-surface-variant mt-xs">{error}</p>
                  </div>
                  <button
                    onClick={fetchData}
                    className="bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {activeTab === 'inicio' && user && (
                    <motion.div
                      key="inicio"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <DashboardView
                        user={user}
                        workouts={workouts}
                        onStartWorkout={(w) => {
                          setActiveWorkout(w);
                          triggerToast(`Iniciando treino "${w.name}"! Foco e bom treino!`);
                        }}
                        onNavigate={(tab) => setActiveTab(tab)}
                        onLogWeight={handleLogWeight}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'treino' && (
                    <motion.div
                      key="treino"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <WorkoutSetupView
                        workouts={workouts}
                        workoutExercises={workoutExercises}
                        exercises={exercises}
                        onAddWorkout={handleAddWorkout}
                        onUpdateWorkout={handleUpdateWorkout}
                        onDeleteWorkout={handleDeleteWorkout}
                        onAddExerciseToWorkout={handleAddExerciseToWorkout}
                        onUpdateWorkoutExercise={handleUpdateWorkoutExercise}
                        onDeleteWorkoutExercise={handleDeleteWorkoutExercise}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'historico' && user && (
                    <motion.div
                      key="historico"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <HistoryView logs={logs} user={user} />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </main>

            {/* Bottom Navigation Menu Bar (Mobile only) */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-[#0F1115]/95 backdrop-blur-xl border-t border-white/10 h-20 flex justify-center items-center px-margin-mobile">
              <div className="w-full max-w-xl flex justify-between items-center px-sm">
                
                {/* Tab Inicio */}
                <button
                  onClick={() => setActiveTab('inicio')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${
                    activeTab === 'inicio' ? 'text-primary-container scale-110 font-bold' : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <Home className="w-5 h-5 mb-1" />
                  <span className="text-[10px] tracking-wide uppercase font-semibold">Início</span>
                </button>

                {/* Tab Treinos */}
                <button
                  onClick={() => setActiveTab('treino')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${
                    activeTab === 'treino' ? 'text-primary-container scale-110 font-bold' : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <Dumbbell className="w-5 h-5 mb-1" />
                  <span className="text-[10px] tracking-wide uppercase font-semibold">Treinos</span>
                </button>

                {/* Tab Historico */}
                <button
                  onClick={() => setActiveTab('historico')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${
                    activeTab === 'historico' ? 'text-primary-container scale-110 font-bold' : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <Calendar className="w-5 h-5 mb-1" />
                  <span className="text-[10px] tracking-wide uppercase font-semibold">Histórico</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
