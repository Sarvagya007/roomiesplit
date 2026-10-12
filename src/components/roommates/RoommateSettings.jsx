import { useRef, useState } from 'react';
import { Download, Upload, Trash2, DatabaseBackup, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import ConfirmationDialog from '../common/ConfirmationDialog.jsx';
import RoommateFields, { toDraft } from './RoommateFields.jsx';
import { validateRoommateNames, expensesToCSV } from '../../utils/finance.js';
import { exportData, parseImport } from '../../utils/storage.js';

function download(filename, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Settings: roommates, backups (JSON export/import, CSV), reset, and the local-storage limitation note. */
export default function RoommateSettings({ data, onSaveRoommates, onImport, onReset, onNotify, onClose }) {
  const [draft, setDraft] = useState(() => toDraft(data.roommates));
  const [showErr, setShowErr] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetText, setResetText] = useState('');
  const fileRef = useRef(null);
  const error = validateRoommateNames(data.roommates.map((r) => draft[r.id].name));

  const save = () => {
    if (error) return setShowErr(true);
    onSaveRoommates(Object.fromEntries(Object.entries(draft).map(([id, d]) => [id, { ...d, name: d.name.trim() }])));
    onClose();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = parseImport(await file.text());
    if (!res.ok) return onNotify(`Import failed: ${res.error}`, 'error');
    setPendingImport(res.data);
  };

  return (
    <>
      <Modal title="Settings" onClose={onClose} wide>
        <section aria-labelledby="set-room">
          <h3 id="set-room" className="mb-2 font-display text-lg font-bold">Roommates</h3>
          <RoommateFields roommates={data.roommates} draft={draft} onChange={setDraft} />
          <p className="err" role="alert">{showErr && error}</p>
          <p className="mt-2 text-xs text-muted">Renaming is safe. Expenses are linked by a hidden stable ID, not by name.</p>
          <button type="button" className="btn-primary mt-3" onClick={save}>Save roommates</button>
        </section>

        <section className="mt-6 border-t border-line pt-5" aria-labelledby="set-data">
          <h3 id="set-data" className="mb-2 font-display text-lg font-bold">Your data</h3>
          <p className="mb-3 flex gap-2 rounded-2xl bg-sun-soft p-3 text-xs font-semibold text-sun">
            <ShieldAlert size={16} className="shrink-0" />
            Data lives only in this browser (localStorage). It doesn&apos;t sync to other devices or browsers, and clearing site data erases it. Please export a backup regularly.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" className="btn-ghost" onClick={() => { download('roomiesplit-backup.json', exportData(data), 'application/json'); onNotify('Backup downloaded.'); }}>
              <Download size={16} /> Export backup
            </button>
            <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Import backup
            </button>
            <button type="button" className="btn-ghost" disabled={!data.expenses.length}
              onClick={() => download('roomiesplit-expenses.csv', expensesToCSV(data.expenses, data.roommates), 'text/csv;charset=utf-8')}>
              <FileSpreadsheet size={16} /> Export CSV
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a backup file to import" tabIndex={-1} onChange={onFile} />
          <p className="mt-2 flex items-center gap-1 text-xs text-muted"><DatabaseBackup size={12} /> {data.expenses.length} expenses · {data.settlements.length} repayments stored</p>
        </section>

        <section className="mt-6 border-t border-line pt-5" aria-labelledby="set-danger">
          <h3 id="set-danger" className="mb-2 font-display text-lg font-bold text-neg">Danger zone</h3>
          <button type="button" className="btn-ghost !text-neg" onClick={() => setConfirmReset(true)}>
            <Trash2 size={16} /> Reset all data
          </button>
        </section>
      </Modal>

      {pendingImport && (
        <ConfirmationDialog title="Replace current data?" tone="danger" confirmLabel="Replace with backup"
          onCancel={() => setPendingImport(null)}
          onConfirm={() => { onImport(pendingImport); setPendingImport(null); onClose(); }}>
          <p>This backup contains <b>{pendingImport.expenses.length}</b> expenses and <b>{pendingImport.settlements.length}</b> repayments for {pendingImport.roommates.map((r) => r.name).join(', ')}.</p>
          <p className="font-semibold text-neg">Everything currently in this browser will be overwritten. Export a backup first if you&apos;re unsure.</p>
        </ConfirmationDialog>
      )}

      {confirmReset && (
        <ConfirmationDialog title="Erase everything?" tone="danger" confirmLabel="Erase all data"
          confirmDisabled={resetText !== 'RESET'}
          onCancel={() => { setConfirmReset(false); setResetText(''); }}
          onConfirm={() => { onReset(); onClose(); }}>
          <p>All roommates, expenses and repayments will be permanently deleted from this browser.</p>
          <label htmlFor="reset-confirm" className="label">Type RESET to confirm</label>
          <input id="reset-confirm" data-autofocus className="input" value={resetText} onChange={(e) => setResetText(e.target.value)} autoComplete="off" />
        </ConfirmationDialog>
      )}
    </>
  );
}
