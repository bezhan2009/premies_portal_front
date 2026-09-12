import { useCallback, useEffect, useRef, useState } from 'react';
import { Form } from 'antd';
import { creationCapabilities, checkNewClientIdentity, submitClientCreation, getClientCreation, retryClientCreation } from '../../../api/ABS_frotavik/createClient';
import { newPhoneChangeID, normalizeClientPhone } from '../../../api/ABS_frotavik/changeClientPhone';
export function creationPayload(v) {
  const address = {
    ...v.address,
    country_code: v.country
  };
  return {
    department: v.department,
    service_group: v.service_group,
    codeword: v.codeword,
    first_name: v.first_name,
    last_name: v.last_name,
    middle_name: v.middle_name || '',
    birth_date: v.birth_date,
    sex: v.sex,
    inn: String(v.inn).trim(),
    phone: normalizeClientPhone(v.phone),
    is_resident: v.is_resident,
    country: v.country,
    latin_first_name: v.latin_first_name,
    latin_middle_name: v.latin_middle_name || '',
    latin_last_name: v.latin_last_name,
    passport: {
      ...v.passport,
      series: v.passport?.series || ''
    },
    address,
    kopf: v.kopf,
    sector: v.sector,
    tariff: v.tariff,
    questionnaire: Object.fromEntries(['client_occupation', 'monthly_income', 'total_outgoing_transactions_amount', 'total_outgoing_transactions_count', 'total_cash_transactions_amount', 'total_cash_transactions_count', 'fatca', 'apl_pzl'].map(k => [k, v[k]]))
  };
}
export function useClientCreation(open, form) {
  const [enabled, setEnabled] = useState(false),
    [job, setJob] = useState(null),
    [pending, setPending] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [checks, setChecks] = useState({});
  const values = Form.useWatch([], form) || {};
  const mounted = useRef(true);
  const generations = useRef({});
  const pendingRef = useRef(null);
  const submittingRef = useRef(false);
  const storageKey = `frontovik-client-creation:${localStorage.getItem('user_id') || 'session'}`;
  const savePending = useCallback(p => {
    pendingRef.current = p;
    setPending(p);
    sessionStorage.setItem(storageKey, JSON.stringify(p));
  }, [storageKey]);
  const accept = useCallback(r => {
    if (!mounted.current) return;
    setJob(r);
    setError('');
    if (['completed', 'failed'].includes(r.status)) sessionStorage.removeItem(storageKey);
  }, [storageKey]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    let active = true;
    creationCapabilities().then(r => {
      if (active) setEnabled(r.enabled);
    }).catch(() => {
      if (active) setEnabled(false);
    });
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(storageKey));
    } catch {/* invalid draft */}
    if (saved) {
      savePending(saved);
      getClientCreation(saved.request_id).then(accept).catch(e => {
        if (active) setError(e.response?.status === 404 ? 'Приём запроса не подтверждён. Повторите отправку с тем же номером.' : 'Не удалось загрузить состояние создания');
      });
    } else {
      pendingRef.current = null;
      setPending(null);
      setJob(null);
      setError('');
    }
    return () => {
      active = false;
    };
  }, [open, storageKey, savePending, accept]);
  const check = async (kind, value) => {
    const normalized = kind === 'phone' ? normalizeClientPhone(value) : String(value || '').trim();
    const valid = kind === 'phone' ? Boolean(normalized) : /^\d{9,14}$/.test(normalized);
    const gen = (generations.current[kind] || 0) + 1;
    generations.current[kind] = gen;
    if (!valid) {
      setChecks(c => ({
        ...c,
        [kind]: {
          value: normalized,
          state: 'invalid'
        }
      }));
      return;
    }
    setChecks(c => ({
      ...c,
      [kind]: {
        value: normalized,
        state: 'loading'
      }
    }));
    try {
      const r = await checkNewClientIdentity(kind, normalized);
      if (mounted.current && generations.current[kind] === gen) setChecks(c => ({
        ...c,
        [kind]: {
          value: normalized,
          state: r.unique ? 'unique' : 'duplicate',
          codes: r.client_codes
        }
      }));
    } catch {
      if (mounted.current && generations.current[kind] === gen) setChecks(c => ({
        ...c,
        [kind]: {
          value: normalized,
          state: 'error'
        }
      }));
    }
  };
  useEffect(() => {
    if (!open || !enabled || pending) return;
    generations.current.inn = (generations.current.inn || 0) + 1;
    const t = setTimeout(() => check('inn', values.inn), 500);
    return () => clearTimeout(t);
  }, [open, enabled, values.inn, pending]);
  useEffect(() => {
    if (!open || !enabled || pending) return;
    generations.current.phone = (generations.current.phone || 0) + 1;
    const t = setTimeout(() => check('phone', values.phone), 500);
    return () => clearTimeout(t);
  }, [open, enabled, values.phone, pending]);
  useEffect(() => {
    if (!open || !pending || ['completed', 'failed', 'partial'].includes(job?.status)) return;
    let active = true;
    const t = setTimeout(async () => {
      try {
        const r = await getClientCreation(pending.request_id);
        if (active) accept(r);
      } catch (e) {
        if (active) {
          setError(e.response?.status === 404 ? 'Приём запроса не подтверждён. Повторите отправку с тем же номером.' : 'Связь прервана. Проверяем состояние операции');
          setJob(j => ({
            ...j,
            checkedAt: Date.now()
          }));
        }
      }
    }, 2500);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [open, pending, job, accept]);
  const submit = async v => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError('');
    const p = pendingRef.current || {
      request_id: newPhoneChangeID(),
      data: creationPayload(v)
    };
    savePending(p);
    try {
      const r = await submitClientCreation(p);
      if (r.requires_compliance) {
        sessionStorage.removeItem(storageKey);
        pendingRef.current = null;
        setPending(null);
        return r;
      }
      accept(r);
      return r;
    } catch (e) {
      setError(e.response?.data?.error || 'Связь прервана. Проверяем приём запроса');
      return null;
    } finally {
      submittingRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const retry = async () => {
    setBusy(true);
    try {
      accept(await retryClientCreation(pending.request_id));
    } catch (e) {
      setError(e.response?.data?.error || 'Не удалось продолжить операцию');
    } finally {
      setBusy(false);
    }
  };
  const dismiss = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    pendingRef.current = null;
    setPending(null);
    setJob(null);
    setError('');
    setBusy(false);
  }, [storageKey]);
  const unique = ['inn', 'phone'].every(k => checks[k]?.state === 'unique' && checks[k].value === (k === 'phone' ? normalizeClientPhone(values[k]) : String(values[k] || '').trim()));
  return {
    enabled,
    job,
    pending,
    error,
    busy,
    checks,
    unique,
    check,
    submit,
    retry,
    dismiss,
    locked: Boolean(pending),
    running: Boolean(pending && !['completed', 'failed', 'partial'].includes(job?.status))
  };
}
