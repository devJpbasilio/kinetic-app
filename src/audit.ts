// Log de auditoria de eventos de segurança.
//
// Emite UMA linha JSON por evento no stdout — o host (Render) coleta o stdout e
// pode encaminhar para um Log Stream externo (Better Stack, Datadog, Papertrail),
// onde se criam alertas (ex.: muitos auth.login.failure, admin.user.delete).
//
// REGRA: nunca inclua segredos aqui — senhas, tokens de sessão/reset ou hashes.
// Registre apenas identificadores (userId, email, ip) e o desfecho da ação.

type AuditValue = string | number | boolean | undefined;
type AuditDetails = Record<string, AuditValue>;

export function audit(event: string, details: AuditDetails = {}): void {
  const entry: Record<string, AuditValue> = { ts: new Date().toISOString(), kind: 'audit', event };
  for (const [k, v] of Object.entries(details)) {
    if (v !== undefined) entry[k] = v;
  }
  // console.log → stdout (separado de console.error/stderr), uma linha por evento.
  console.log(JSON.stringify(entry));
}
