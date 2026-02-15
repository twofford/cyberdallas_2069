import { spawn } from 'node:child_process';

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const defaultE2eDatabaseUrl =
  'postgresql://postgres@localhost:5432/cyberdallas_e2e?schema=public';

type RunResult = { code: number; stdout: string; stderr: string };

function runCapture(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += String(chunk)));
    child.stderr.on('data', (chunk) => (stderr += String(chunk)));

    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

function runInherit(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return spawn(command, args, {
    env,
    stdio: 'inherit',
  });
}

function nowMs() {
  return Date.now();
}

function formatDurationMs(ms: number) {
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds}s`;
}

function parseDbName(databaseUrl: string): { dbName: string; host: string; port?: string; user?: string } {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, '');
  return {
    dbName,
    host: url.hostname,
    port: url.port || undefined,
    user: url.username || undefined,
  };
}

async function ensureDatabaseExists(env: NodeJS.ProcessEnv) {
  const startedAt = nowMs();
  const databaseUrl = requiredEnv(env, 'DATABASE_URL');
  const { dbName, host, port, user } = parseDbName(databaseUrl);

  // Best-effort: create DB if it doesn't exist. If the CLI isn't available,
  // or auth fails, we let the next Prisma step surface a helpful error.
  const args: string[] = ['--if-not-exists'];
  if (host) args.push('-h', host);
  if (port) args.push('-p', port);
  if (user) args.push('-U', user);
  args.push(dbName);

  const result = await runCapture('createdb', args, env);
  if (result.code === 0) return;

  const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (combined.includes('already exists')) return;

  // createdb may not be available in all environments; Prisma will fail later if DB is missing.
  console.warn(`E2E: createdb did not succeed (${formatDurationMs(nowMs() - startedAt)}). Continuing anyway.`);
}

async function resetAndSeed(env: NodeJS.ProcessEnv) {
  const startedAt = nowMs();
  // Reset DB to a known state and run seed (configured in package.json).
  // Using `npx --no-install` so we don't accidentally download packages each run.
  // Also skip generating Prisma client here; the repo already generates it via normal install.
  const prismaEnv: NodeJS.ProcessEnv = {
    ...env,
    PRISMA_MIGRATE_SKIP_GENERATE: '1',
  };

  console.log('E2E: resetting database (prisma migrate reset)...');
  const prisma = runInherit('npx', ['--no-install', 'prisma', 'migrate', 'reset', '--force', '--skip-generate'], prismaEnv);
  await new Promise<void>((resolve, reject) => {
    prisma.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prisma migrate reset failed (${code ?? 'unknown'})`));
    });
  });

  console.log(`E2E: database reset complete (${formatDurationMs(nowMs() - startedAt)}).`);
}

async function main() {
  const overallStartedAt = nowMs();
  const port = process.env.PORT ?? '3002';

  const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_E2E ?? defaultE2eDatabaseUrl;

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: databaseUrl,
  };

  await ensureDatabaseExists(env);
  await resetAndSeed(env);

  // Start Next dev server.
  console.log('E2E: starting Next dev server...');
  const next = runInherit('npx', ['--no-install', 'next', 'dev', '-p', String(port)], env);

  const killNext = (signal: NodeJS.Signals) => {
    try {
      next.kill(signal);
    } catch {
      // ignore
    }
  };

  process.on('SIGINT', () => killNext('SIGINT'));
  process.on('SIGTERM', () => killNext('SIGTERM'));
  process.on('exit', () => killNext('SIGTERM'));
  process.on('uncaughtException', () => killNext('SIGTERM'));
  process.on('unhandledRejection', () => killNext('SIGTERM'));

  console.log(`E2E: dev server boot sequence complete (${formatDurationMs(nowMs() - overallStartedAt)}). Waiting for Next to exit...`);

  await new Promise<void>((resolve, reject) => {
    next.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`next dev exited (${code ?? 'unknown'})`));
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
