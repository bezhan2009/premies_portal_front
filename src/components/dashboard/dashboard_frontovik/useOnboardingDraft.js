import { useCallback, useEffect, useRef, useState } from 'react';
import { Form } from 'antd';
import { deleteClientDraft, listClientDrafts, saveClientDraft, workflowError } from '../../../api/frontovikWorkflow';
import { newPhoneChangeID } from '../../../api/ABS_frotavik/changeClientPhone';

export default function useOnboardingDraft(open, form, locked) {
  const [drafts, setDrafts] = useState([]), [id, setID] = useState(newPhoneChangeID), [passport, setPassport] = useState(null), [review, setReview] = useState(null);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false), [savedAt, setSavedAt] = useState(null);
  const values = Form.useWatch([], form) || {};
  const state = useRef({ id, revision: 0, last: '', completed: false });
  const latest = useRef({}); latest.current = { values, passport, review };
  const queue = useRef(Promise.resolve());
  const opened = useRef(false);
  const refresh = useCallback(async () => { const rows = await listClientDrafts(); setDrafts(rows); }, []);
  useEffect(() => {
    if (!open) { opened.current = false; return; }
    if (opened.current) return; opened.current = true;
    const nextID = newPhoneChangeID(); state.current = { id: nextID, revision: 0, last: '', completed: false };
    setID(nextID); setPassport(null); setReview(null); setSavedAt(null); setError('');
    refresh().catch(e => setError(workflowError(e)));
  }, [open, refresh]);
  const persist = useCallback(async () => {
    const snapshot = latest.current; const target = state.current;
    if (target.completed || !['first_name', 'last_name', 'inn', 'phone'].some(key => snapshot.values?.[key])) return;
    const json = JSON.stringify(snapshot);
    const save = async () => {
      if (target.last === json || target.completed) return;
      setSaving(true);
      try {
        const saved = await saveClientDraft(target.id, target.revision, snapshot);
        target.revision = saved.revision; target.last = json;
        if (state.current === target) { setSavedAt(saved.updated_at); setError(''); }
        await refresh();
      } catch (e) { if (state.current === target) setError(workflowError(e)); throw e; }
      finally { setSaving(false); }
    };
    const result = queue.current.catch(() => {}).then(save); queue.current = result;
    return result;
  }, [refresh]);
  const contentKey = JSON.stringify({ values, passport, review });
  useEffect(() => {
    if (!open || locked) return;
    const timer = setTimeout(() => { void persist().catch(() => {}); }, 700);
    return () => clearTimeout(timer);
  }, [open, locked, contentKey, persist]);
  const restore = async chosenID => {
    await persist();
    const chosen = drafts.find(d => d.id === chosenID); if (!chosen) return;
    state.current = { id: chosen.id, revision: chosen.revision, last: JSON.stringify(chosen.payload), completed: false };
    setID(chosen.id); setPassport(chosen.payload.passport || null); setReview(chosen.payload.review || null);
    setSavedAt(chosen.updated_at); setError(''); form.resetFields(); form.setFieldsValue(chosen.payload.values || {});
  };
  const startNew = async () => {
    await persist(); const nextID = newPhoneChangeID();
    state.current = { id: nextID, revision: 0, last: '', completed: false }; setID(nextID); setPassport(null); setReview(null); setSavedAt(null); setError(''); form.resetFields();
  };
  const finish = async () => {
    await queue.current.catch(() => {}); state.current.completed = true;
    await deleteClientDraft(state.current.id); await refresh();
  };
  return { id, passport, setPassport, review, setReview, drafts, restore, startNew, persist, finish, error, saving, savedAt };
}
