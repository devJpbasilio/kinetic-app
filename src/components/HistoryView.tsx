import React, { useState } from 'react';
import { WorkoutLog, UserProfile } from '../types';
import { Award, Dumbbell, Calendar, Clock, Flame, ChevronUp, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryViewProps {
  logs: WorkoutLog[];
  user: UserProfile;
}

export default function HistoryView({ logs, user }: HistoryViewProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Métricas reais dos últimos 30 dias (a partir dos logs — nada hardcoded).
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const logDate = (l: WorkoutLog) => {
    const d = new Date(`${l.date}T00:00:00`);
    return isNaN(d.getTime()) ? new Date(l.created_at) : d;
  };
  const recentLogs = logs.filter((l) => logDate(l) >= monthAgo);
  const monthWorkouts = recentLogs.length;
  const monthMinutes = recentLogs.reduce((s, l) => s + (l.duration || 0), 0);
  const monthCalories = recentLogs.reduce((s, l) => s + (l.calories || 0), 0);
  const totalWorkouts = logs.length;

  // Format historical date indicators beautifully
  const getDayDetails = (log: WorkoutLog) => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    // log.date em formato "YYYY-MM-DD": parse como data local para não deslocar o dia
    let d = new Date(`${log.date}T00:00:00`);
    if (isNaN(d.getTime())) {
      // registros antigos podem ter texto livre ("Ontem") — usa o timestamp de criação
      d = new Date(log.created_at);
    }
    if (isNaN(d.getTime())) {
      return { label: "Dia", number: "—" };
    }

    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const isYesterday = d.toDateString() === new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString();

    return {
      label: isToday ? "Hoje" : isYesterday ? "Ontem" : days[d.getDay()],
      number: d.getDate().toString()
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="space-y-lg"
    >
      {/* Title Section */}
      <section className="space-y-xs">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold tracking-tight text-white uppercase">
          Seu Progresso
        </h1>
        <p className="text-body-md text-on-surface-variant font-medium">
          Visualizando seu caminho para o desempenho máximo.
        </p>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Resumo real dos últimos 30 dias (derivado dos logs) */}
        <div className="md:col-span-8 glass-panel rounded-2xl p-md flex flex-col gap-md overflow-hidden relative">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-label-md text-on-surface-variant font-bold uppercase tracking-widest">
                Resumo dos últimos 30 dias
              </p>
              <h2 className="text-data-lg font-black text-primary-container tracking-tight">
                {monthWorkouts} <span className="text-label-md font-semibold text-on-surface-variant">{monthWorkouts === 1 ? 'treino' : 'treinos'}</span>
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-gutter">
            <div className="bg-[#0F1115] border border-white/5 rounded-xl p-md">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <Clock className="w-4 h-4 text-primary-container" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Minutos ativos</span>
              </div>
              <p className="text-headline-md font-black text-white mt-1">{monthMinutes}</p>
            </div>
            <div className="bg-[#0F1115] border border-white/5 rounded-xl p-md">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <Flame className="w-4 h-4 text-primary-container" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Calorias</span>
              </div>
              <p className="text-headline-md font-black text-white mt-1">{monthCalories}</p>
            </div>
          </div>
        </div>

        {/* Conquistas — condicionais aos dados reais */}
        <div className="md:col-span-4 glass-panel rounded-2xl p-md flex flex-col">
          <p className="text-label-md text-on-surface-variant font-bold uppercase tracking-widest mb-sm">
            Conquistas
          </p>
          <div className="flex flex-col gap-md mt-xs">
            <div className={`flex items-center gap-sm ${user.streak >= 5 ? '' : 'opacity-50'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user.streak >= 5 ? 'bg-primary-container/10 border border-primary-container/20' : 'bg-[#201f1f] border border-white/5'}`}>
                <Award className={`w-6 h-6 ${user.streak >= 5 ? 'text-primary-container' : 'text-on-surface-variant'}`} />
              </div>
              <div>
                <p className="text-body-md font-bold text-white">Sequência de 5 Dias</p>
                <p className="text-xs text-on-surface-variant font-medium">
                  {user.streak >= 5 ? 'Conquistada!' : `Faltam ${5 - user.streak} ${5 - user.streak === 1 ? 'dia' : 'dias'}`}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-sm ${totalWorkouts >= 10 ? '' : 'opacity-50'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${totalWorkouts >= 10 ? 'bg-primary-container/10 border border-primary-container/20' : 'bg-[#201f1f] border border-white/5'}`}>
                <Dumbbell className={`w-6 h-6 ${totalWorkouts >= 10 ? 'text-primary-container' : 'text-on-surface-variant'}`} />
              </div>
              <div>
                <p className="text-body-md font-bold text-white">Dedicação (10 treinos)</p>
                <p className="text-xs text-on-surface-variant font-medium">
                  {totalWorkouts >= 10 ? 'Conquistada!' : `${totalWorkouts}/10 treinos registrados`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Workout History List */}
        <div className="md:col-span-12 mt-md">
          <div className="flex justify-between items-end mb-md">
            <h3 className="text-headline-md font-bold text-white tracking-tight">Histórico de Treino</h3>
            <span className="text-label-md text-primary-container uppercase tracking-wider font-bold">
              LOG COMPLETO ({logs.length})
            </span>
          </div>

          <div className="space-y-gutter">
            {logs.length === 0 ? (
              <div className="glass-panel p-lg rounded-2xl text-center border-dashed border-white/5 space-y-xs">
                <Calendar className="w-8 h-8 text-on-surface-variant mx-auto opacity-40" />
                <p className="text-body-md text-on-surface-variant font-medium">Você ainda não registrou nenhum treino.</p>
                <p className="text-xs text-on-surface-variant">Conclua uma rotina de treino ativo para ver seu progresso aqui!</p>
              </div>
            ) : (
              logs.map((log) => {
                const day = getDayDetails(log);
                const isExpanded = expandedLogId === log.id;

                // Border colors matching Stitch
                let borderTheme = "border-l-primary-container";
                if (log.workout_name.toLowerCase().includes("puxar") || log.workout_name.toLowerCase().includes("pull")) {
                  borderTheme = "border-l-secondary-container";
                } else if (log.workout_name.toLowerCase().includes("perna") || log.workout_name.toLowerCase().includes("leg")) {
                  borderTheme = "border-l-outline";
                }

                return (
                  <div 
                    key={log.id}
                    className="glass-card rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300"
                  >
                    <div
                      onClick={() => toggleExpand(log.id)}
                      className={`p-md flex items-center gap-md border-l-4 ${borderTheme} cursor-pointer hover:bg-white/5 transition-colors`}
                    >
                      <div className="flex flex-col items-center justify-center min-w-[64px] border-r border-white/10 pr-md text-center">
                        <span className="text-[11px] text-on-surface-variant font-bold uppercase">
                          {day.label}
                        </span>
                        <span className="text-headline-md font-black text-white leading-none mt-1">
                          {day.number}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <h4 className="text-body-lg font-bold text-white uppercase tracking-tight">
                          {log.workout_name}
                        </h4>
                        <div className="flex gap-sm mt-1.5">
                          <span className="flex items-center text-on-surface-variant text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5 mr-1 text-primary-container" /> 
                            {log.duration} mins
                          </span>
                          <span className="flex items-center text-on-surface-variant text-xs font-semibold">
                            <Flame className="w-3.5 h-3.5 mr-1 text-primary-container" /> 
                            {log.calories} kcal
                          </span>
                        </div>
                      </div>
                      <div className="p-2 text-on-surface-variant hover:text-white">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 text-primary-container" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-black/25 px-md py-4 border-t border-white/5 space-y-sm"
                        >
                          <div>
                            <span className="text-[10px] text-primary-container font-bold uppercase tracking-wider block mb-1">
                              Observações do Treino
                            </span>
                            <p className="text-body-md text-on-surface-variant font-medium leading-relaxed">
                              {log.notes || "Nenhuma anotação registrada para esta sessão."}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* High End Visual Decoration */}
        <div className="md:col-span-12 relative overflow-hidden h-40 rounded-2xl mb-xl group border border-white/5">
          <div className="absolute inset-0 bg-primary-container/10 transition-colors duration-500 group-hover:bg-primary-container/15"></div>
          <div className="absolute inset-0 flex items-center justify-between px-md">
            <div>
              <h3 className="text-headline-md font-black text-primary-container uppercase tracking-tight">Mantenha o Ritmo</h3>
              <p className="text-body-md text-on-surface/80 max-w-[24rem] mt-1 font-medium">
                Você está em uma sequência de {user.streak} dias de treino. Mais um treino para estabelecer um novo recorde pessoal!
              </p>
            </div>
            <div className="hidden sm:block opacity-30 group-hover:scale-110 transition-transform duration-500">
              <Activity className="w-16 h-16 text-primary-container stroke-[2px]" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
