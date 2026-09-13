import React, { useEffect, useState } from 'react';
import { Alert, Button, Space, Typography, Upload } from 'antd';
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import DynamicDocxButtons from '../../general/DynamicDocxButtons';
import { extractDocxClientData } from '../../../utils/docxTemplateHelpers';
import { uploadWorkflowAttachment, workflowError } from '../../../api/frontovikWorkflow';
import { getEditableProfile } from '../../../api/ABS_frotavik/changeClientProfile';

export default function ClientChangeStatement({ client, scopeID, kind, changes, document, onDocument, disabled }) {
  const kindLabel = { phone: 'Телефон', inn: 'ИНН', address: 'Адрес', passport: 'Паспорт', name: 'ФИО' }[kind] || kind;
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [profile, setProfile] = useState(null), [profileError, setProfileError] = useState('');
  useEffect(() => {
    let active = true;
    setProfile(null); setProfileError('');
    getEditableProfile(client.client_code).then(value => { if (active) setProfile(value); })
      .catch(e => { if (active) setProfileError(workflowError(e)); });
    return () => { active = false; };
  }, [client.client_code]);
  const passport = profile?.passports?.find(p => p.is_default && !p.is_archival) || profile?.passports?.find(p => !p.is_archival);
  const statementData = {
    ...extractDocxClientData(client),
    ...(profile ? {
      'client.fullName': [profile.name.last_name, profile.name.first_name, profile.name.middle_name].filter(Boolean).join(' '),
      'client.clientCode': profile.client_code,
      'client.inn': profile.inn,
      'client.passportSeries': passport?.series || '',
      'client.passportNumber': passport?.number || '',
      'client.passportIssueDate': passport?.issued || '',
      'client.passportAuthority': passport?.issuer || '',
      'client.registrationAddress': profile.address?.text || '',
    } : {}),
    'change.kind': kindLabel, 'change.oldPhone': changes?.old_phone || '', 'change.newPhone': changes?.new_phone || '', change: { kind, ...changes },
  };
  const upload = async file => {
    setBusy(true); setError('');
    try {
      const receipt = await uploadWorkflowAttachment(file, { scope_id: scopeID, purpose: 'change_statement', client_code: client.client_code, inn: client.tax_code || client.inn });
      onDocument(receipt);
    } catch (e) { setError(workflowError(e)); }
    finally { setBusy(false); }
    return false;
  };
  return <Space direction="vertical" style={{ width: '100%' }}>
    <Space wrap>
      {profile ? <DynamicDocxButtons page="ClientDataChange" section="Заявление на изменение данных" triggerLabel="Заявление на изменение данных" data={statementData} />
        : <Button loading={!profileError} disabled>Заявление на изменение данных</Button>}
      <Upload accept=".pdf,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={upload} disabled={disabled || busy}>
        <Button icon={<UploadOutlined />} loading={busy} disabled={disabled || busy}>Загрузить заявление</Button>
      </Upload>
    </Space>
    {document && <Typography.Text type="success"><CheckCircleOutlined /> {document.filename} — сохранено в документах клиента</Typography.Text>}
    <Typography.Text type="secondary">Приложите подписанное заявление. Изменения выполнит АБС после подтверждения другим сотрудником.</Typography.Text>
    {error && <Alert type="error" showIcon message={error} />}
    {profileError && <Alert type="error" showIcon message={profileError} description="Не удалось получить данные для заявления. Закройте окно и откройте его снова." />}
  </Space>;
}
