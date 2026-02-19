/* ─────────────────────────────────────────────
 * Asset Module Declarations
 * ─────────────────────────────────────────────
 * Ambient type declarations for non-standard
 * asset imports handled by Vite's asset pipeline.
 * ───────────────────────────────────────────── */

declare module "*.glb" {
  const src: string;
  export default src;
}
