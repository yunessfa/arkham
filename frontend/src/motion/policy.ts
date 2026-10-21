/** Shared limits: short, bounded staggers and no ornamental motion in workflows. */
export const motionDelay = (index: number) =>
  Math.min(Math.max(Math.floor(Number.isFinite(index) ? index : 0), 0) % 4, 3) *
  80;
export const isWorkflowRoute = (path: string) =>
  /^\/(manage|account|checkout|cart|login|orders)(\/|$)/.test(path);
export const pointerOffset = (position: number) =>
  Math.max(-5, Math.min(5, position * 10));
