import { execFileSync } from 'node:child_process';

function run(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueNumbers(values: string[]): number[] {
  const out = new Set<number>();
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

function pidsListeningOnPort(port: number): number[] {
  // macOS/Linux: `lsof` prints PIDs; `-t` prints only the IDs.
  const stdout = run('lsof', ['-nP', '-tiTCP:' + String(port), '-sTCP:LISTEN']);
  if (!stdout) return [];
  return uniqueNumbers(stdout.split(/\s+/g));
}

function pidsMatchingProcessPatterns(patterns: string[]): number[] {
  const ps = run('ps', ['-ax', '-o', 'pid=,command=']);
  if (!ps) return [];

  const lowerPatterns = patterns.map((p) => p.toLowerCase());

  const pids: string[] = [];
  for (const line of ps.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const firstSpace = trimmed.indexOf(' ');
    if (firstSpace <= 0) continue;

    const pidPart = trimmed.slice(0, firstSpace).trim();
    const cmdPart = trimmed.slice(firstSpace + 1).trim();
    const cmdLower = cmdPart.toLowerCase();

    if (lowerPatterns.some((p) => cmdLower.includes(p))) {
      pids.push(pidPart);
    }
  }

  return uniqueNumbers(pids);
}

async function killPids(pids: number[], signal: NodeJS.Signals): Promise<number[]> {
  if (!pids.length) return [];

  const killed: number[] = [];
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
      killed.push(pid);
    } catch {
      // ignore
    }
  }
  return killed;
}

async function main() {
  const port = Number(process.env.E2E_PORT ?? process.env.PORT ?? 3002);

  const portPids = pidsListeningOnPort(port);

  // Clean up some known lingering processes that can keep Playwright waiting.
  const patternPids = pidsMatchingProcessPatterns([
    '@playwright/test/cli.js test-server',
    'src/scripts/e2eDevServer.ts',
  ]);

  const allPids = uniqueNumbers([...portPids.map(String), ...patternPids.map(String)]);

  if (!allPids.length) {
    console.log(`E2E: no orphaned processes found (port ${port}).`);
    return;
  }

  console.log(`E2E: terminating orphaned processes (port ${port}): ${allPids.join(', ')}`);

  await killPids(allPids, 'SIGTERM');
  await sleep(500);

  // Re-check which PIDs are still around.
  const remaining: number[] = [];
  for (const pid of allPids) {
    try {
      process.kill(pid, 0);
      remaining.push(pid);
    } catch {
      // not running
    }
  }

  if (remaining.length) {
    console.log(`E2E: force-killing remaining processes: ${remaining.join(', ')}`);
    await killPids(remaining, 'SIGKILL');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
