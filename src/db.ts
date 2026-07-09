import crypto from 'crypto';
import { promisify } from 'util';
import { Pool, PoolClient } from 'pg';
import { Exercise, Workout, WorkoutExercise, WorkoutLog, UserProfile } from './types';

// scrypt assíncrono: não bloqueia o event loop (cada hash leva ~50-100ms; a
// versão síncrona congelava TODAS as requisições durante login/registro/reset).
const scryptAsync = promisify(crypto.scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export type { Exercise, Workout, WorkoutExercise, WorkoutLog };

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const RESET_TTL_MS = 60 * 60 * 1000;             // 1 hora (link de redefinição)

// Conexão com o Postgres (Neon em produção). Defina DATABASE_URL no .env.
const DATABASE_URL = process.env.DATABASE_URL || '';
const USE_SSL = !!DATABASE_URL && !/localhost|127\.0\.0\.1/.test(DATABASE_URL);

const IS_PROD = process.env.NODE_ENV === 'production';

// Bootstrap do primeiro administrador (definido no .env antes do primeiro start).
// Em produção é PROIBIDO usar senha padrão — o boot deve falhar sem ADMIN_PASSWORD
// (a verificação efetiva acontece em init(), garantindo que o processo recuse subir).
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@kinetic.local').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kinetic-admin';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

interface SessionRecord {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

function generateId() {
  return crypto.randomUUID();
}

// Data local no formato YYYY-MM-DD (evita deslocamento de fuso do toISOString)
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- Seed data (biblioteca inicial de exercícios entregue a cada novo usuário) ---
const initialExercises: Omit<Exercise, 'created_at'>[] = [
  {
    id: "ex-supino",
    name_pt: "Supino Reto",
    name_en: "Bench Press",
    muscle_group: "Peito, Tríceps, Ombros",
    description_pt: "Deite-se no banco com os pés firmemente apoiados no chão. Segure a barra com uma abertura ligeiramente maior que a largura dos ombros. Desça a barra lentamente até a altura do peito, mantendo uma leve curvatura na região lombar. Empurre a barra de volta até que os braços estejam totalmente estendidos, mas sem travar os cotovelos. Mantenha o core engajado e as escápulas retraídas.",
    description_en: "Lie flat on a bench with feet flat on the floor. Hold the barbell with a grip slightly wider than shoulder-width. Lower the bar slowly to chest level, keeping a slight lumbar curve. Push the bar back up until arms are fully extended but without locking elbows."
  },
  {
    id: "ex-agachamento",
    name_pt: "Agachamento com Barra",
    name_en: "Barbell Squat",
    muscle_group: "Quadríceps, Glúteos, Posterior",
    description_pt: "Apoie a barra nos ombros (trapézio). Mantenha os pés afastados na largura dos ombros, abdômen contraído e coluna neutra. Agache descendo os quadris como se estivesse sentando em uma cadeira, até as coxas ficarem paralelas ao chão (ou abaixo). Empurre através dos calcanhares para retornar à posição inicial.",
    description_en: "Rest the bar on your upper traps. Keep feet shoulder-width apart, core engaged and spine neutral. Squat down by lowering hips as if sitting back into a chair until thighs are parallel to the floor. Push through heels to return to start."
  },
  {
    id: "ex-militar",
    name_pt: "Desenvolvimento Militar",
    name_en: "Overhead Press",
    muscle_group: "Ombros, Tríceps, Core",
    description_pt: "Fique em pé com a barra apoiada na parte superior do peito. Segure-a na largura dos ombros. Contraia o abdômen e os glúteos e empurre a barra para cima, estendendo os braços diretamente acima da cabeça. Desça de forma controlada.",
    description_en: "Stand with the barbell resting on your upper chest, hands shoulder-width. Contract core and glutes, then press the bar straight overhead. Lower with control."
  },
  {
    id: "ex-triceps",
    name_pt: "Tríceps Pulley",
    name_en: "Triceps Pushdown",
    muscle_group: "Tríceps",
    description_pt: "De frente para o cabo, segure a barra ou corda com os cotovelos fixados nas laterais do corpo. Estenda os cotovelos empurrando a carga para baixo de forma controlada até estender totalmente os braços. Retorne lentamente.",
    description_en: "Face the pulley machine, grab the bar/rope with elbows pinned to your sides. Extend elbows, pushing the weight down with control until arms are straight. Return slowly."
  },
  {
    id: "ex-terra",
    name_pt: "Levantamento Terra",
    name_en: "Deadlift",
    muscle_group: "Costas, Pernas, Posterior, Glúteos",
    description_pt: "Fique em pé com os pés abaixo da barra. Agache mantendo a coluna reta e segure a barra. Suba estendendo os quadris e joelhos simultaneamente, mantendo a barra bem próxima ao corpo. Termine ereto sem hiperextender a lombar.",
    description_en: "Stand with feet under the bar. Squat with flat back and grip the bar. Lift by extending hips and knees together, keeping the bar close to your body."
  },
  {
    id: "ex-rosca",
    name_pt: "Rosca Direta",
    name_en: "Bicep Curl",
    muscle_group: "Bíceps, Antebraços",
    description_pt: "Fique em pé com um halter em cada mão ou barra. Mantenha os cotovelos próximos ao corpo e flexione os braços, trazendo o peso em direção aos ombros. Desça de forma lenta e controlada.",
    description_en: "Stand with weights in hand, palms forward. Keep elbows close to torso, curl the weights up toward shoulders. Lower with control."
  }
];

// Workouts/logs de exemplo — criados uma vez para o admin no primeiro start
const initialWorkouts = [
  { id: "w-push", name: "Push Day" },
  { id: "w-pull", name: "Pull Day" },
  { id: "w-legs", name: "Legs Day" }
];

const initialWorkoutExercises = [
  { id: "we-1", workout_id: "w-push", exercise_id: "ex-agachamento", series: 3, repetitions: "10 — 12", rest_time: "02:00", weight: 90 },
  { id: "we-2", workout_id: "w-push", exercise_id: "ex-supino", series: 4, repetitions: "10 — 12", rest_time: "01:45", weight: 80 },
  { id: "we-3", workout_id: "w-push", exercise_id: "ex-militar", series: 3, repetitions: "10 — 12", rest_time: "01:30", weight: 50 },
  { id: "we-4", workout_id: "w-push", exercise_id: "ex-triceps", series: 3, repetitions: "12 — 15", rest_time: "01:00", weight: 30 },
  { id: "we-5", workout_id: "w-pull", exercise_id: "ex-terra", series: 4, repetitions: "8 — 10", rest_time: "02:30", weight: 120 },
  { id: "we-6", workout_id: "w-pull", exercise_id: "ex-rosca", series: 3, repetitions: "10 — 12", rest_time: "01:15", weight: 16 }
];

export class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: DATABASE_URL,
      // TLS com verificação de certificado (autentica o servidor, evita MITM).
      // Neon suporta sslmode=verify-full; `ssl: true` usa a CA do sistema e mantém
      // rejectUnauthorized=true (padrão do node-postgres).
      ssl: USE_SSL ? true : undefined,
    });
  }

  // Atalho para consultas
  private async q(text: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    const r = await this.pool.query(text, params);
    return { rows: r.rows, rowCount: r.rowCount ?? 0 };
  }

  // Deve ser chamado uma vez no start do servidor (antes de atender requisições)
  async init() {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL não definida. Configure a URL do Postgres (Neon) no .env.');
    }
    // Em produção, recusa subir com a senha de admin padrão: exige ADMIN_PASSWORD.
    if (IS_PROD && !process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_PASSWORD não definida. Em produção é obrigatório definir ADMIN_PASSWORD (não há senha padrão).');
    }
    await this.createSchema();
    await this.createIndexes();
    const adminId = await this.ensureAdmin();
    const firstRun = (await this.q(`SELECT COUNT(*)::int AS c FROM exercises`)).rows[0].c === 0;
    if (firstRun) await this.seedDemoData(adminId);
    await this.pruneSessions();
    await this.prunePasswordResets();

    // Limpeza periódica (a cada 6h) — processos de longa duração não acumulam
    // sessões/resets expirados. unref() não impede o processo de encerrar.
    const cleanup = setInterval(() => {
      this.pruneSessions().catch(() => {});
      this.prunePasswordResets().catch(() => {});
    }, 6 * 60 * 60 * 1000);
    cleanup.unref?.();
  }

  private async createSchema() {
    await this.q(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        weight DOUBLE PRECISION NOT NULL DEFAULT 0,
        height DOUBLE PRECISION NOT NULL DEFAULT 0,
        body_fat DOUBLE PRECISION NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name_pt TEXT NOT NULL,
        name_en TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        description_pt TEXT NOT NULL DEFAULT '',
        description_en TEXT NOT NULL DEFAULT '',
        image_muscle TEXT NOT NULL DEFAULT '',
        image_equipment TEXT NOT NULL DEFAULT '',
        image_demo TEXT NOT NULL DEFAULT '',
        video_url TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        series INTEGER NOT NULL DEFAULT 3,
        repetitions TEXT NOT NULL DEFAULT '10 - 12',
        rest_time TEXT NOT NULL DEFAULT '01:30',
        weight DOUBLE PRECISION NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS workout_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workout_id TEXT NOT NULL,
        workout_name TEXT NOT NULL,
        date TEXT NOT NULL,
        duration INTEGER NOT NULL,
        calories INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS password_resets (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  private async createIndexes() {
    await this.q(`
      CREATE INDEX IF NOT EXISTS idx_ex_user ON exercises(user_id);
      CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id);
      CREATE INDEX IF NOT EXISTS idx_we_user ON workout_exercises(user_id);
      CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_user_date ON workout_logs(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `);
  }

  // Dados de exemplo criados uma vez para o admin (primeiro start)
  private async seedDemoData(adminId: string) {
    const now = new Date().toISOString();
    for (const e of initialExercises) {
      await this.q(
        `INSERT INTO exercises (id, user_id, name_pt, name_en, muscle_group, description_pt, description_en, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [e.id, adminId, e.name_pt, e.name_en, e.muscle_group, e.description_pt, e.description_en, now]
      );
    }
    for (const w of initialWorkouts) {
      await this.q(
        `INSERT INTO workouts (id, name, user_id, created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [w.id, w.name, adminId, now]
      );
    }
    for (const we of initialWorkoutExercises) {
      await this.q(
        `INSERT INTO workout_exercises (id, user_id, workout_id, exercise_id, series, repetitions, rest_time, weight)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [we.id, adminId, we.workout_id, we.exercise_id, we.series, we.repetitions, we.rest_time, we.weight]
      );
    }
    const seedLogs = [
      { offsetDays: 1, workout_id: 'w-push', name: 'Treino de Empurrar', duration: 45, calories: 320, notes: 'Excelente conexão mente-músculo no supino reto. Progredi 2kg na última série.' },
      { offsetDays: 3, workout_id: 'w-pull', name: 'Treino de Puxar', duration: 50, calories: 410, notes: 'Levantamento terra pesado, core firme. Bíceps bem fadigados no final.' },
      { offsetDays: 5, workout_id: 'w-legs', name: 'Treino de Pernas', duration: 60, calories: 580, notes: 'Agachamento profundo com boa amplitude. Próxima semana tentar subir carga.' }
    ];
    for (const s of seedLogs) {
      const d = new Date(Date.now() - s.offsetDays * 86400000);
      await this.q(
        `INSERT INTO workout_logs (id, user_id, workout_id, workout_name, date, duration, calories, notes, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        ['log-' + generateId(), adminId, s.workout_id, s.name, localDateKey(d), s.duration, s.calories, s.notes, d.toISOString()]
      );
    }
  }

  // ---------------- Autenticação / Usuários ----------------
  private async hashPassword(password: string, salt: string): Promise<string> {
    return (await scryptAsync(password, salt, 64)).toString('hex');
  }

  // Hash de tokens de sessão/redefinição para armazenar no banco. O token bruto
  // vai para o cookie/link do usuário; no banco guardamos só o sha256 — assim um
  // vazamento do banco não permite sequestrar sessões nem resets pendentes.
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Executa uma função dentro de uma transação (BEGIN/COMMIT/ROLLBACK) com um
  // client dedicado do pool. Em caso de erro, desfaz tudo.
  private async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      throw e;
    } finally {
      client.release();
    }
  }

  private rowToUser(row: any): User {
    return { id: row.id, email: row.email, role: row.role, status: row.status, created_at: row.created_at };
  }

  // Cria o admin inicial se ainda não existir nenhum admin. Retorna o id do admin.
  private async ensureAdmin(): Promise<string> {
    const existing = (await this.q(`SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1`)).rows[0];
    if (existing) return existing.id;

    const byEmail = (await this.q(`SELECT id FROM users WHERE email = $1`, [ADMIN_EMAIL])).rows[0];
    if (byEmail) {
      await this.q(`UPDATE users SET role = 'admin', status = 'approved' WHERE id = $1`, [byEmail.id]);
      return byEmail.id;
    }

    const id = 'usr-' + generateId();
    const salt = crypto.randomBytes(16).toString('hex');
    await this.q(
      `INSERT INTO users (id, email, salt, password_hash, role, status, created_at)
       VALUES ($1,$2,$3,$4,'admin','approved',$5)`,
      [id, ADMIN_EMAIL, salt, await this.hashPassword(ADMIN_PASSWORD, salt), new Date().toISOString()]
    );
    await this.q(
      `INSERT INTO profiles (user_id, name, weight, height, body_fat) VALUES ($1,$2,0,0,0) ON CONFLICT (user_id) DO NOTHING`,
      [id, ADMIN_EMAIL.split('@')[0] || 'Admin']
    );
    if (!process.env.ADMIN_PASSWORD) {
      console.warn(`AVISO: admin "${ADMIN_EMAIL}" criado com senha padrão. Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente.`);
    }
    return id;
  }

  private async seedDefaultExercises(userId: string) {
    const now = new Date().toISOString();
    for (const e of initialExercises) {
      await this.q(
        `INSERT INTO exercises (id, user_id, name_pt, name_en, muscle_group, description_pt, description_en, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        ['ex-' + generateId(), userId, e.name_pt, e.name_en, e.muscle_group, e.description_pt, e.description_en, now]
      );
    }
  }

  async createUser(email: string, password: string, opts?: { role?: UserRole; status?: UserStatus }): Promise<User> {
    const normalized = email.toLowerCase().trim();
    const id = 'usr-' + generateId();
    const salt = crypto.randomBytes(16).toString('hex');
    const role = opts?.role ?? 'user';
    const status = opts?.status ?? 'pending';
    await this.q(
      `INSERT INTO users (id, email, salt, password_hash, role, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, normalized, salt, await this.hashPassword(password, salt), role, status, new Date().toISOString()]
    );
    await this.q(
      `INSERT INTO profiles (user_id, name, weight, height, body_fat) VALUES ($1,$2,0,0,0) ON CONFLICT (user_id) DO NOTHING`,
      [id, normalized.split('@')[0] || 'Usuário']
    );
    await this.seedDefaultExercises(id);
    return (await this.getUserById(id))!;
  }

  async getUserByEmail(email: string): Promise<(User & { salt: string; password_hash: string }) | undefined> {
    return (await this.q(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase().trim()])).rows[0] as any;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const row = (await this.q(`SELECT id, email, role, status, created_at FROM users WHERE id = $1`, [id])).rows[0];
    return row ? this.rowToUser(row) : undefined;
  }

  async verifyUserPassword(email: string, password: string): Promise<User | null> {
    const row = await this.getUserByEmail(email);
    if (!row) return null;
    const attempt = Buffer.from(await this.hashPassword(password, row.salt), 'hex');
    const stored = Buffer.from(row.password_hash, 'hex');
    if (attempt.length !== stored.length || !crypto.timingSafeEqual(attempt, stored)) return null;
    return this.rowToUser(row);
  }

  async setUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const salt = crypto.randomBytes(16).toString('hex');
    const r = await this.q(`UPDATE users SET salt = $1, password_hash = $2 WHERE id = $3`,
      [salt, await this.hashPassword(newPassword, salt), userId]);
    await this.q(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    return r.rowCount > 0;
  }

  async listUsers(): Promise<User[]> {
    return (await this.q(`SELECT id, email, role, status, created_at FROM users ORDER BY created_at`)).rows.map(r => this.rowToUser(r));
  }

  async setUserStatus(userId: string, status: UserStatus): Promise<User | undefined> {
    await this.q(`UPDATE users SET status = $1 WHERE id = $2`, [status, userId]);
    return this.getUserById(userId);
  }

  async countAdmins(): Promise<number> {
    return (await this.q(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'`)).rows[0].c;
  }

  async deleteUser(userId: string): Promise<boolean> {
    // workouts/exercises/logs não têm FK para users → apaga manualmente.
    // profiles/sessions/password_resets têm ON DELETE CASCADE ao remover o user.
    // Tudo em uma transação: se algo falhar no meio, não deixa dados órfãos.
    return this.withTransaction(async (client) => {
      await client.query(`DELETE FROM workout_logs WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM workout_exercises WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM workouts WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM exercises WHERE user_id = $1`, [userId]);
      const r = await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
      return (r.rowCount ?? 0) > 0;
    });
  }

  // ---------------- Sessões ----------------
  async createSession(userId: string): Promise<SessionRecord> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const session: SessionRecord = {
      token: rawToken, // devolvido ao cliente (cookie); NÃO é o que fica no banco
      user_id: userId,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString()
    };
    await this.q(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4)`,
      [this.hashToken(rawToken), session.user_id, session.created_at, session.expires_at]);
    return session;
  }

  async getSessionUser(token: string | undefined): Promise<User | null> {
    if (!token) return null;
    const row = (await this.q(
      `SELECT u.id, u.email, u.role, u.status, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > $2`,
      [this.hashToken(token), new Date().toISOString()]
    )).rows[0];
    if (!row || row.status !== 'approved') return null;
    return this.rowToUser(row);
  }

  async deleteSession(token: string) {
    await this.q(`DELETE FROM sessions WHERE token = $1`, [this.hashToken(token)]);
  }

  private async pruneSessions() {
    await this.q(`DELETE FROM sessions WHERE expires_at <= $1`, [new Date().toISOString()]);
  }

  // ---------------- Redefinição de senha ----------------
  async createPasswordReset(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    // Invalida links anteriores do mesmo usuário: só o mais recente vale (M11).
    await this.q(`DELETE FROM password_resets WHERE user_id = $1`, [userId]);
    await this.q(
      `INSERT INTO password_resets (token, user_id, created_at, expires_at, used) VALUES ($1,$2,$3,$4,0)`,
      [this.hashToken(token), userId, now.toISOString(), new Date(now.getTime() + RESET_TTL_MS).toISOString()]
    );
    return token;
  }

  async consumePasswordReset(token: string): Promise<string | null> {
    const hashed = this.hashToken(token);
    const row = (await this.q(
      `SELECT user_id FROM password_resets WHERE token = $1 AND used = 0 AND expires_at > $2`,
      [hashed, new Date().toISOString()]
    )).rows[0];
    if (!row) return null;
    await this.q(`UPDATE password_resets SET used = 1 WHERE token = $1`, [hashed]);
    return row.user_id;
  }

  private async prunePasswordResets() {
    await this.q(`DELETE FROM password_resets WHERE expires_at <= $1 OR used = 1`, [new Date().toISOString()]);
  }

  // ---------------- Exercises (por usuário) ----------------
  async getExercises(userId: string): Promise<Exercise[]> {
    return (await this.q(`SELECT id, name_pt, name_en, muscle_group, description_pt, description_en, image_muscle, image_equipment, image_demo, video_url, created_at FROM exercises WHERE user_id = $1 ORDER BY created_at`, [userId])).rows as Exercise[];
  }

  async getExerciseById(userId: string, id: string): Promise<Exercise | undefined> {
    return (await this.q(`SELECT id, name_pt, name_en, muscle_group, description_pt, description_en, image_muscle, image_equipment, image_demo, video_url, created_at FROM exercises WHERE id = $1 AND user_id = $2`, [id, userId])).rows[0] as Exercise | undefined;
  }

  async addExercise(userId: string, exercise: Omit<Exercise, 'id' | 'created_at'>): Promise<Exercise> {
    const newEx: Exercise = {
      ...exercise,
      image_muscle: exercise.image_muscle ?? '',
      image_equipment: exercise.image_equipment ?? '',
      image_demo: exercise.image_demo ?? '',
      video_url: exercise.video_url ?? '',
      id: "ex-" + generateId(),
      created_at: new Date().toISOString(),
    };
    await this.q(
      `INSERT INTO exercises (id, user_id, name_pt, name_en, muscle_group, description_pt, description_en, image_muscle, image_equipment, image_demo, video_url, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [newEx.id, userId, newEx.name_pt, newEx.name_en, newEx.muscle_group, newEx.description_pt, newEx.description_en, newEx.image_muscle, newEx.image_equipment, newEx.image_demo, newEx.video_url, newEx.created_at]
    );
    return newEx;
  }

  async updateExercise(userId: string, id: string, updates: Partial<Omit<Exercise, 'id' | 'created_at'>>): Promise<Exercise | undefined> {
    const ex = await this.getExerciseById(userId, id);
    if (!ex) return undefined;
    const merged = { ...ex, ...updates };
    await this.q(
      `UPDATE exercises SET name_pt = $1, name_en = $2, muscle_group = $3, description_pt = $4, description_en = $5,
              image_muscle = $6, image_equipment = $7, image_demo = $8, video_url = $9
       WHERE id = $10 AND user_id = $11`,
      [
        merged.name_pt, merged.name_en, merged.muscle_group, merged.description_pt, merged.description_en,
        merged.image_muscle ?? '', merged.image_equipment ?? '', merged.image_demo ?? '', merged.video_url ?? '',
        id, userId,
      ]
    );
    return merged;
  }

  async deleteExercise(userId: string, id: string): Promise<boolean> {
    return (await this.q(`DELETE FROM exercises WHERE id = $1 AND user_id = $2`, [id, userId])).rowCount > 0;
  }

  // ---------------- Workouts (por usuário) ----------------
  async getWorkouts(userId: string): Promise<Workout[]> {
    return (await this.q(`SELECT * FROM workouts WHERE user_id = $1 ORDER BY created_at`, [userId])).rows as Workout[];
  }

  async addWorkout(userId: string, name: string): Promise<Workout> {
    const newW: Workout = { id: "w-" + generateId(), name, user_id: userId, created_at: new Date().toISOString() };
    await this.q(`INSERT INTO workouts (id, name, user_id, created_at) VALUES ($1,$2,$3,$4)`,
      [newW.id, newW.name, newW.user_id, newW.created_at]);
    return newW;
  }

  async updateWorkout(userId: string, id: string, name: string): Promise<Workout | undefined> {
    const r = await this.q(`UPDATE workouts SET name = $1 WHERE id = $2 AND user_id = $3`, [name, id, userId]);
    if (r.rowCount === 0) return undefined;
    return (await this.q(`SELECT * FROM workouts WHERE id = $1`, [id])).rows[0] as Workout;
  }

  async deleteWorkout(userId: string, id: string): Promise<boolean> {
    return (await this.q(`DELETE FROM workouts WHERE id = $1 AND user_id = $2`, [id, userId])).rowCount > 0;
  }

  // ---------------- Workout Exercises (por usuário) ----------------
  async getWorkoutExercises(userId: string): Promise<WorkoutExercise[]> {
    return (await this.q(`SELECT id, workout_id, exercise_id, series, repetitions, rest_time, weight FROM workout_exercises WHERE user_id = $1`, [userId])).rows as WorkoutExercise[];
  }

  async getWorkoutExercisesForWorkout(userId: string, workoutId: string): Promise<WorkoutExercise[]> {
    return (await this.q(`SELECT id, workout_id, exercise_id, series, repetitions, rest_time, weight FROM workout_exercises WHERE workout_id = $1 AND user_id = $2`, [workoutId, userId])).rows as WorkoutExercise[];
  }

  async addWorkoutExercise(userId: string, we: Omit<WorkoutExercise, 'id'>): Promise<WorkoutExercise | undefined> {
    const owns = (await this.q(`SELECT 1 FROM workouts WHERE id = $1 AND user_id = $2`, [we.workout_id, userId])).rows[0];
    if (!owns) return undefined;
    const newWe: WorkoutExercise = { ...we, id: "we-" + generateId() };
    await this.q(
      `INSERT INTO workout_exercises (id, user_id, workout_id, exercise_id, series, repetitions, rest_time, weight) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [newWe.id, userId, newWe.workout_id, newWe.exercise_id, newWe.series, newWe.repetitions, newWe.rest_time, newWe.weight]
    );
    return newWe;
  }

  async updateWorkoutExercise(userId: string, id: string, updates: Partial<Omit<WorkoutExercise, 'id' | 'workout_id' | 'exercise_id'>>): Promise<WorkoutExercise | undefined> {
    const item = (await this.q(`SELECT id, workout_id, exercise_id, series, repetitions, rest_time, weight FROM workout_exercises WHERE id = $1 AND user_id = $2`, [id, userId])).rows[0] as WorkoutExercise | undefined;
    if (!item) return undefined;
    const merged = { ...item, ...updates };
    await this.q(
      `UPDATE workout_exercises SET series = $1, repetitions = $2, rest_time = $3, weight = $4 WHERE id = $5 AND user_id = $6`,
      [merged.series, merged.repetitions, merged.rest_time, merged.weight, id, userId]
    );
    return merged;
  }

  async deleteWorkoutExercise(userId: string, id: string): Promise<boolean> {
    return (await this.q(`DELETE FROM workout_exercises WHERE id = $1 AND user_id = $2`, [id, userId])).rowCount > 0;
  }

  // ---------------- Treinos gerados (motor inteligente) ----------------

  // Garante que um exercício da base curada exista na biblioteca do usuário.
  // Usa um id estável (gen-<userId>-<slug>) para ser idempotente entre gerações.
  async ensureGeneratedExercise(
    userId: string,
    e: { slug: string; nome: string; name_en: string; grupoMuscular: string }
  ): Promise<string> {
    const id = `gen-${userId}-${e.slug}`;
    await this.q(
      `INSERT INTO exercises (id, user_id, name_pt, name_en, muscle_group, description_pt, description_en, image_muscle, image_equipment, image_demo, video_url, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'','','','',$8) ON CONFLICT (id) DO NOTHING`,
      [id, userId, e.nome, e.name_en, e.grupoMuscular, 'Exercício gerado automaticamente pelo motor de treinos.', e.name_en, new Date().toISOString()]
    );
    return id;
  }

  // Persiste um plano gerado: cria um treino por dia + os exercícios vinculados.
  async createGeneratedPlan(
    userId: string,
    days: Array<{
      nome: string;
      exercicios: Array<{
        slug: string; nome: string; name_en: string; grupoMuscular: string;
        series: number; repeticoes: string; descanso: string;
      }>;
    }>
  ): Promise<Workout[]> {
    // Tudo em uma transação: um plano ou é criado por inteiro ou não é criado —
    // nunca metade dos treinos/exercícios (evita rotinas pela metade no banco).
    return this.withTransaction(async (client) => {
      const created: Workout[] = [];
      const now = new Date().toISOString();
      for (const day of days) {
        const workout: Workout = { id: 'w-' + generateId(), name: day.nome, user_id: userId, created_at: now };
        await client.query(`INSERT INTO workouts (id, name, user_id, created_at) VALUES ($1,$2,$3,$4)`,
          [workout.id, workout.name, workout.user_id, workout.created_at]);
        for (const ex of day.exercicios) {
          const exerciseId = `gen-${userId}-${ex.slug}`;
          await client.query(
            `INSERT INTO exercises (id, user_id, name_pt, name_en, muscle_group, description_pt, description_en, image_muscle, image_equipment, image_demo, video_url, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'','','','',$8) ON CONFLICT (id) DO NOTHING`,
            [exerciseId, userId, ex.nome, ex.name_en, ex.grupoMuscular, 'Exercício gerado automaticamente pelo motor de treinos.', ex.name_en, now]
          );
          await client.query(
            `INSERT INTO workout_exercises (id, user_id, workout_id, exercise_id, series, repetitions, rest_time, weight) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            ['we-' + generateId(), userId, workout.id, exerciseId, ex.series, ex.repeticoes, ex.descanso, 0]
          );
        }
        created.push(workout);
      }
      return created;
    });
  }

  // ---------------- Workout Logs (por usuário) ----------------
  async getWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
    return (await this.q(`SELECT * FROM workout_logs WHERE user_id = $1 ORDER BY date DESC, created_at DESC`, [userId])).rows as WorkoutLog[];
  }

  async addWorkoutLog(userId: string, log: Omit<WorkoutLog, 'id' | 'created_at' | 'user_id'>): Promise<WorkoutLog> {
    const newLog: WorkoutLog = { ...log, user_id: userId, id: "log-" + generateId(), created_at: new Date().toISOString() };
    await this.q(
      `INSERT INTO workout_logs (id, user_id, workout_id, workout_name, date, duration, calories, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [newLog.id, newLog.user_id, newLog.workout_id, newLog.workout_name, newLog.date, newLog.duration, newLog.calories, newLog.notes, newLog.created_at]
    );
    return newLog;
  }

  // ---------------- Estatísticas (por usuário) ----------------
  private async computeStats(userId: string): Promise<{ streak: number; weekly_workouts: number; active_minutes: number }> {
    const rows = (await this.q(`SELECT DISTINCT date FROM workout_logs WHERE user_id = $1 AND date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`, [userId])).rows as { date: string }[];
    const logDates = new Set(rows.map(r => r.date));

    let streak = 0;
    const cursor = new Date();
    if (!logDates.has(localDateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (logDates.has(localDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    const weekRow = (await this.q(
      `SELECT COUNT(*)::int AS cnt, COALESCE(SUM(duration), 0)::int AS mins FROM workout_logs WHERE user_id = $1 AND date >= $2`,
      [userId, localDateKey(weekStart)]
    )).rows[0] as { cnt: number; mins: number };

    return { streak, weekly_workouts: weekRow.cnt, active_minutes: weekRow.mins };
  }

  // ---------------- Perfil (por usuário) ----------------
  async getUserProfile(userId: string): Promise<UserProfile> {
    const row = (await this.q(`SELECT name, weight, height, body_fat FROM profiles WHERE user_id = $1`, [userId])).rows[0] as { name: string; weight: number; height: number; body_fat: number } | undefined;
    const stats = await this.computeStats(userId);
    const weight = row?.weight ?? 0;
    const height = row?.height ?? 0;
    const bmi = height > 0 ? Math.round((weight / ((height / 100) ** 2)) * 10) / 10 : 0;
    return {
      name: row?.name ?? 'Usuário',
      weight,
      height,
      body_fat: row?.body_fat ?? 0,
      bmi,
      active_minutes: stats.active_minutes,
      streak: stats.streak,
      weekly_workouts: stats.weekly_workouts
    };
  }

  async updateUserProfile(userId: string, updates: { name?: string; weight?: number; height?: number; body_fat?: number }): Promise<UserProfile> {
    const current = (await this.q(`SELECT name, weight, height, body_fat FROM profiles WHERE user_id = $1`, [userId])).rows[0] as { name: string; weight: number; height: number; body_fat: number } | undefined;
    const base = current ?? { name: 'Usuário', weight: 0, height: 0, body_fat: 0 };
    const name = (typeof updates.name === 'string' && updates.name.trim()) ? updates.name.trim() : base.name;
    const weight = (typeof updates.weight === 'number' && updates.weight > 0) ? updates.weight : base.weight;
    const height = (typeof updates.height === 'number' && updates.height > 0) ? updates.height : base.height;
    const body_fat = (typeof updates.body_fat === 'number' && updates.body_fat >= 0) ? updates.body_fat : base.body_fat;
    await this.q(
      `INSERT INTO profiles (user_id, name, weight, height, body_fat) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, weight = EXCLUDED.weight, height = EXCLUDED.height, body_fat = EXCLUDED.body_fat`,
      [userId, name, weight, height, body_fat]
    );
    return this.getUserProfile(userId);
  }
}

// Instância global
export const db = new Database();
