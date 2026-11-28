/**
 * Next.js instrumentation hook: runs once per server start, before requests.
 *
 * Next compiles this file for BOTH the Node.js and the Edge runtime, so nothing
 * Node-only may be imported at module scope — the logger pulls in Prisma and
 * `node:async_hooks`, which Edge cannot bundle. The real work lives in
 * `instrumentation.node.ts`, imported lazily inside the Node branch only.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { installProcessLogging } = await import("./instrumentation.node");
    installProcessLogging();
  } catch (err) {
    // Instrumentation must never stop the server from starting.
    console.error("[observability] Could not install process logging:", err);
  }
}
