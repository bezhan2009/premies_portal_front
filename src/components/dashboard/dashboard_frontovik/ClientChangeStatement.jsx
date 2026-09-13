import React, { useState } from 'react';
import { Alert, Button, Space, Typography, Upload } from 'antd';
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import DynamicDocxButtons from '../../general/DynamicDocxButtons';
import { extractDocxClientData } from '../../../utils/docxTemplateHelpers';
import { uploadWorkflowAttachment, workflowError } from '../../../api/frontovikWorkflow';

export default function ClientChangeStatement({ client, scopeID, kind, changes, document, onDocument, disabled }) {
  const kindLabel = { phone: 'Телефон', inn: 'ИНН', address: 'Адрес', passport: 'Паспорт', name: 'ФИО' }[kind] || kind;
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
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
      <DynamicDocxButtons page="ClientDataChange" section="Заявление на изменение данных" triggerLabel="Заявление на изменение данных"
        data={{ ...extractDocxClientData(client), 'change.kind': kindLabel, 'change.oldPhone': changes?.old_phone || '', 'change.newPhone': changes?.new_phone || '', change: { kind, ...changes } }} />
      <Upload accept=".pdf,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={upload} disabled={disabled || busy}>
        <Button icon={<UploadOutlined />} loading={busy} disabled={disabled || busy}>Загрузить заявление</Button>
      </Upload>
    </Space>
    {document && <Typography.Text type="success"><CheckCircleOutlined /> {document.filename} — сохранено в документах клиента</Typography.Text>}
    <Typography.Text type="secondary">Приложите подписанное заявление. Изменения выполнит АБС после подтверждения другим сотрудником.</Typography.Text>
    {error && <Alert type="error" showIcon message={error} />}
  </Space>;
}
