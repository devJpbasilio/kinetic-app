import React, { useState } from 'react';
import { Sparkles, Dumbbell, Clock, Calendar, MapPin, Target, TrendingUp, ChevronDown, ChevronRight, RefreshCw, Check, AlertCircle, Save, ArrowLeft, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Tipos leves (espelham o motor no servidor) — o componente só envia
// preferências e renderiza o plano retornado pela API.
type Nivel = 'iniciante' | 'intermediario' | 'avancado';
type Objetivo = 'hipertrofia' | 'emagrecimento';
type Local = 'academia_completa' | 'academia_basica' | 'casa';
type Equipamento = 'Barra' | 'Halteres' | 'Máquina' | 'Cabo' | 'Peso Corporal' | 'Elástico' | 'Kettlebell';
type Regiao = 'peito' | 'costas' | 'ombro' | 'biceps' | 'triceps' | 'quadriceps' | 'posterior' | 'gluteo' | 'panturrilha' | 'abdomen' | 'trapezio';

interface GenExercise {
  slug: string; nome: string; grupoMuscular: string; regiao: Regiao;
  equipamento: Equipamento; series: number; repeticoes: string; descanso: string;
}
interface GenDay { nome: string; foco: string; exercicios: GenExercise[]; cardio?: string; }
interface GenPlan {
  titulo: string; divisao: string; objetivo: Objetivo; nivel: Nivel;
  dias: number; tempoPorTreino: number; treinos: GenDay[];
}

interface Props {
  onSaved: () => void;
  triggerToast: (m: string) => void;
}

const OBJETIVOS: { v: Objetivo; label: string; desc: string; icon: React.ReactNode }[] = [
  { v: 'hipertrofia', label: 'Hipertrofia', desc: 'Ganho de massa muscular', icon: <Dumbbell className="w-5 h-5" /> },
  { v: 'emagrecimento', label: 'Emagrecimento', desc: 'Queima de gordura + cardio', icon: <Flame className="w-5 h-5" /> },
];
const NIVEIS: { v: Nivel; label: string; desc: string }[] = [
  { v: 'iniciante', label: 'Iniciante', desc: 'Até ~6 meses de treino' },
  { v: 'intermediario', label: 'Intermediário', desc: '6 meses a 2 anos' },
  { v: 'avancado', label: 'Avançado', desc: 'Mais de 2 anos' },
];
const LOCAIS: { v: Local; label: string; desc: string }[] = [
  { v: 'academia_completa', label: 'Academia completa', desc: 'Máquinas, cabos, pesos livres' },
  { v: 'academia_basica', label: 'Academia básica', desc: 'Barra, halteres, máquinas básicas' },
  { v: 'casa', label: 'Em casa', desc: 'Peso corporal, halteres, elástico' },
];
const TEMPOS = [30, 45, 60, 90] as const;
const EQUIPAMENTOS: Equipamento[] = ['Barra', 'Halteres', 'Máquina', 'Cabo', 'Peso Corporal', 'Elástico', 'Kettlebell'];
const REGIOES: { v: Regiao; label: string }[] = [
  { v: 'peito', label: 'Peito' }, { v: 'costas', label: 'Costas' }, { v: 'ombro', label: 'Ombro' },
  { v: 'biceps', label: 'Bíceps' }, { v: 'triceps', label: 'Tríceps' }, { v: 'quadriceps', label: 'Quadríceps' },
  { v: 'posterior', label: 'Posterior' }, { v: 'gluteo', label: 'Glúteos' }, { v: 'panturrilha', label: 'Panturrilha' },
  { v: 'abdomen', label: 'Abdômen' }, { v: 'trapezio', label: 'Trapézio' },
];

const OptionCard: React.FC<{ active: boolean; onClick: () => void; title: string; subtitle?: string; icon?: React.ReactNode; }> = ({ active, onClick, title, subtitle, icon }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl p-md border transition-all ${
        active
          ? 'bg-primary-container/10 border-primary-container text-white shadow-lg shadow-primary-container/10'
          : 'bg-[#0F1115] border-white/10 hover:border-white/25 text-on-surface-variant'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon && <span className={active ? 'text-primary-container' : ''}>{icon}</span>}
        <span className="font-bold text-white">{title}</span>
        {active && <Check className="w-4 h-4 text-primary-container ml-auto" />}
      </div>
      {subtitle && <p className="text-xs mt-1 font-medium">{subtitle}</p>}
    </button>
  );
};

const Chip: React.FC<{ active: boolean; onClick: () => void; label: string; }> = ({ active, onClick, label }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
        active
          ? 'bg-primary-container text-on-primary border-primary-container'
          : 'bg-[#0F1115] text-on-surface-variant border-white/10 hover:border-white/25'
      }`}
    >
      {label}
    </button>
  );
};

export default function WorkoutGeneratorView({ onSaved, triggerToast }: Props) {
  const [objetivo, setObjetivo] = useState<Objetivo>('hipertrofia');
  const [nivel, setNivel] = useState<Nivel>('iniciante');
  const [dias, setDias] = useState(3);
  const [tempo, setTempo] = useState<(typeof TEMPOS)[number]>(60);
  const [local, setLocal] = useState<Local>('academia_completa');
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [restricoes, setRestricoes] = useState<Regiao[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [plan, setPlan] = useState<GenPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const buildBody = (persist: boolean) => ({
    objetivo, nivel, dias, tempo, local,
    equipamentos, restricoes, persist,
  });

  const generatePreview = async () => {
    setLoading(true); setError(null); setPlan(null);
    try {
      const res = await fetch('/api/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(false)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar o treino.');
      setPlan(data.plan);
    } catch (e: any) {
      setError(e.message || 'Erro de rede ao gerar o treino.');
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(true)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar os treinos.');
      const n = data.workouts?.length ?? plan?.treinos.length ?? 0;
      triggerToast(`${n} treino${n === 1 ? '' : 's'} criado${n === 1 ? '' : 's'} com sucesso!`);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Erro de rede ao salvar.');
      setSaving(false);
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
      <section className="space-y-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-container" />
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold tracking-tight text-white uppercase">
            Treino Inteligente
          </h1>
        </div>
        <p className="text-body-md text-on-surface-variant font-medium">
          Responda algumas perguntas e o app monta a divisão ideal, escolhendo os exercícios automaticamente.
        </p>
      </section>

      {/* Objetivo */}
      <div className="space-y-sm">
        <label className="flex items-center gap-2 text-label-md text-on-surface-variant font-bold uppercase">
          <Target className="w-4 h-4" /> Objetivo
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
          {OBJETIVOS.map((o) => (
            <OptionCard key={o.v} active={objetivo === o.v} onClick={() => setObjetivo(o.v)} title={o.label} subtitle={o.desc} icon={o.icon} />
          ))}
        </div>
      </div>

      {/* Nível */}
      <div className="space-y-sm">
        <label className="flex items-center gap-2 text-label-md text-on-surface-variant font-bold uppercase">
          <TrendingUp className="w-4 h-4" /> Nível
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
          {NIVEIS.map((n) => (
            <OptionCard key={n.v} active={nivel === n.v} onClick={() => setNivel(n.v)} title={n.label} subtitle={n.desc} />
          ))}
        </div>
      </div>

      {/* Dias + Tempo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div className="space-y-sm">
          <label className="flex items-center gap-2 text-label-md text-on-surface-variant font-bold uppercase">
            <Calendar className="w-4 h-4" /> Dias por semana
          </label>
          <div className="flex flex-wrap gap-sm">
            {[2, 3, 4, 5, 6].map((d) => (
              <Chip key={d} active={dias === d} onClick={() => setDias(d)} label={`${d}x`} />
            ))}
          </div>
        </div>
        <div className="space-y-sm">
          <label className="flex items-center gap-2 text-label-md text-on-surface-variant font-bold uppercase">
            <Clock className="w-4 h-4" /> Tempo por treino
          </label>
          <div className="flex flex-wrap gap-sm">
            {TEMPOS.map((t) => (
              <Chip key={t} active={tempo === t} onClick={() => setTempo(t)} label={`${t} min`} />
            ))}
          </div>
        </div>
      </div>

      {/* Local */}
      <div className="space-y-sm">
        <label className="flex items-center gap-2 text-label-md text-on-surface-variant font-bold uppercase">
          <MapPin className="w-4 h-4" /> Local de treino
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
          {LOCAIS.map((l) => (
            <OptionCard key={l.v} active={local === l.v} onClick={() => setLocal(l.v)} title={l.label} subtitle={l.desc} />
          ))}
        </div>
      </div>

      {/* Avançado (opcional) */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-md py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary-container" /> Opções avançadas (equipamentos, lesões)
          </span>
          {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-md pb-md space-y-md"
            >
              <div className="space-y-sm">
                <p className="text-xs font-bold uppercase text-on-surface-variant">Equipamentos disponíveis <span className="normal-case font-medium">(vazio = todos do local)</span></p>
                <div className="flex flex-wrap gap-2">
                  {EQUIPAMENTOS.map((e) => (
                    <Chip key={e} active={equipamentos.includes(e)} onClick={() => toggle(equipamentos, e, setEquipamentos)} label={e} />
                  ))}
                </div>
              </div>
              <div className="space-y-sm">
                <p className="text-xs font-bold uppercase text-on-surface-variant">Evitar grupos (lesões / restrições)</p>
                <div className="flex flex-wrap gap-2">
                  {REGIOES.map((r) => (
                    <Chip key={r.v} active={restricoes.includes(r.v)} onClick={() => toggle(restricoes, r.v, setRestricoes)} label={r.label} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm font-semibold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Ação principal */}
      <button
        type="button"
        onClick={generatePreview}
        disabled={loading}
        className="w-full bg-primary-container text-on-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-98 transition-all shadow-lg shadow-primary-container/20 disabled:opacity-60"
      >
        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        {loading ? 'Gerando...' : plan ? 'Gerar novamente' : 'Gerar treino'}
      </button>

      {/* Prévia do plano */}
      <AnimatePresence>
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-md pt-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm">
              <div>
                <h2 className="text-headline-md font-extrabold text-white tracking-tight">{plan.titulo}</h2>
                <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">
                  {plan.divisao} · {plan.dias} treinos · {plan.tempoPorTreino} min
                </p>
              </div>
              <button
                type="button"
                onClick={savePlan}
                disabled={saving}
                className="bg-primary-container text-on-primary font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary-container/20 disabled:opacity-60"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar treinos'}
              </button>
            </div>

            <div className="space-y-md">
              {plan.treinos.map((day, i) => (
                <div key={i} className="glass-card rounded-3xl p-md border border-white/5 space-y-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container text-sm font-bold">
                      {i + 1}
                    </div>
                    <h4 className="text-body-lg font-bold text-white">{day.nome}</h4>
                  </div>
                  <div className="space-y-xs">
                    {day.exercicios.map((ex, j) => (
                      <div key={j} className="flex items-center justify-between gap-2 bg-[#0F1115] border border-white/5 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{ex.nome}</p>
                          <p className="text-[11px] text-on-surface-variant truncate">{ex.grupoMuscular} · {ex.equipamento}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-primary-container">{ex.series} × {ex.repeticoes}</p>
                          <p className="text-[11px] text-on-surface-variant">descanso {ex.descanso}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {day.cardio && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2">
                      <Flame className="w-3.5 h-3.5 shrink-0" /> {day.cardio}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-on-surface-variant text-center">
              Ao salvar, cada treino vira uma rotina editável na aba Treinos.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
