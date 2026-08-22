import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HomeScreen from './screens/HomeScreen.jsx';
import ScanScreen from './screens/ScanScreen.jsx';
import PersonScreen from './screens/PersonScreen.jsx';
import * as api from './api.js';
import { toPersonCards, toPersonView } from './lib/derive.js';
import { shareOrDownload, toScaledDataUrl } from './lib/photo.js';
import { CATEGORIES } from '../shared/categories.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function blankForm(personName = '') {
  return { personName, date: todayISO(), category: CATEGORIES[0], amount: '', vendor: '' };
}

export default function App() {
  // `people` is the one source of truth, always the full accumulated set the
  // server holds. Every screen derives from it, so a save can never leave a
  // screen showing a stale slice.
  const [people, setPeople] = useState(null);
  const [error, setError] = useState('');

  const [screen, setScreen] = useState('home');
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  const [scanStep, setScanStep] = useState('capture');
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [scanNotice, setScanNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Guards against a double-fired camera change event or a double-tapped
  // Save producing two rows for one photo.
  const scanInFlight = useRef(false);

  useEffect(() => {
    api.fetchPeople()
      .then(setPeople)
      .catch((err) => {
        setPeople([]);
        setError(err.message);
      });
  }, []);

  const cards = useMemo(() => toPersonCards(people || []), [people]);
  const selectedPerson = useMemo(() => {
    if (!people) return null;
    const index = people.findIndex((p) => p.id === selectedPersonId);
    return index === -1 ? null : toPersonView(people[index], index);
  }, [people, selectedPersonId]);

  const exportPerson = useCallback(async (personId) => {
    setExporting(true);
    try {
      await shareOrDownload(await api.fetchExportFile(personId));
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }, []);

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
        // Keep whatever the reader couldn't make out — an unreadable field
        // falls back to the form's value rather than to a guess.
        date: result.date || previous.date,
        category: result.category || previous.category,
        vendor: result.vendor || previous.vendor,
        amount: result.amount != null ? String(result.amount) : previous.amount,
      }));
      setScanStep('review');
    } catch (err) {
      // The photo is already captured — drop into the form so the receipt can
      // still be entered by hand rather than losing the scan.
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
      setScanNotice('Enter the name of the person who made this purchase.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setScanNotice('Enter a cost greater than zero.');
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
        amount,
      });
      setPeople(updated);
      setSelectedPersonId(personId);
      setScreen('person');
      // Saving is also the export: the user asked for the sheet to come back
      // updated on every scan, with no separate step.
      await exportPerson(personId);
    } catch (err) {
      setScanNotice(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Delete the ${entry.category} receipt from ${entry.date}?`)) return;
    try {
      setPeople(await api.deleteExpense(entry.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (people === null) {
    return (
      <div className="app-shell">
        <div className="loading-screen">Loading expenses…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {error && (
        <div className="banner" role="alert" onClick={() => setError('')}>
          {error}
        </div>
      )}

      {screen === 'home' && (
        <HomeScreen
          people={cards}
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
          exporting={exporting}
          onBack={() => setScreen('home')}
          onScanAnother={() => openScan(selectedPerson.name)}
          onExport={() => exportPerson(selectedPerson.id)}
          onDelete={handleDelete}
        />
      )}

      {screen === 'person' && !selectedPerson && (
        <div className="loading-screen">
          That person is no longer in the list.
          <button type="button" className="btn btn-ghost" onClick={() => setScreen('home')}>Back</button>
        </div>
      )}
    </div>
  );
}
