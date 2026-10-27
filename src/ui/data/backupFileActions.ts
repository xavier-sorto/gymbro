import { ImportError, exportBackup, exportSetsCsv, importBackup } from '../../store';
import { getMeta } from '../../store/meta';
import { reportError } from '../errors';
import { shareOrDownload } from './shareFile';

export const EXPORT_FAILED_MESSAGE = "Couldn't export. Try again.";
export const IMPORT_FAILED_MESSAGE = "Couldn't import this file.";

export type ExportKind = 'backup' | 'spreadsheet';

/** Builds the file and shares or downloads it. Returns an error message to show, or null. */
export async function exportAndShare(kind: ExportKind): Promise<string | null> {
  try {
    await shareOrDownload(await (kind === 'backup' ? exportBackup() : exportSetsCsv()));
    return null;
  } catch (error) {
    return reportError(`exporting the ${kind}`, error, EXPORT_FAILED_MESSAGE);
  }
}

/** When the backup file was made, or null when the file doesn't say (importing it still checks the file). */
export async function readBackupDate(file: Blob): Promise<number | null> {
  try {
    const exportedAt = (JSON.parse(await file.text()) as { exportedAt?: unknown } | null)?.exportedAt;
    return typeof exportedAt === 'number' ? exportedAt : null;
  } catch (error) {
    console.error('GymBro: could not read the backup date; importBackup will report the problem', error);
    return null;
  }
}

/** Replaces all data with the file. Returns an error message to show, or null on success. */
export async function importFromFile(file: Blob): Promise<string | null> {
  try {
    await importBackup(file);
    return null;
  } catch (error) {
    const message = reportError('importing a backup', error, IMPORT_FAILED_MESSAGE);
    return error instanceof ImportError ? error.message : message;
  }
}

export async function readLastFileExport(): Promise<number | null> {
  return (await getMeta<number | null>('lastFileExportAt')) ?? null;
}
