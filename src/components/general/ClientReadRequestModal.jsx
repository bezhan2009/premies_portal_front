import { useEffect, useState } from 'react';
import { Alert, Input, Modal, message } from 'antd';
import { apiClientABS_Frontovik } from '../../api/utils/apiClientABS_Frontovik';
import { newPhoneChangeID } from '../../api/ABS_frotavik/changeClientPhone';

export const showReadSanction = data => {
  if (data?.approval_required && /^\d{4}\.\d{6}$/.test(data.client_code || '')) window.dispatchEvent(new CustomEvent('client-read-sanction', { detail: data.client_code }));
};
export default function ClientReadRequestModal() {
  const [code, setCode] = useState(''), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [id, setID] = useState('');
  useEffect(() => { const open = e => { setCode(e.detail); setReason(''); setID(newPhoneChangeID()); }; window.addEventListener('client-read-sanction', open); return () => window.removeEventListener('client-read-sanction', open); }, []);
  const submit = async () => { setBusy(true); try { await apiClientABS_Frontovik.post('/client/read-access', { request_id: id, client_code: code, reason }); setCode(''); message.success('Заявка отправлена. Решение придёт в уведомления Activ Daily.'); } catch (e) { message.error(e.response?.data?.error || 'Заявка не отправлена'); } finally { setBusy(false); } };
  return <Modal title="Запрос санкции на просмотр" open={Boolean(code)} onCancel={() => !busy && setCode('')} onOk={submit} okText="Отправить заявку" cancelText="Отмена" confirmLoading={busy} okButtonProps={{ disabled: !reason.trim() }}>
    <Alert type="info" showIcon message={`Клиент ${code}`} description="Просмотр разрешается согласующим на ограниченное время. Доступ к другим подразделениям этой заявкой не предоставляется." />
    <Input.TextArea style={{ marginTop: 16 }} aria-label="Причина просмотра клиента" placeholder="Для чего нужен доступ к данным клиента" value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} />
  </Modal>;
}
