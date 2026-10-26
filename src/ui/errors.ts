import { StorageFullError, ValidationError } from '../store';

/** Records a failure in the console and returns the message to show the owner. */
export function reportError(what: string, error: unknown, fallbackMessage: string): string {
  console.error(`GymBro: ${what}`, error);
  if (error instanceof StorageFullError) return error.message;
  if (error instanceof ValidationError) return `${error.field}: ${error.reason}`;
  return fallbackMessage;
}
