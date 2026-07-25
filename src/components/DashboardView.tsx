import React, { useState } from 'react';
import { Workout, UserProfile, WorkoutLog } from '../types';
import { Play, Dumbbell, Flame, TrendingDown, Scale, Percent, Zap, ChevronRight, RefreshCw, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { getNextWorkout } from '../utils/nextWorkout';

interface DashboardViewProps {
  user: UserProfile;
  workouts: Workout[];
  logs: WorkoutLog[];
  onStartWorkout: (workout: Workout) => void;
  onNavigate: (tab: string) => void;
  onLogWeight: (weight: number) => void;
}

export default function DashboardView({ user, workouts, logs, onStartWorkout, onNavigate, onLogWeight }: DashboardViewProps) {
  const [weightInput, setWeightInput] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);

  // Próximo treino da rotação: avança a partir do último treino registrado.
  const nextWorkout = getNextWorkout(workouts, logs);

  const bmiLabel = (b: number) =>
    b < 18.5 ? 'Abaixo do peso' : b < 25 ? 'Peso normal' : b < 30 ? 'Sobrepeso'
    : b < 35 ? 'Obesidade I' : b < 40 ? 'Obesidade II' : 'Obesidade III';

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      onLogWeight(w);
      setShowWeightModal(false);
      setWeightInput('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="space-y-lg"
    >
      {/* Header Greeting */}
      <section className="space-y-xs">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold tracking-tight text-white">
          Olá, {user.name}!
        </h1>
        <p className="text-body-md text-on-surface-variant font-medium">
          Pronto para o treino de hoje? Sua consistência é inspiradora.
        </p>
      </section>

      {/* Main CTA Card */}
      {nextWorkout ? (
        <section
          onClick={() => onStartWorkout(nextWorkout)}
          className="relative group cursor-pointer active:scale-[0.99] transition-all duration-300 rounded-3xl overflow-hidden h-56 flex flex-col justify-end p-md"
          style={{
            background:
              'radial-gradient(130% 120% at 100% 0%, rgba(204,255,0,0.20), transparent 46%), linear-gradient(160deg, #16191F 0%, #0D0F13 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            className="material-symbols-outlined absolute -right-5 -top-3 text-primary-container/10 leading-none select-none pointer-events-none"
            style={{ fontSize: '9rem' }}
            aria-hidden="true"
          >
            bolt
          </span>
          <div className="relative z-10 space-y-sm">
            <div className="flex items-center gap-xs">
              <span className="w-1.5 h-4 bg-primary-container rounded-full" />
              <span className="text-label-md text-primary-container tracking-widest uppercase font-bold">
                {nextWorkout.name}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-headline-md font-extrabold text-white tracking-tight">Começar treino</h2>
                <p className="text-body-md text-on-surface-variant font-medium">
                  {user.streak > 0
                    ? `Sequência de ${user.streak} ${user.streak === 1 ? 'dia' : 'dias'} — mantenha o ritmo`
                    : 'Toque para começar agora'}
                </p>
              </div>
              <button
                className="w-14 h-14 bg-primary-container text-on-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform accent-glow shrink-0"
                aria-label="Começar treino"
              >
                <Play className="w-6 h-6 fill-on-primary text-on-primary ml-0.5" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section 
          onClick={() => onNavigate('treino')}
          className="glass-panel p-lg rounded-2xl flex flex-col items-center justify-center text-center border-dashed border-white/10 space-y-md cursor-pointer"
        >
          <Dumbbell className="w-10 h-10 text-primary-container" />
          <div>
            <h3 className="text-body-lg font-bold text-white">Nenhum treino planejado</h3>
            <p className="text-body-md text-on-surface-variant">Crie um treino personalizado no planejador para começar.</p>
          </div>
          <button className="bg-primary-container text-on-primary px-4 py-2 rounded-lg text-label-md font-bold uppercase tracking-wider">
            Criar Treino
          </button>
        </section>
      )}

      {/* Progress Tracking */}
      <section className="space-y-md">
        <div className="flex justify-between items-end">
          <h3 className="text-headline-md font-bold text-white tracking-tight">Progresso Semanal</h3>
          <span className="text-label-md text-on-surface-variant font-bold">
            {Math.min(7, user.weekly_workouts)} de 7 treinos esta semana
          </span>
        </div>
        <div className="h-4 bg-[#0F1115] rounded-full overflow-hidden flex gap-xs p-1 border border-white/5">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div
              key={idx}
              className={`h-full rounded-full transition-colors duration-500 ${
                idx < user.weekly_workouts
                  ? 'bg-primary-container shadow-[0_0_8px_rgba(204,255,0,0.5)]'
                  : 'bg-[#0A0B0D]'
              }`}
              style={{ width: `${100 / 7}%` }}
            />
          ))}
        </div>
      </section>

      {/* Stats Bento Grid */}
      <section className="space-y-md">
        <h3 className="text-headline-md font-bold text-white tracking-tight">Estatísticas Atuais</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter">
          {/* Weight Card */}
          <div 
            onClick={() => setShowWeightModal(true)}
            className="glass-card p-md rounded-3xl space-y-md hover:border-primary-container/30 transition-all duration-300 cursor-pointer relative group overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-label-md text-on-surface-variant font-bold uppercase tracking-wider">Peso</span>
              <Scale className="w-5 h-5 text-primary-container" />
            </div>
            <div className="space-y-xs">
              <p className="text-data-lg font-black tracking-tight text-white">
                {user.weight.toFixed(1)}
                <span className="text-label-md text-on-surface-variant ml-xs">kg</span>
              </p>
              <p className="text-[12px] text-on-surface-variant font-semibold">
                Toque para registrar
              </p>
            </div>
            <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary-container font-bold uppercase">
              Registrar +
            </div>
          </div>

          {/* Body Fat Card */}
          <div className="glass-card p-md rounded-3xl space-y-md hover:border-primary-container/30 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-label-md text-on-surface-variant font-bold uppercase tracking-wider">Gordura Corporal</span>
              <Percent className="w-5 h-5 text-secondary-container" />
            </div>
            <div className="space-y-xs">
              <p className="text-data-lg font-black tracking-tight text-white">
                {user.body_fat}
                <span className="text-label-md text-on-surface-variant ml-xs">%</span>
              </p>
              <p className="text-[12px] text-on-surface-variant font-semibold">
                Atualize no perfil
              </p>
            </div>
          </div>

          {/* IMC Card */}
          <div className="glass-card p-md rounded-3xl space-y-md hover:border-primary-container/30 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-label-md text-on-surface-variant font-bold uppercase tracking-wider">IMC</span>
              <Activity className="w-5 h-5 text-primary-container" />
            </div>
            <div className="space-y-xs">
              {user.bmi && user.bmi > 0 ? (
                <>
                  <p className="text-data-lg font-black tracking-tight text-white">{user.bmi.toFixed(1)}</p>
                  <p className="text-[12px] text-primary-container font-semibold">{bmiLabel(user.bmi)}</p>
                </>
              ) : (
                <>
                  <p className="text-data-lg font-black tracking-tight text-on-surface-variant/40">—</p>
                  <p className="text-[12px] text-on-surface-variant font-semibold">Informe altura no perfil</p>
                </>
              )}
            </div>
          </div>

          {/* Active Minutes */}
          <div className="glass-card p-md rounded-3xl space-y-md col-span-2 md:col-span-1 hover:border-primary-container/30 transition-all duration-300 relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <span className="text-label-md text-on-surface-variant font-bold uppercase tracking-wider">Minutos Ativos</span>
              <Zap className="w-5 h-5 text-primary-container fill-primary-container" />
            </div>
            <div className="space-y-xs relative z-10">
              <p className="text-data-lg font-black tracking-tight text-white">
                {user.active_minutes}
                <span className="text-label-md text-on-surface-variant ml-xs">min</span>
              </p>
              <p className="text-[12px] text-primary-container font-semibold">
                Esta semana
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Shortcut Panel */}
      <section 
        onClick={() => onNavigate('historico')}
        className="glass-card rounded-3xl p-md flex items-center justify-between border-dashed border-white/20 hover:bg-white/5 transition-all duration-300 cursor-pointer"
      >
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 rounded-xl bg-[#0F1115] border border-white/10 flex items-center justify-center text-primary-container">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-body-lg font-bold text-white">Ver Histórico Detalhado</h4>
            <p className="text-label-md text-on-surface-variant font-medium">Analise suas tendências de força e queima calórica</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-on-surface-variant" />
      </section>

      {/* Weight Input Dialog Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel w-full max-w-[24rem] rounded-2xl p-md border border-white/10 text-center space-y-md"
          >
            <h3 className="text-headline-md font-extrabold text-white">Registrar Peso Atual</h3>
            <p className="text-body-md text-on-surface-variant">Acompanhe seu progresso de massa corporal com precisão.</p>
            <form onSubmit={handleWeightSubmit} className="space-y-md">
              <input 
                type="number" 
                step="0.1" 
                required
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="Ex: 78.5"
                className="w-full bg-[#0F1115] border border-white/10 focus:border-primary-container rounded-xl py-3 text-center text-white font-bold text-lg focus:outline-none"
                autoFocus
              />
              <div className="flex gap-sm">
                <button 
                  type="button" 
                  onClick={() => setShowWeightModal(false)}
                  className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 text-white font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-container text-on-primary font-bold rounded-xl hover:brightness-110 shadow-lg shadow-primary-container/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
