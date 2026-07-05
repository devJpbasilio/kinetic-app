import React, { useState } from 'react';
import { WorkoutLog, UserProfile } from '../types';
import { Award, Dumbbell, Calendar, Clock, Flame, ChevronDown, ChevronUp, ChevronRight, Activity } from 'lucide-react';
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
        {/* Trend Chart Card */}
        <div className="md:col-span-8 glass-panel rounded-2xl p-md flex flex-col gap-sm overflow-hidden relative group">
          <div className="flex justify-between items-center z-10">
            <div>
              <p className="text-label-md text-on-surface-variant font-bold uppercase tracking-widest">
                Tendência de Massa Muscular
              </p>
              <h2 className="text-data-lg font-black text-primary-container tracking-tight">
                {user.weight.toFixed(1)} <span className="text-label-md font-semibold text-on-surface-variant">kg</span>
              </h2>
            </div>
            <div className="flex gap-xs">
              <span className="bg-primary-container/10 border border-primary-container/20 text-primary-container text-[11px] px-3 py-1 rounded-full font-bold">
                +1.2% este mês
              </span>
            </div>
          </div>

          {/* Simplified Vector Chart Representation */}
          <div className="w-full h-44 mt-sm relative pointer-events-none">
            <svg className="w-full h-full drop-shadow-[0_0_8px_rgba(204,255,0,0.4)]" viewBox="0 0 400 150">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#CCFF00" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#CCFF00" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              <path 
                d="M0,130 C50,121 80,138 120,112 C160,82 200,91 250,62 C300,32 350,44 400,20 L400,150 L0,150 Z" 
                fill="url(#chartGradient)"
              />
              <path 
                d="M0,130 C50,121 80,138 120,112 C160,82 200,91 250,62 C300,32 350,44 400,20" 
                fill="none" 
                stroke="#CCFF00" 
                strokeLinecap="round" 
                strokeWidth="3.5"
              />
              <circle cx="400" cy="20" fill="#CCFF00" r="5"></circle>
            </svg>
            <div className="absolute bottom-0 left-0 w-full flex justify-between text-[11px] text-on-surface-variant font-bold uppercase pt-2 px-1">
              <span>S1</span>
              <span>S2</span>
              <span>S3</span>
              <span>S4</span>
            </div>
          </div>
        </div>

        {/* Achievement Section (Trophies) */}
        <div className="md:col-span-4 glass-panel rounded-2xl p-md flex flex-col justify-between">
          <div>
            <p className="text-label-md text-on-surface-variant font-bold uppercase tracking-widest mb-sm">
              Conquistas
            </p>
            <div className="flex flex-col gap-md mt-xs">
              <div className="flex items-center gap-sm">
                <div className="w-12 h-12 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center animate-pulse">
                  <Award className="w-6 h-6 text-primary-container" />
                </div>
                <div>
                  <p className="text-body-md font-bold text-white">Sequência de 5 Dias</p>
                  <p className="text-xs text-on-surface-variant font-medium">Constância é tudo</p>
                </div>
              </div>
              <div className="flex items-center gap-sm opacity-50">
                <div className="w-12 h-12 rounded-full bg-[#201f1f] border border-white/5 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-on-surface-variant" />
                </div>
                <div>
                  <p className="text-body-md font-bold text-white">Powerhouse</p>
                  <p className="text-xs text-on-surface-variant font-medium">Bateu 100kg no Supino</p>
                </div>
              </div>
            </div>
          </div>
          <button className="mt-md w-full py-2.5 text-label-md font-bold text-primary-container hover:bg-primary-container/5 rounded-xl border border-primary-container/10 transition-colors">
            Ver Todos os Troféus
          </button>
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
              <p className="text-body-md text-on-surface/80 max-w-sm mt-1 font-medium">
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
