// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { exportBackup, listExercises, openStore } from '../../src/store';
import { fireEvent, renderApp, screen, waitFor } from './helpers';

async function openDataScreen() {
  await openStore();
  window.location.hash = '#/library/data';
  renderApp();
  await screen.findByText('Backup & data');
}

function chooseFile(file: File) {
  const input = screen.getByLabelText('Backup file') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

describe('Backup & data screen', () => {
  it('exports a backup through the share sheet and shows the last export date', async () => {
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share });
    await openDataScreen();
    expect(screen.queryByText(/Last exported/)).toBeNull();
    fireEvent.click(screen.getByText('Export backup file'));
    await screen.findByText(/Last exported/);
    const [{ files }] = share.mock.calls[0] as unknown as [{ files: File[] }];
    expect(files[0]?.name).toMatch(/^gymbro-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('exports the spreadsheet as a CSV', async () => {
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share });
    await openDataScreen();
    fireEvent.click(screen.getByText('Export spreadsheet'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const [{ files }] = share.mock.calls[0] as unknown as [{ files: File[] }];
    expect(files[0]?.name).toMatch(/\.csv$/);
  });

  it('shows "Couldn\'t export. Try again." when sharing and downloading both fail', async () => {
    vi.stubGlobal('navigator', { canShare: () => true, share: async () => Promise.reject(new Error('boom')) });
    URL.createObjectURL = vi.fn(() => {
      throw new Error('no blob urls');
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await openDataScreen();
    fireEvent.click(screen.getByText('Export backup file'));
    expect(await screen.findByText("Couldn't export. Try again.")).toBeTruthy();
  });

  it('confirms with the backup date, then replaces the data', async () => {
    await openStore();
    const backup = await exportBackup();
    const exercisesBefore = (await listExercises()).length;
    await openDataScreen();
    chooseFile(backup);
    expect(await screen.findByText(/Replace all data with this backup from .+\? Your current data will be lost unless backed up\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Replace all data' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await listExercises()).length).toBe(exercisesBefore);
  });

  it('cancelling the confirmation changes nothing', async () => {
    await openStore();
    const backup = await exportBackup();
    await openDataScreen();
    chooseFile(backup);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('explains a file that is not a backup and leaves the data unchanged', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await openStore();
    const exercisesBefore = (await listExercises()).length;
    await openDataScreen();
    chooseFile(new File(['not json'], 'notes.json', { type: 'application/json' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Replace all data' }));
    expect(await screen.findByText(/This isn't a GymBro backup file\. Your data has not been changed\./)).toBeTruthy();
    expect((await listExercises()).length).toBe(exercisesBefore);
  });
});
