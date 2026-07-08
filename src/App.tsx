import React, { useState, useEffect } from 'react';
import { UserProfile, AccountUser, Exercise, Workout, WorkoutExercise, WorkoutLog } from './types';
import DashboardView from './components/DashboardView';
import WorkoutSetupView from './components/WorkoutSetupView';
import HistoryView from './components/HistoryView';
import ActiveWorkoutView from './components/ActiveWorkoutView';
import { Home, Dumbbell, Calendar, Sparkles, User, RefreshCw, AlertCircle, LogOut, Lock, Mail, Users, Check, X, Trash2, ShieldCheck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('inicio');

  // Auth states
  const [authStatus, setAuthStatus] = useState<'checking' | 'login' | 'ok'>('checking');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [registerNotice, setRegisterNotice] = useState<string | null>(null);

  // Redefinição de senha (link com ?token= na URL)
  const [resetToken, setResetToken] = useState<string | null>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('token');
      return t && window.location.pathname.replace(/\/+$/, '').endsWith('/reset') ? t : null;
    } catch { return null; }
  });
  const [resetPw, setResetPw] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Admin (aprovação/gestão de usuários)
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AccountUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Perfil (editar nome/peso/altura + IMC)
  const [showProfile, setShowProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', weight: '', height: '', body_fat: '' });

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

  // Check session on boot, then load data
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAuthStatus('ok');
        fetchData();
      } else {
        setAuthStatus('login');
        setLoading(false);
      }
    } catch {
      setAuthStatus('login');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    setRegisterNotice(null);
    try {
      if (authMode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.trim() }),
        });
        const data = await res.json();
        setAuthMode('login');
        setRegisterNotice(data.message || 'Se houver uma conta com este e-mail, enviamos um link para redefinir a senha.');
        return;
      }

      if (authMode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.trim(), password: passwordInput }),
        });
        const data = await res.json();
        if (!res.ok) {
          setLoginError(data.error || 'Falha ao cadastrar.');
          return;
        }
        setPasswordInput('');
        setAuthMode('login');
        setRegisterNotice(data.message || 'Cadastro enviado. Aguarde a aprovação de um administrador.');
        return;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Falha ao entrar. Tente novamente.');
        return;
      }
      setUser(data.user);
      setPasswordInput('');
      setAuthStatus('ok');
      fetchData();
    } catch {
      setLoginError('Erro de rede. Verifique sua conexão.');
    } finally {
      setLoggingIn(false);
    }
  };

  // --- ADMIN: gestão de usuários ---
  const openAdmin = async () => {
    setShowAdmin(true);
    await loadAdminUsers();
  };

  const loadAdminUsers = async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar usuários.');
      setAdminUsers(data);
    } catch (err: any) {
      setAdminError(err.message || 'Erro ao carregar usuários.');
    } finally {
      setAdminLoading(false);
    }
  };

  const approveUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/approve`, { method: 'POST' });
      if (res.ok) { triggerToast('Usuário aprovado.'); loadAdminUsers(); }
    } catch { /* ignore */ }
  };

  const rejectUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/reject`, { method: 'POST' });
      if (res.ok) { triggerToast('Solicitação rejeitada.'); loadAdminUsers(); }
    } catch { /* ignore */ }
  };

  const removeUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { triggerToast('Usuário removido.'); loadAdminUsers(); }
      else triggerToast(data.error || 'Não foi possível remover.');
    } catch { /* ignore */ }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSaving(true);
    setResetError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: resetPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Não foi possível redefinir a senha.');
        return;
      }
      setResetDone(true);
    } catch {
      setResetError('Erro de rede. Tente novamente.');
    } finally {
      setResetSaving(false);
    }
  };

  const goToLoginFromReset = () => {
    try { window.history.replaceState({}, '', '/'); } catch { /* ignore */ }
    setResetToken(null);
    setResetPw('');
    setResetDone(false);
    setResetError(null);
    setAuthMode('login');
    setRegisterNotice('Senha redefinida. Entre com a nova senha.');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setAuthStatus('login');
    setUser(null);
    setActiveWorkout(null);
    setActiveTab('inicio');
  };

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

      if (userRes.status === 401) {
        setAuthStatus('login');
        setLoading(false);
        return;
      }

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

  // --- PERFIL ---
  const openProfile = () => {
    setProfileForm({
      name: user?.name ?? '',
      weight: user?.weight ? String(user.weight) : '',
      height: user?.height ? String(user.height) : '',
      body_fat: user?.body_fat ? String(user.body_fat) : '',
    });
    setShowProfile(true);
  };

  const bmiClass = (b: number) =>
    b < 18.5 ? { label: 'Abaixo do peso', color: 'text-sky-400' }
    : b < 25 ? { label: 'Peso normal', color: 'text-primary-container' }
    : b < 30 ? { label: 'Sobrepeso', color: 'text-amber-400' }
    : b < 35 ? { label: 'Obesidade grau I', color: 'text-orange-400' }
    : b < 40 ? { label: 'Obesidade grau II', color: 'text-red-400' }
    : { label: 'Obesidade grau III', color: 'text-red-500' };

  const profileBmi = (() => {
    const w = parseFloat(profileForm.weight.replace(',', '.'));
    const h = parseFloat(profileForm.height.replace(',', '.'));
    if (isNaN(w) || isNaN(h) || h <= 0 || w <= 0) return null;
    return Math.round((w / ((h / 100) ** 2)) * 10) / 10;
  })();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload: any = { name: profileForm.name };
      const w = parseFloat(profileForm.weight.replace(',', '.'));
      const h = parseFloat(profileForm.height.replace(',', '.'));
      const bf = parseFloat(profileForm.body_fat.replace(',', '.'));
      if (!isNaN(w)) payload.weight = w;
      if (!isNaN(h)) payload.height = h;
      if (!isNaN(bf)) payload.body_fat = bf;
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { triggerToast(data.error || 'Falha ao salvar perfil.'); return; }
      setUser(data);
      setShowProfile(false);
      triggerToast('Perfil atualizado!');
    } catch {
      triggerToast('Erro de rede ao salvar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Importa um exercício do catálogo externo para a biblioteca do usuário
  const handleImportFromCatalog = async (id: string | number): Promise<Exercise | null> => {
    try {
      const res = await fetch('/api/exercises/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        triggerToast(data.error || 'Falha ao importar exercício.');
        return null;
      }
      setExercises((prev) => [...prev, data]);
      triggerToast(`"${data.name_pt}" importado para sua biblioteca.`);
      return data as Exercise;
    } catch {
      triggerToast('Erro de rede ao importar exercício.');
      return null;
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
        // O servidor retorna o log salvo + perfil com stats recalculadas
        // (fonte única de verdade — nada de duplicar a lógica aqui)
        const data = await res.json();
        setLogs((prev) => [data.log, ...prev]);
        if (data.user) setUser(data.user);

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

  // --- TELA DE REDEFINIÇÃO (link do e-mail: /reset?token=...) ---
  if (resetToken) {
    return (
      <div className="min-h-dvh app-bg flex items-center justify-center px-margin-mobile py-lg" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div className="w-full max-w-[24rem] surface-card rounded-3xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary-container/0 via-primary-container to-primary-container/0" />
          <div className="p-lg space-y-lg">
            <div className="flex flex-col items-center gap-sm text-center">
              <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center accent-glow">
                <Lock className="w-7 h-7 text-black" />
              </div>
              <div className="space-y-1">
                <h1 className="font-black text-2xl tracking-tight text-white">Redefinir senha</h1>
                <p className="text-body-md text-on-surface-variant font-medium leading-snug">
                  {resetDone ? 'Tudo certo! Sua senha foi redefinida.' : 'Escolha uma nova senha para sua conta.'}
                </p>
              </div>
            </div>

            {resetDone ? (
              <button onClick={goToLoginFromReset} className="w-full bg-primary-container text-on-primary font-bold py-3.5 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all text-[15px]">
                Ir para o login
              </button>
            ) : (
              <form onSubmit={handleReset} className="space-y-md">
                <div className="relative">
                  <Lock className="w-4 h-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    placeholder="Nova senha (mínimo 8 caracteres)"
                    required
                    minLength={8}
                    autoFocus
                    autoComplete="new-password"
                    className="w-full surface-inset focus:border-primary-container rounded-2xl py-3.5 pl-11 pr-4 text-white font-medium placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container/30 transition-all"
                  />
                </div>
                {resetError && (
                  <p className="text-sm text-red-400 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {resetError}
                  </p>
                )}
                <button type="submit" disabled={resetSaving} className="w-full bg-primary-container text-on-primary font-bold py-3.5 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all text-[15px] disabled:opacity-60 flex items-center justify-center gap-2">
                  {resetSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {resetSaving ? 'Salvando...' : 'Redefinir senha'}
                </button>
                <button type="button" onClick={goToLoginFromReset} className="w-full text-xs text-on-surface-variant/70 hover:text-primary-container text-center font-medium transition-colors">
                  Voltar ao login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- LOGIN GATE ---
  if (authStatus === 'checking') {
    return (
      <div className="min-h-dvh app-bg flex flex-col items-center justify-center gap-md px-margin-mobile">
        <RefreshCw className="w-10 h-10 text-primary-container animate-spin" />
        <p className="text-body-md text-on-surface-variant font-medium">Verificando sessão...</p>
      </div>
    );
  }

  if (authStatus === 'login') {
    const isRegister = authMode === 'register';
    const isForgot = authMode === 'forgot';
    return (
      <div className="min-h-dvh app-bg flex items-center justify-center px-margin-mobile py-lg" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[24rem] surface-card rounded-3xl overflow-hidden"
        >
          {/* Faixa de acento no topo */}
          <div className="h-1 bg-gradient-to-r from-primary-container/0 via-primary-container to-primary-container/0" />

          <div className="p-lg space-y-lg">
            <div className="flex flex-col items-center gap-sm text-center">
              <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center accent-glow">
                <span className="material-symbols-outlined text-black text-4xl font-bold">bolt</span>
              </div>
              <div className="space-y-1">
                <h1 className="font-black text-3xl tracking-[0.15em] uppercase text-white">
                  KINE<span className="text-primary-container">TIC</span>
                </h1>
                <p className="text-body-md text-on-surface-variant font-medium leading-snug">
                  {isForgot
                    ? 'Informe seu e-mail e enviaremos um link para redefinir a senha.'
                    : isRegister
                    ? 'Crie sua conta. Um administrador aprova o acesso antes do primeiro login.'
                    : 'Seu treino, do jeito certo. Entre para continuar.'}
                </p>
              </div>
            </div>

            {registerNotice && (
              <div className="flex items-start gap-2.5 text-sm text-primary-container bg-primary-container/10 border border-primary-container/25 rounded-2xl p-md font-medium">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{registerNotice}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-sm">
              <div className="relative">
                <Mail className="w-4 h-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="E-mail"
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full surface-inset focus:border-primary-container rounded-2xl py-3.5 pl-11 pr-4 text-white font-medium placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container/30 transition-all"
                />
              </div>
              {!isForgot && (
                <div className="relative">
                  <Lock className="w-4 h-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={isRegister ? 'Senha (mínimo 8 caracteres)' : 'Senha'}
                    required
                    minLength={isRegister ? 8 : undefined}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    className="w-full surface-inset focus:border-primary-container rounded-2xl py-3.5 pl-11 pr-4 text-white font-medium placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container/30 transition-all"
                  />
                </div>
              )}

              {loginError && (
                <p className="text-sm text-red-400 font-medium flex items-center gap-2 pt-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full bg-primary-container text-on-primary font-bold py-3.5 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all text-[15px] disabled:opacity-60 flex items-center justify-center gap-2 !mt-md"
              >
                {loggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {loggingIn
                  ? (isForgot || isRegister ? 'Enviando...' : 'Entrando...')
                  : (isForgot ? 'Enviar link' : isRegister ? 'Criar conta' : 'Entrar')}
              </button>

              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setLoginError(null); setRegisterNotice(null); }}
                  className="w-full text-xs text-on-surface-variant/70 hover:text-primary-container text-center font-medium transition-colors"
                >
                  Esqueci a senha
                </button>
              )}
            </form>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-[11px] text-on-surface-variant/50 font-medium uppercase tracking-wider">ou</span>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            <button
              type="button"
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setLoginError(null); setRegisterNotice(null); }}
              className="w-full surface-raised hover:border-primary-container/40 text-sm text-white/90 hover:text-white text-center font-medium py-3 rounded-2xl transition-colors"
            >
              {authMode === 'login' ? 'Solicitar cadastro' : 'Já tem conta? Entrar'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg pb-24 md:pb-6 relative flex flex-col items-center">

      {/* Painel de administração de usuários (somente admin) */}
      {showAdmin && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-margin-mobile bg-black/70 backdrop-blur-sm"
          onClick={() => setShowAdmin(false)}
        >
          <div
            className="w-full max-w-[36rem] max-h-[85vh] flex flex-col glass-panel rounded-3xl p-lg space-y-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-container" />
                <h2 className="text-body-lg font-black text-white">Usuários</h2>
              </div>
              <button onClick={() => setShowAdmin(false)} className="p-2 text-on-surface-variant hover:text-white rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminError && (
              <p className="text-sm text-red-400 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {adminError}
              </p>
            )}

            {adminLoading ? (
              <div className="flex items-center justify-center py-lg">
                <RefreshCw className="w-6 h-6 text-primary-container animate-spin" />
              </div>
            ) : (
              <div className="overflow-y-auto space-y-sm no-scrollbar">
                {adminUsers.length === 0 && (
                  <p className="text-body-md text-on-surface-variant text-center py-md">Nenhum usuário.</p>
                )}
                {adminUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 bg-[#0F1115] border border-white/10 rounded-xl p-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {u.role === 'admin' && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-primary-container">Admin</span>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${u.status === 'pending' ? 'text-amber-400' : 'text-on-surface-variant'}`}>
                          {u.status === 'pending' ? 'Pendente' : 'Aprovado'}
                        </span>
                      </div>
                    </div>

                    {u.status === 'pending' ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => approveUser(u.id)} title="Aprovar" className="p-2 rounded-lg bg-primary-container/15 text-primary-container hover:bg-primary-container/25 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => rejectUser(u.id)} title="Rejeitar" className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      u.role !== 'admin' && (
                        <button onClick={() => removeUser(u.id)} title="Remover usuário e seus dados" className="p-2 rounded-lg text-on-surface-variant hover:text-red-400 hover:bg-white/5 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Perfil: editar nome/peso/altura + IMC */}
      {showProfile && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-margin-mobile bg-black/70 backdrop-blur-sm"
          onClick={() => setShowProfile(false)}
        >
          <form
            onSubmit={handleSaveProfile}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[28rem] max-h-[88vh] overflow-y-auto no-scrollbar glass-panel rounded-3xl p-lg space-y-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-container" />
                <h2 className="text-body-lg font-black text-white">Meu Perfil</h2>
              </div>
              <button type="button" onClick={() => setShowProfile(false)} className="p-2 text-on-surface-variant hover:text-white rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant font-bold uppercase">Nome</label>
              <input
                type="text" value={profileForm.name} required
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#0F1115] border border-white/10 focus:border-primary-container rounded-xl px-4 py-3 text-white font-medium focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant font-bold uppercase">Peso (kg)</label>
                <input
                  type="number" inputMode="decimal" step="0.1" min="0" placeholder="Ex: 78.5"
                  value={profileForm.weight}
                  onChange={(e) => setProfileForm((f) => ({ ...f, weight: e.target.value }))}
                  className="w-full bg-[#0F1115] border border-white/10 focus:border-primary-container rounded-xl px-4 py-3 text-white font-medium focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant font-bold uppercase">Altura (cm)</label>
                <input
                  type="number" inputMode="decimal" step="0.1" min="0" placeholder="Ex: 178"
                  value={profileForm.height}
                  onChange={(e) => setProfileForm((f) => ({ ...f, height: e.target.value }))}
                  className="w-full bg-[#0F1115] border border-white/10 focus:border-primary-container rounded-xl px-4 py-3 text-white font-medium focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="text-label-md text-on-surface-variant font-bold uppercase">% Gordura (opcional)</label>
              <input
                type="number" inputMode="decimal" step="0.1" min="0" placeholder="Ex: 14.2"
                value={profileForm.body_fat}
                onChange={(e) => setProfileForm((f) => ({ ...f, body_fat: e.target.value }))}
                className="w-full bg-[#0F1115] border border-white/10 focus:border-primary-container rounded-xl px-4 py-3 text-white font-medium focus:outline-none transition-colors"
              />
            </div>

            <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-md flex items-center justify-between">
              <div>
                <p className="text-label-md text-on-surface-variant font-bold uppercase">IMC</p>
                <p className="text-xs text-on-surface-variant/70">Índice de Massa Corporal</p>
              </div>
              {profileBmi !== null ? (
                <div className="text-right">
                  <p className="text-2xl font-black text-white leading-none">{profileBmi.toFixed(1)}</p>
                  <p className={`text-xs font-bold ${bmiClass(profileBmi).color}`}>{bmiClass(profileBmi).label}</p>
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant/60 font-medium">Informe peso e altura</p>
              )}
            </div>

            <button
              type="submit" disabled={savingProfile}
              className="w-full bg-primary-container text-on-primary font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-wider text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              {savingProfile ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </div>
      )}

      {/* Toast notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 z-50 bg-[#252525] border-l-4 border-l-primary-container border-y border-r border-white/10 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-[24rem] text-sm font-bold text-white"
          >
            <Sparkles className="w-4 h-4 text-primary-container fill-primary-container" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {activeWorkout ? (
        // ACTIVE WORKOUT INTERACTION MODE
        <main className="w-full max-w-[36rem] px-margin-mobile pt-4">
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
                <button
                  type="button"
                  onClick={openProfile}
                  title="Editar perfil"
                  className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-500 overflow-hidden flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white uppercase">{user ? user.name.slice(0, 2) : 'JD'}</span>
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-semibold truncate text-white">{user ? user.name : 'Visitante'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}{user?.role === 'admin' ? ' · Admin' : ''}</p>
                  </div>
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={openAdmin}
                    title="Administração de usuários"
                    className="p-2 text-on-surface-variant hover:text-primary-container hover:bg-white/5 rounded-lg transition-colors shrink-0"
                  >
                    <Users className="w-4.5 h-4.5" />
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  title="Sair"
                  className="p-2 text-on-surface-variant hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </aside>

          {/* Right Area - Header + Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header - Mobile only (com safe-area para notch/status bar) */}
            <header className="md:hidden w-full bg-[#0F1115]/80 backdrop-blur-md border-b border-white/10 h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex items-center sticky top-0 z-40 justify-center">
              <div className="w-full max-w-2xl px-margin-mobile flex justify-between items-center">
                {/* Logo / Branding */}
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary-container text-2xl font-bold animate-pulse">bolt</span>
                  <span className="text-body-lg font-black text-white tracking-widest uppercase">
                    KINE<span className="text-primary-container">TIC</span>
                  </span>
                </div>

                {user?.role === 'admin' && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary-container bg-primary-container/10 border border-primary-container/25 px-2 py-1 rounded-full">
                    Admin
                  </span>
                )}

                {user?.role === 'admin' && (
                  <button
                    onClick={openAdmin}
                    title="Administração de usuários"
                    className="p-2 text-on-surface-variant hover:text-primary-container rounded-lg transition-colors"
                  >
                    <Users className="w-4.5 h-4.5" />
                  </button>
                )}

                <button
                  onClick={openProfile}
                  title="Meu perfil"
                  className="p-2 text-on-surface-variant hover:text-primary-container rounded-lg transition-colors"
                >
                  <User className="w-4.5 h-4.5" />
                </button>

                {/* Logout - Mobile */}
                <button
                  onClick={handleLogout}
                  title="Sair"
                  className="p-2 -mr-1 text-on-surface-variant hover:text-red-400 rounded-lg transition-colors"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
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
                <div className="glass-panel p-lg rounded-2xl border-dashed border-red-500/30 text-center space-y-md my-auto max-w-[28rem] mx-auto">
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
                        onImportFromCatalog={handleImportFromCatalog}
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

            {/* Bottom Navigation Menu Bar (Mobile only, com safe-area para gesto/home indicator) */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-[#0F1115]/95 backdrop-blur-xl border-t border-white/10 h-[calc(5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] flex justify-center items-center px-margin-mobile">
              <div className="w-full max-w-[36rem] flex justify-between items-center px-sm">
                
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
