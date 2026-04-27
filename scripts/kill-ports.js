/**
 * Kill processes listening on specific ports (Windows).
 * Run before `bun run dev` to prevent "address already in use" errors.
 */
const ports = [3000, 3001];

for (const port of ports) {
  try {
    const out = new TextDecoder().decode(
      Bun.spawnSync([
        "powershell",
        "-Command",
        `netstat -ano | Select-String -Pattern ":${port}\\s"`,
      ]).stdout,
    );

    for (const line of out.split("\n")) {
      const parts = line.trim().split(/\s+/);
      const pid = parts.at(-1);
      if (pid && /^\d+$/.test(pid)) {
        try {
          Bun.spawnSync(["taskkill", "/PID", pid, "/F"]);
          console.log(`[kill-ports] Killed PID ${pid} on port ${port}`);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* no process on this port */
  }
}
