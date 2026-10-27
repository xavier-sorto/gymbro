import { useRef, useState } from 'preact/hooks';
import { useApp } from '../AppContext';
import { BackLink } from '../components/BackLink';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { exportAndShare, importFromFile, readBackupDate, readLastFileExport, type ExportKind } from '../data/backupFileActions';
import { reportError } from '../errors';
import { formatShortDate } from '../format';
import { useLoad } from '../useLoad';

interface PendingImport {
  file: File;
  exportedAt: number | null;
}

function DataRow({ icon, title, subtitle, onClick }: { icon: IconName; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button type="button" class="data-row" onClick={onClick}>
      <span class="data-row-icon">
        <Icon name={icon} />
      </span>
      <span class="data-row-text">
        <span class="data-row-title">{title}</span>
        <span class="data-row-subtitle">{subtitle}</span>
      </span>
    </button>
  );
}

export function DataScreen() {
  const { refreshActive } = useApp();
  const lastExport = useLoad('reading the last export date', '', readLastFileExport, []);
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function runExport(kind: ExportKind) {
    setBusy(true);
    setExportError(await exportAndShare(kind));
    setBusy(false);
    lastExport.reload();
  }

  async function chooseImportFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) setPendingImport({ file, exportedAt: await readBackupDate(file) });
  }

  async function confirmImport() {
    const { file } = pendingImport!;
    setPendingImport(null);
    setBusy(true);
    const failure = await importFromFile(file);
    setImportError(failure);
    if (!failure) {
      try {
        await refreshActive();
      } catch (error) {
        reportError('refreshing after an import', error, '');
      }
      lastExport.reload();
    }
    setBusy(false);
  }

  const idle = (action: () => void) => () => {
    if (!busy) action();
  };
  const backupDate = pendingImport?.exportedAt;
  return (
    <main class="screen">
      <BackLink to="#/library" label="Library" />
      <h1 class="h1">Backup &amp; data</h1>
      {lastExport.data ? <p class="pill data-pill">Last exported {formatShortDate(lastExport.data)}</p> : null}
      {exportError && <ErrorNotice message={exportError} />}
      <DataRow icon="arrowUp" title="Export backup file" subtitle="Everything, to save or share" onClick={idle(() => runExport('backup'))} />
      <DataRow icon="table" title="Export spreadsheet" subtitle="All sets as a CSV file" onClick={idle(() => runExport('spreadsheet'))} />
      <DataRow icon="arrowDown" title="Import backup file" subtitle="Replaces all data on this phone" onClick={idle(() => fileInput.current?.click())} />
      <input ref={fileInput} type="file" accept=".json,application/json" class="visually-hidden" aria-label="Backup file" onChange={chooseImportFile} />
      {pendingImport && (
        <ConfirmSheet
          title="Import backup?"
          message={`Replace all data with this backup${backupDate ? ` from ${formatShortDate(backupDate)}` : ''}? Your current data will be lost unless backed up.`}
          confirmLabel="Replace all data"
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
      {importError && (
        <Sheet title="Couldn't import" onClose={() => setImportError(null)}>
          <p>{importError} Your data has not been changed.</p>
          <button type="button" class="primary-button" onClick={() => setImportError(null)}>
            OK
          </button>
        </Sheet>
      )}
    </main>
  );
}
