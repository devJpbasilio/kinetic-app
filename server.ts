import 'dotenv/config'; // IMPORTANTE: carrega o .env ANTES de qualquer módulo (ex.: ./src/db) ler process.env
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import nodemailer from 'nodemailer';
import { db } from './src/db';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined. AI Translation features will fallback to client simulation.");
}

// ---------- Helpers de autenticação ----------
const SESSION_COOKIE = 'kinetic_session';
const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 dias
const IS_PROD = process.env.NODE_ENV === 'production';

// Monta o cookie de sessão. Em produção (atrás de HTTPS) adiciona "Secure",
// impedindo que o cookie trafegue em conexões não criptografadas.
function sessionCookie(value: string, maxAgeS: number): string {
  const base = `${SESSION_COOKIE}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeS}`;
  return IS_PROD ? `${base}; Secure` : base;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function getSessionToken(req: Request): string | undefined {
  return parseCookies(req)[SESSION_COOKIE];
}

// Usuário autenticado da requisição atual (definido por requireAuth)
function currentUser(req: Request) {
  return (req as any).user as import('./src/db').User;
}
function uid(req: Request): string {
  return currentUser(req).id;
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await db.getSessionUser(getSessionToken(req));
    if (!user) {
      return res.status(401).json({ error: 'Não autenticado. Faça login para continuar.' });
    }
    (req as any).user = user;
    next();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = currentUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
}

// Validação simples de e-mail
function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ---------- Rate limiter simples em memória ----------
function createRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, { count: number; windowStart: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'global';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.windowStart > windowMs) {
      hits.set(key, { count: 1, windowStart: now });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      const retryS = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryS));
      return res.status(429).json({ error: `Muitas requisições. Tente novamente em ${retryS}s.` });
    }
    next();
  };
}

const loginLimiter = createRateLimiter(10, 60_000);     // 10 tentativas de login/min
const translateLimiter = createRateLimiter(5, 60_000);  // 5 traduções por IA/min
const MAX_TRANSLATE_INPUT = 20_000; // chars

// API externa de exercícios (hospedada no Render). Configurável via .env.
const EXERCISES_API = (process.env.EXERCISES_API_URL || 'https://api-exercicios-fisicos.onrender.com').replace(/\/+$/, '');
const catalogLimiter = createRateLimiter(60, 60_000); // 60 buscas no catálogo/min

// ---------- E-mail (redefinição de senha) ----------
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
const MAIL_FROM = process.env.MAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@kinetic.app';

// Cria o transporte de e-mail a partir do .env. Se nada estiver configurado, fica null
// e o link de redefinição é apenas logado no console (modo de desenvolvimento).
const mailTransport = (() => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return null;
})();

async function sendResetEmail(to: string, link: string) {
  if (!mailTransport) {
    console.log(`\n──────── REDEFINIÇÃO DE SENHA (dev) ────────\nPara: ${to}\nLink (válido 1h): ${link}\nConfigure GMAIL_USER/GMAIL_APP_PASSWORD (ou SMTP_*) no .env para enviar por e-mail.\n────────────────────────────────────────────\n`);
    return;
  }
  await mailTransport.sendMail({
    from: `Kinetic <${MAIL_FROM}>`,
    to,
    subject: 'Redefinição de senha — Kinetic',
    text: `Você pediu para redefinir sua senha no Kinetic.\n\nAbra o link abaixo (válido por 1 hora):\n${link}\n\nSe não foi você, ignore este e-mail.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0A0B0D">
        <h2 style="margin:0 0 8px">Redefinição de senha</h2>
        <p style="color:#555;margin:0 0 20px">Você pediu para redefinir sua senha no <strong>Kinetic</strong>. O link é válido por 1 hora.</p>
        <a href="${link}" style="display:inline-block;background:#CCFF00;color:#0A0B0D;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:10px">Redefinir minha senha</a>
        <p style="color:#888;font-size:12px;margin:20px 0 0">Se não foi você, ignore este e-mail. O link expira em 1 hora.</p>
      </div>`,
  });
}

// Escolhe o primeiro campo não-vazio dentre várias chaves possíveis
function pickStr(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

// Transforma um caminho relativo (/images/...) em URL absoluta da API
function toAbsUrl(p: string): string {
  if (!p) return '';
  return /^https?:\/\//i.test(p) ? p : `${EXERCISES_API}${p.startsWith('/') ? '' : '/'}${p}`;
}

// Converte um exercício da API externa para o formato do Kinetic
function mapCatalogToExercise(raw: any): { name_pt: string; name_en: string; muscle_group: string; description_pt: string; description_en: string; image_muscle: string; image_equipment: string; image_demo: string; video_url: string } {
  const ex = raw?.data ?? raw ?? {};
  const name_pt = pickStr(ex, ['name_pt', 'nome_pt', 'nome']);
  const name_en = pickStr(ex, ['name_en', 'name']);
  const muscle_group = pickStr(ex, ['target_muscle_group_pt', 'muscle_pt', 'primary_muscle_pt', 'grupo_muscular_pt']) || 'Geral';

  // A API não traz texto de execução; compõe uma descrição a partir dos campos estruturados
  let description_pt = pickStr(ex, ['description_pt', 'instructions_pt', 'execution_pt', 'how_to_pt', 'descricao_pt', 'steps_pt']);
  if (!description_pt) {
    const seg = (label: string, keys: string[]) => {
      const v = pickStr(ex, keys);
      return v ? `${label}: ${v}` : '';
    };
    const parts = [
      seg('Músculo principal', ['prime_mover_muscle_pt']),
      seg('Músculos secundários', ['secondary_muscle_pt']),
      seg('Equipamento', ['primary_equipment_pt']),
      seg('Postura', ['posture_pt']),
      seg('Pegada', ['grip_pt']),
      seg('Padrão de movimento', ['movement_pattern_1_pt']),
      seg('Plano de movimento', ['plane_of_motion_1_pt']),
      seg('Tipo de força', ['force_type_pt']),
      seg('Mecânica', ['mechanics_pt']),
      seg('Classificação', ['classification_pt']),
      seg('Região', ['body_region_pt']),
      seg('Dificuldade', ['difficulty_pt']),
    ].filter(Boolean);
    description_pt = parts.join('. ') || 'Exercício importado do catálogo.';
  }
  const description_en = pickStr(ex, ['description_en', 'instructions_en', 'execution_en', 'how_to_en']) || name_en;

  return {
    name_pt,
    name_en: name_en || name_pt,
    muscle_group,
    description_pt,
    description_en,
    image_muscle: toAbsUrl(pickStr(ex, ['image_muscle'])),
    image_equipment: toAbsUrl(pickStr(ex, ['image_equipment'])),
    image_demo: toAbsUrl(pickStr(ex, ['image_demo'])),
    video_url: pickStr(ex, ['video_demo_url', 'video_demo_embed', 'video_explanation_url']),
  };
}

async function startServer() {
  await db.init(); // conecta ao Postgres e garante o schema antes de atender requisições
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Não vazar o framework usado (remove o header "X-Powered-By: Express")
  app.disable('x-powered-by');

  // Atrás do proxy do host (Render/Railway/etc.): confia no X-Forwarded-* para
  // obter o IP real (rate limit) e permitir o cookie "Secure" via HTTPS do proxy.
  if (IS_PROD) app.set('trust proxy', 1);

  // ---------- Headers de segurança ----------
  // Protegem contra sniffing de MIME, clickjacking e vazamento de referrer.
  // CSP e HSTS só entram em produção: em dev quebrariam o HMR do Vite (que usa
  // inline scripts, eval e websocket) e o HSTS não faz sentido em http://localhost.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    if (IS_PROD) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self'",
          // 'unsafe-inline' em style: framer-motion e o Tailwind aplicam estilos inline
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: https:", // permite ícones da API e imagens externas (https)
          "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
        ].join('; ')
      );
    }
    next();
  });

  // Body parser com limite de payload (evita abuso)
  app.use(express.json({ limit: '256kb' }));

  // Payload de autenticação: perfil (nome, stats) + dados da conta (email/role)
  const authPayload = async (user: import('./src/db').User) => ({
    ...(await db.getUserProfile(user.id)),
    email: user.email,
    role: user.role,
  });

  // --- Rotas de Autenticação (públicas) ---

  // Registro: cria conta PENDENTE, aguardando aprovação de um administrador
  app.post('/api/auth/register', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!isValidEmail(email)) return res.status(400).json({ error: 'E-mail inválido.' });
      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
      }
      if (await db.getUserByEmail(email)) {
        return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
      }
      await db.createUser(email, password); // role 'user', status 'pending'
      res.status(201).json({ status: 'pending', message: 'Cadastro enviado. Aguarde a aprovação de um administrador.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Login por e-mail; barra contas ainda não aprovadas
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!isValidEmail(email) || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Informe e-mail e senha.' });
      }
      const user = await db.verifyUserPassword(email, password);
      if (!user) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      if (user.status !== 'approved') {
        return res.status(403).json({ error: 'Sua conta ainda não foi aprovada por um administrador.' });
      }
      const session = await db.createSession(user.id);
      res.setHeader('Set-Cookie', sessionCookie(session.token, SESSION_MAX_AGE_S));
      res.json({ user: await authPayload(user) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Esqueci a senha: gera token e envia link por e-mail (resposta sempre genérica)
  app.post('/api/auth/forgot-password', loginLimiter, async (req, res) => {
    const generic = { message: 'Se houver uma conta com este e-mail, enviamos um link para redefinir a senha.' };
    try {
      const { email } = req.body || {};
      if (isValidEmail(email)) {
        const user = await db.getUserByEmail(email);
        if (user) {
          const token = await db.createPasswordReset(user.id);
          const link = `${APP_URL}/reset?token=${token}`;
          try { await sendResetEmail(user.email, link); }
          catch (e) { console.error('Falha ao enviar e-mail de redefinição:', e); }
        }
      }
      res.json(generic); // não revela se o e-mail existe
    } catch {
      res.json(generic);
    }
  });

  // Redefinir a senha usando o token do link
  app.post('/api/auth/reset-password', loginLimiter, async (req, res) => {
    try {
      const { token, password } = req.body || {};
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Link inválido.' });
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres.' });
      }
      const userId = await db.consumePasswordReset(token);
      if (!userId) {
        return res.status(400).json({ error: 'Link inválido ou expirado. Solicite um novo.' });
      }
      await db.setUserPassword(userId, password); // também invalida sessões existentes
      res.json({ success: true, message: 'Senha redefinida. Faça login com a nova senha.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    const token = getSessionToken(req);
    if (token) await db.deleteSession(token);
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    res.json({ success: true });
  });

  app.get('/api/auth/me', async (req, res) => {
    const user = await db.getSessionUser(getSessionToken(req));
    if (!user) return res.status(401).json({ error: 'Não autenticado.' });
    res.json({ user: await authPayload(user) });
  });

  app.put('/api/auth/password', requireAuth, async (req, res) => {
    try {
      const { current, next } = req.body || {};
      if (!current || !next || typeof next !== 'string' || next.length < 8) {
        return res.status(400).json({ error: 'Informe a senha atual e uma nova senha com no mínimo 8 caracteres.' });
      }
      const me = currentUser(req);
      if (!(await db.verifyUserPassword(me.email, current))) {
        return res.status(401).json({ error: 'Senha atual incorreta.' });
      }
      await db.setUserPassword(me.id, next);
      res.json({ success: true, message: 'Senha alterada. Faça login novamente.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Todas as rotas /api abaixo exigem sessão válida ---
  app.use('/api', requireAuth);

  // --- Administração de usuários (somente admin) ---
  app.get('/api/admin/users', requireAdmin, async (_req, res) => {
    res.json(await db.listUsers());
  });

  app.post('/api/admin/users/:id/approve', requireAdmin, async (req, res) => {
    const u = await db.setUserStatus(req.params.id, 'approved');
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(u);
  });

  app.post('/api/admin/users/:id/reject', requireAdmin, async (req, res) => {
    const target = await db.getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (target.role === 'admin') return res.status(400).json({ error: 'Não é possível rejeitar um administrador.' });
    await db.deleteUser(req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const target = await db.getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (target.id === uid(req)) return res.status(400).json({ error: 'Você não pode remover a própria conta.' });
    if (target.role === 'admin' && (await db.countAdmins()) <= 1) {
      return res.status(400).json({ error: 'Não é possível remover o último administrador.' });
    }
    await db.deleteUser(req.params.id);
    res.json({ success: true });
  });

  // --- Catálogo de exercícios (proxy para a API externa no Render) ---
  // O servidor faz a chamada (evita CORS no navegador e centraliza a origem).
  app.get('/api/catalog/exercises', catalogLimiter, async (req, res) => {
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(req.query)) {
        if (typeof v === 'string' && v.length) params.set(k, v);
      }
      const url = `${EXERCISES_API}/api/exercises${params.toString() ? `?${params.toString()}` : ''}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!r.ok) return res.status(502).json({ error: 'Catálogo de exercícios indisponível no momento.' });
      const data: any = await r.json();
      // Reescreve os caminhos de imagem para URLs absolutas (pro navegador conseguir carregar)
      if (data && Array.isArray(data.data)) {
        data.data = data.data.map((it: any) => ({
          ...it,
          image_muscle: toAbsUrl(it?.image_muscle || ''),
          image_equipment: toAbsUrl(it?.image_equipment || ''),
        }));
      }
      res.json(data);
    } catch {
      res.status(502).json({ error: 'Não foi possível acessar o catálogo de exercícios (a API pode estar iniciando).' });
    }
  });

  app.get('/api/catalog/exercises/:id', catalogLimiter, async (req, res) => {
    try {
      const r = await fetch(`${EXERCISES_API}/api/exercises/${encodeURIComponent(req.params.id)}`, { signal: AbortSignal.timeout(20_000) });
      if (r.status === 404) return res.status(404).json({ error: 'Exercício não encontrado no catálogo.' });
      if (!r.ok) return res.status(502).json({ error: 'Catálogo de exercícios indisponível no momento.' });
      res.json(await r.json());
    } catch {
      res.status(502).json({ error: 'Não foi possível acessar o catálogo de exercícios.' });
    }
  });

  // Importa um exercício do catálogo externo para a biblioteca do usuário
  app.post('/api/exercises/import', catalogLimiter, async (req, res) => {
    try {
      const { id } = req.body || {};
      if (id === undefined || id === null || String(id).trim() === '') {
        return res.status(400).json({ error: 'Id do exercício é obrigatório.' });
      }
      const r = await fetch(`${EXERCISES_API}/api/exercises/${encodeURIComponent(String(id))}`, { signal: AbortSignal.timeout(20_000) });
      if (r.status === 404) return res.status(404).json({ error: 'Exercício não encontrado no catálogo.' });
      if (!r.ok) return res.status(502).json({ error: 'Catálogo de exercícios indisponível no momento.' });
      const mapped = mapCatalogToExercise(await r.json());
      if (!mapped.name_pt) return res.status(422).json({ error: 'Não foi possível ler o exercício do catálogo.' });
      const newEx = await db.addExercise(uid(req), mapped);
      res.status(201).json(newEx);
    } catch {
      res.status(502).json({ error: 'Falha ao importar do catálogo (a API pode estar iniciando).' });
    }
  });

  // Get User Profile (inclui email/role da conta)
  app.get('/api/user', async (req, res) => {
    try {
      res.json(await authPayload(currentUser(req)));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update User Profile
  app.put('/api/user', async (req, res) => {
    try {
      await db.updateUserProfile(uid(req), req.body);
      res.json(await authPayload(currentUser(req)));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get all exercises
  app.get('/api/exercises', async (req, res) => {
    try {
      res.json(await db.getExercises(uid(req)));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create exercise manually
  app.post('/api/exercises', async (req, res) => {
    try {
      const { name_pt, name_en, muscle_group, description_pt, description_en } = req.body;
      if (!name_pt || !muscle_group || !description_pt) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }
      const newEx = await db.addExercise(uid(req), {
        name_pt,
        name_en: name_en || name_pt,
        muscle_group,
        description_pt,
        description_en: description_en || description_pt
      });
      res.status(201).json(newEx);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit exercise
  app.put('/api/exercises/:id', async (req, res) => {
    try {
      const updated = await db.updateExercise(uid(req), req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Exercício não encontrado." });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete exercise
  app.delete('/api/exercises/:id', async (req, res) => {
    try {
      const success = await db.deleteExercise(uid(req), req.params.id);
      if (!success) return res.status(404).json({ error: "Exercício não encontrado." });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Import and Translate via Gemini AI API
  app.post('/api/exercises/translate-import', translateLimiter, async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || !rawText.trim()) {
        return res.status(400).json({ error: "O texto bruto para tradução e importação não pode estar vazio." });
      }
      if (rawText.length > MAX_TRANSLATE_INPUT) {
        return res.status(400).json({
          error: `Texto muito longo (${rawText.length} caracteres). O limite é ${MAX_TRANSLATE_INPUT}. Divida em partes menores.`
        });
      }

      console.log(`Processing translation for input of length: ${rawText.length}`);

      let translatedExercises: any[] = [];

      if (ai) {
        const prompt = `Analise os seguintes exercícios em inglês (em formato de planilha, lista ou CSV) e traduza todos os campos para português brasileiro, padronizando os termos de musculação usados nas academias no Brasil (ex: 'Bench Press' -> 'Supino Reto', 'Squat' -> 'Agachamento com Barra', 'Deadlift' -> 'Levantamento Terra', 'Dumbbell Curl' -> 'Rosca Alternada com Halteres', 'Lat Pulldown' -> 'Puxada Alta', etc.).
Retorne um array JSON contendo objetos estruturados para cada exercício.

Texto a analisar:
${rawText}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "Você é um treinador de fisiculturismo sênior, fisiologista e tradutor profissional de educação física no Brasil. Traduza termos técnicos para a linguagem usual brasileira de academia com excelente detalhamento de segurança.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "Array de exercícios traduzidos",
              items: {
                type: Type.OBJECT,
                properties: {
                  name_pt: { type: Type.STRING, description: "Nome tradicional traduzido e adaptado para a linguagem de musculação brasileira (Ex: 'Supino Reto', 'Agachamento Livre')" },
                  name_en: { type: Type.STRING, description: "Nome original em inglês" },
                  muscle_group: { type: Type.STRING, description: "Grupo muscular principal ou secundários em português (Ex: 'Peito, Tríceps', 'Costas, Bíceps')" },
                  description_pt: { type: Type.STRING, description: "Instruções de execução correta e segurança traduzidas detalhadamente para português do Brasil" },
                  description_en: { type: Type.STRING, description: "Instruções originais em inglês" }
                },
                required: ["name_pt", "name_en", "muscle_group", "description_pt", "description_en"]
              }
            }
          }
        });

        const textOutput = response.text;
        if (textOutput) {
          translatedExercises = JSON.parse(textOutput.trim());
        }
      } else {
        // Fallback simulation if no API Key (safety guard)
        console.warn("API Key missing, running fallback simulation");
        const lines = rawText.split('\n').filter((l: string) => l.trim().length > 0);
        translatedExercises = lines.map((line: string) => {
          const parts = line.split('|').map((p: string) => p.trim());
          const nameEn = parts[0] || "Unknown Exercise";
          const muscleEn = parts[1] || "General";
          const descEn = parts[2] || "";

          // Simple dictionary maps
          let namePt = nameEn;
          let musclePt = muscleEn;
          if (nameEn.toLowerCase().includes("bench press")) namePt = "Supino Reto";
          else if (nameEn.toLowerCase().includes("squat")) namePt = "Agachamento com Barra";
          else if (nameEn.toLowerCase().includes("deadlift")) namePt = "Levantamento Terra";
          else if (nameEn.toLowerCase().includes("bicep curl")) namePt = "Rosca Direta";
          else if (nameEn.toLowerCase().includes("overhead press")) namePt = "Desenvolvimento Militar";

          if (muscleEn.toLowerCase() === "chest") musclePt = "Peito";
          else if (muscleEn.toLowerCase() === "legs") musclePt = "Quadríceps, Glúteos";
          else if (muscleEn.toLowerCase() === "back") musclePt = "Costas";
          else if (muscleEn.toLowerCase() === "shoulders") musclePt = "Ombros";
          else if (muscleEn.toLowerCase() === "arms") musclePt = "Braços";

          return {
            name_pt: namePt,
            name_en: nameEn,
            muscle_group: musclePt,
            description_pt: `[Traduzido] Execute este exercício para fortalecer os músculos de ${musclePt}. ` + (descEn ? `Descrição: ${descEn}` : "Mantenha a postura correta e o core ativado."),
            description_en: descEn || nameEn
          };
        });
      }

      // Save to database (descarta itens sem os campos mínimos vindos da IA)
      const imported: any[] = [];
      const validExercises = translatedExercises.filter(
        (ex) => ex && typeof ex.name_pt === 'string' && ex.name_pt.trim() && typeof ex.muscle_group === 'string'
      );
      for (const ex of validExercises) {
        const newEx = await db.addExercise(uid(req), {
          name_pt: ex.name_pt,
          name_en: ex.name_en,
          muscle_group: ex.muscle_group,
          description_pt: ex.description_pt,
          description_en: ex.description_en
        });
        imported.push(newEx);
      }

      res.status(201).json({
        message: `${imported.length} exercícios importados e traduzidos com sucesso.`,
        importedCount: imported.length,
        exercises: imported
      });

    } catch (e: any) {
      console.error("Gemini Translation Error:", e);
      res.status(500).json({ error: "Falha ao traduzir e importar exercícios: " + e.message });
    }
  });

  // Get all workouts
  app.get('/api/workouts', async (req, res) => {
    try {
      res.json(await db.getWorkouts(uid(req)));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create workout
  app.post('/api/workouts', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: "Nome do treino é obrigatório." });
      const newW = await db.addWorkout(uid(req), name);
      res.status(201).json(newW);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit workout name
  app.put('/api/workouts/:id', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: "Nome do treino é obrigatório." });
      const updated = await db.updateWorkout(uid(req), req.params.id, name);
      if (!updated) return res.status(404).json({ error: "Treino não encontrado." });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete workout
  app.delete('/api/workouts/:id', async (req, res) => {
    try {
      const success = await db.deleteWorkout(uid(req), req.params.id);
      if (!success) return res.status(404).json({ error: "Treino não encontrado." });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get all workout exercises globally
  app.get('/api/workout-exercises', async (req, res) => {
    try {
      res.json(await db.getWorkoutExercises(uid(req)));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get exercises for a specific workout
  app.get('/api/workouts/:id/exercises', async (req, res) => {
    try {
      const list = await db.getWorkoutExercisesForWorkout(uid(req), req.params.id);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Add exercise to a workout
  app.post('/api/workouts/:id/exercises', async (req, res) => {
    try {
      const { exercise_id, series, repetitions, rest_time, weight } = req.body;
      if (!exercise_id) return res.status(400).json({ error: "Id do exercício é obrigatório." });

      const newWe = await db.addWorkoutExercise(uid(req), {
        workout_id: req.params.id,
        exercise_id,
        series: Number(series) || 3,
        repetitions: repetitions || "10 - 12",
        rest_time: rest_time || "01:30",
        weight: Number(weight) || 0
      });
      if (!newWe) return res.status(404).json({ error: "Treino não encontrado." });
      res.status(201).json(newWe);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit active workout exercise parameters
  app.put('/api/workout-exercises/:id', async (req, res) => {
    try {
      const updated = await db.updateWorkoutExercise(uid(req), req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Exercício do treino não encontrado." });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Remove exercise from workout
  app.delete('/api/workout-exercises/:id', async (req, res) => {
    try {
      const success = await db.deleteWorkoutExercise(uid(req), req.params.id);
      if (!success) return res.status(404).json({ error: "Exercício do treino não encontrado." });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get workout history logs
  app.get('/api/logs', async (req, res) => {
    try {
      res.json(await db.getWorkoutLogs(uid(req)));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Submit new workout log
  // Retorna também o perfil atualizado — o front NÃO recalcula stats localmente.
  app.post('/api/logs', async (req, res) => {
    try {
      const { workout_id, workout_name, duration, calories, notes, date } = req.body;
      if (!workout_name || !duration) {
        return res.status(400).json({ error: "Nome do treino e duração são obrigatórios." });
      }

      const newLog = await db.addWorkoutLog(uid(req), {
        workout_id: workout_id || "custom",
        workout_name,
        date: date || new Date().toISOString().slice(0, 10),
        duration: Number(duration),
        calories: Number(calories) || Math.round(Number(duration) * 7.5), // estimate calories if not provided
        notes: notes || ""
      });

      res.status(201).json({ log: newLog, user: await db.getUserProfile(uid(req)) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- End API Routes ---

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kinetic Backend Server running on http://localhost:${PORT}`);
  });
}

startServer();
