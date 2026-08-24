import { useCallback, useEffect, useRef, useState } from 'react';
import WelcomeScreen from './screens/WelcomeScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import ScanScreen from './screens/ScanScreen.jsx';
import PersonScreen from './screens/PersonScreen.jsx';
import * as api from './api.js';
import { shortDate, toPersonCards, toPersonView } from './lib/derive.js';
import { shareOrDownload, toScaledDataUrl } from './lib/photo.js';
import {
  FS_SUPPORTED,
  IN_FRAME,
  ensureWritePermission,
  getHandle,
  putHandle,
} from './lib/fileLink.js';
import { CATEGORIES, normalizeName } from '../shared/categories.js';

const USER_KEY = 'expense-scanner-user-v1';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function loadUserName() {
  try { return localStorage.getItem(USER_KEY) || ''; } catch { return ''; }
}
function persistUserName(name) {
  try { localStorage.setItem(USER_KEY, name); } catch { /* private browsing, etc. */ }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function blankForm(personName = '') {
  // subject rides along silently — see api/_lib/receipt.js.
  return { personName, date: todayISO(), category: CATEGORIES[0], amount: '', vendor: '', subject: '' };
}

export default function App() {
  // `people` is the one source of truth, always the full accumulated set the
  // server holds. Every screen derives from it, so a save can never leave a
  // screen showing a stale slice.
  const [people, setPeople] = useState(null);
  const [error, setError] = useState('');

  const [userName, setUserName] = useState(() => loadUserName());
  const [screen, setScreen] = useState(() => (loadUserName() ? 'home' : 'welcome'));
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const bootedRef = useRef(false);

  const [scanStep, setScanStep] = useState('capture');
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [scanNotice, setScanNotice] = useState('');
  const [saving, setSaving] = useState(false);

  // The link from a person's page to a real file on this computer (Chrome/
  // Edge desktop only — see src/lib/fileLink.js). Keyed by personId; none of
  // this touches the shared database, it's purely a per-device convenience.
  const [linkedName, setLinkedName] = useState('');
  const [syncState, setSyncState] = useState('idle'); // idle | saving | saved | blocked
  const [syncedAt, setSyncedAt] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [excelBusy, setExcelBusy] = useState(false);

  const scanInFlight = useRef(false);

  useEffect(() => {
    api.fetchPeople()
      .then((list) => {
        setPeople(list);
        // First load, if this device already knows who it is: jump straight
        // to that person's page instead of the staff list. Only ever once —
        // navigating back to Home afterward must stick.
        if (!bootedRef.current) {
          bootedRef.current = true;
          if (userName) {
            const mine = list.find((p) => normalizeName(p.name) === normalizeName(userName));
            if (mine) { setSelectedPersonId(mine.id); setScreen('person'); }
          }
        }
      })
      .catch((err) => {
        setPeople([]);
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function joinNow(name) {
    persistUserName(name);
    setUserName(name);
    bootedRef.current = true;
    if (people) {
      const mine = people.find((p) => normalizeName(p.name) === normalizeName(name));
      if (mine) { setSelectedPersonId(mine.id); setScreen('person'); return; }
    }
    setScreen('home');
  }

  const cards = people ? toPersonCards(people) : [];
  const selectedPersonRaw = people?.find((p) => p.id === selectedPersonId) || null;
  const selectedPerson = selectedPersonRaw ? toPersonView(selectedPersonRaw) : null;

  const allDates = (people || []).flatMap((p) => p.expenses.map((e) => e.date)).sort();
  const lastScan = allDates.length ? shortDate(allDates[allDates.length - 1]) : '—';
  const receiptCount = (people || []).reduce((sum, p) => sum + p.expenses.length, 0);

  const exportPerson = useCallback(async (personId) => {
    try {
      await shareOrDownload(await api.fetchExportFile(personId));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  /* ── Direct-file Excel linking ─────────────────────────────────────── */

  const refreshLink = useCallback(async (personId) => {
    if (!personId) { setLinkedName(''); return; }
    const handle = await getHandle(personId);
    setLinkedName(handle ? handle.name : '');
    setSyncState('idle');
    setSyncedAt('');
  }, []);

  useEffect(() => { refreshLink(selectedPersonId); }, [selectedPersonId, refreshLink]);

  const syncPerson = useCallback(async (personId, interactive) => {
    const handle = await getHandle(personId);
    if (!handle) return false;
    if (!(await ensureWritePermission(handle, interactive))) {
      setSyncState('blocked');
      setStatusMsg('הקישו פעם אחת על עדכון Excel כדי לתת שוב הרשאה לקובץ.');
      return false;
    }
    setSyncState('saving');
    try {
      const file = await api.fetchExportFile(personId);
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
      setSyncState('saved');
      setStatusMsg('');
      setSyncedAt(new Date().toLocaleTimeString().slice(0, 5));
      return true;
    } catch (err) {
      setSyncState('blocked');
      setStatusMsg('לא ניתן היה לכתוב לקובץ: ' + err.message);
      return false;
    }
  }, []);

  const linkExcel = useCallback(async (personRaw) => {
    if (!personRaw || !FS_SUPPORTED) return;
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${personRaw.name.replace(/\s+/g, '_')}_expenses.xlsx`,
        types: [{ description: 'Excel workbook', accept: { [XLSX_MIME]: ['.xlsx'] } }],
      });
      await putHandle(personRaw.id, handle);
      setLinkedName(handle.name);
      setStatusMsg('');
      await syncPerson(personRaw.id, true);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setStatusMsg(IN_FRAME
        ? 'התצוגה המקדימה חסמה את בורר הקבצים — פתחו את האפליקציה בלשונית נפרדת ולחצו שם על עדכון Excel.'
        : 'לא ניתן היה לפתוח את בורר הקבצים: ' + err.message);
    }
  }, [syncPerson]);

  const updateExcel = useCallback(async (personRaw) => {
    if (!personRaw) return;
    setExcelBusy(true);
    try {
      if (!FS_SUPPORTED) {
        setStatusMsg(IN_FRAME
          ? 'פתחו את האפליקציה בלשונית דפדפן נפרדת כדי לעדכן קובץ אחד ברציפות — כאן ניתן רק להוריד עותק.'
          : 'הדפדפן הזה יכול רק להוריד עותק. השתמשו ב-Chrome או Edge כדי לעדכן קובץ אחד ברציפות.');
        await exportPerson(personRaw.id);
        return;
      }
      const handle = await getHandle(personRaw.id);
      if (handle) await syncPerson(personRaw.id, true);
      else await linkExcel(personRaw);
    } finally {
      setExcelBusy(false);
    }
  }, [exportPerson, linkExcel, syncPerson]);

  /* ── Scan flow ──────────────────────────────────────────────────────── */

  function openScan(personName = '') {
    setScanStep('capture');
    setPhoto(null);
    setScanNotice('');
    setForm(blankForm(personName));
    scanInFlight.current = false;
    setScreen('scan');
  }

  async function handlePhotoChosen(file) {
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    setScanNotice('');
    try {
      const dataUrl = await toScaledDataUrl(file);
      setPhoto(dataUrl);
      setScanStep('processing');
      const result = await api.scanReceipt(dataUrl);
      setForm((previous) => ({
        ...previous,
        date: result.date || previous.date,
        category: result.category || previous.category,
        vendor: result.vendor || previous.vendor,
        subject: result.subject || previous.subject,
        amount: result.amount != null ? String(result.amount) : previous.amount,
      }));
      setScanStep('review');
    } catch (err) {
      setScanNotice(err.message);
      setScanStep('review');
    } finally {
      scanInFlight.current = false;
    }
  }

  async function handleSave() {
    if (saving) return;
    const amount = Number.parseFloat(form.amount);
    if (!form.personName.trim()) {
      setScanNotice('הזינו את שם מי שביצע את הרכישה.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setScanNotice('הזינו עלות גדולה מאפס.');
      return;
    }

    setSaving(true);
    setScanNotice('');
    try {
      const { personId, people: updated } = await api.saveExpense({
        personName: form.personName,
        date: form.date,
        category: form.category,
        vendor: form.vendor,
        subject: form.subject,
        amount,
      });
      setPeople(updated);
      setSelectedPersonId(personId);
      setScreen('person');

      // Every scan keeps the sheet current: a linked local file gets
      // rewritten in place; otherwise it's the usual share/download.
      const handle = await getHandle(personId);
      if (handle) await syncPerson(personId, false);
      else await exportPerson(personId);
    } catch (err) {
      setScanNotice(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(`למחוק את רשומת ${entry.categoryLabel} מתאריך ${entry.date}?`)) return;
    try {
      setPeople(await api.deleteExpense(entry.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (people === null) {
    return (
      <div className="app-shell" dir="rtl" lang="he">
        <div className="loading-screen">טוען הוצאות…</div>
      </div>
    );
  }

  const excelBtnLabel = linkedName ? 'עדכון Excel' : (FS_SUPPORTED ? 'בחירת קובץ Excel' : 'ייצוא לאקסל (.xlsx)');
  const syncLabel = syncState === 'saving' ? 'שומר…'
    : syncState === 'blocked' ? 'הקישו לחיבור מחדש'
    : (syncedAt ? `עודכן ${syncedAt}` : 'מקושר');

  return (
    <div className="app-shell" dir="rtl" lang="he">
      {error && (
        <div className="banner" role="alert" onClick={() => setError('')}>
          {error}
        </div>
      )}

      {screen === 'welcome' && <WelcomeScreen onJoin={joinNow} />}

      {screen === 'home' && (
        <HomeScreen
          userName={userName}
          people={cards}
          peopleCount={people.length}
          receiptCount={receiptCount}
          lastScan={lastScan}
          onOpenPerson={(id) => { setSelectedPersonId(id); setScreen('person'); }}
          onNewScan={() => openScan()}
        />
      )}

      {screen === 'scan' && (
        <ScanScreen
          step={scanStep}
          photo={photo}
          form={form}
          names={people.map((person) => person.name)}
          notice={scanNotice}
          saving={saving}
          onBack={() => setScreen('home')}
          onPhotoChosen={handlePhotoChosen}
          onFormChange={(field, value) => setForm((previous) => ({ ...previous, [field]: value }))}
          onSave={handleSave}
        />
      )}

      {screen === 'person' && selectedPerson && (
        <PersonScreen
          person={selectedPerson}
          excelBtnLabel={excelBtnLabel}
          excelBusy={excelBusy}
          linkedName={linkedName}
          syncLabel={syncLabel}
          statusMsg={statusMsg}
          onBack={() => setScreen('home')}
          onScanAnother={() => openScan(selectedPerson.name)}
          onUpdateExcel={() => updateExcel(selectedPersonRaw)}
          onChangeExcelFile={() => linkExcel(selectedPersonRaw)}
          onDelete={handleDelete}
        />
      )}

      {screen === 'person' && !selectedPerson && (
        <div className="loading-screen">
          האדם הזה כבר לא ברשימה.
          <button type="button" className="btn btn-ghost" onClick={() => setScreen('home')}>חזרה</button>
        </div>
      )}
    </div>
  );
}
