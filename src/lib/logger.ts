/**
 * Lightweight logger
 * Centralizes console usage so other files don't trigger no-console warnings.
 */
/* eslint-disable no-console */

export function info(message: string, ...args: unknown[]): void {
  console.log(message, ...args);
}

export function warn(message: string, ...args: unknown[]): void {
  console.warn(message, ...args);
}

export function error(message: string, ...args: unknown[]): void {
  console.error(message, ...args);
}
