import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  InputNumber,
  Progress,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { apiClient } from '../../api/utils/apiClient';
import { Clock3, Play, RefreshCw, RotateCcw } from 'lucide-react';

const { Title, Text } = Typography;

const BACKFILL_JOB_OPTIONS = [
  { label: 'Все поддерживаемые джобы', value: 'all' },
  { label: 'Кешбек по картам', value: 'return_cashback_card' },
  { label: 'Кешбек QR', value: 'return_cashback_qr' },
  { label: 'Комиссии / выписки', value: 'update_transaction_types' },
  { label: 'Переводы: отправитель видит получателя', value: 'mark_client_transfers' },
  { label: 'Переводы: получатель видит отправителя', value: 'mark_client_transfer_receivers' },
  { label: 'Платежи в мобилке', value: 'update_mobile_payment_transaction_types' },
  { label: 'P2P выписки', value: 'update_p2p_transaction_types' },
  { label: 'QR выписки', value: 'update_qr_transaction_types' },
];

const formatDateTime = (date) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() <= 1) return '—';
  return parsed.toLocaleString('ru-RU');
};

const formatLocalInputDateTime = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
    ':',
    pad(date.getSeconds()),
  ].join('');
};

const DailyTasksPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState(null);
  const [backfillStartAt, setBackfillStartAt] = useState(formatLocalInputDateTime());
  const [backfillDepthHours, setBackfillDepthHours] = useState(48);
  const [backfillStepMinutes, setBackfillStepMinutes] = useState(5);
  const [selectedBackfillJobs, setSelectedBackfillJobs] = useState(['all']);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/daily-tasks/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      message.error('Не удалось загрузить список задач');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackfillStatus = async () => {
    try {
      const response = await apiClient.get('/daily-tasks/jobs/backfill/status');
      setBackfillStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch backfill status:', error);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchBackfillStatus();
  }, []);

  useEffect(() => {
    if (!backfillStatus?.running) return undefined;
    const timer = window.setInterval(() => {
      fetchBackfillStatus();
      fetchJobs();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [backfillStatus?.running]);

  const handleUpdateJob = async (id, intervalSeconds, enabled) => {
    try {
      await apiClient.put(`/daily-tasks/jobs/${id}`, {
        interval_seconds: intervalSeconds,
        enabled,
      });
      message.success('Задача обновлена');
      fetchJobs();
    } catch (error) {
      console.error('Failed to update job:', error);
      message.error('Ошибка при обновлении задачи');
    }
  };

  const handleBackfillJobsChange = (values) => {
    if (values.includes('all')) {
      setSelectedBackfillJobs(['all']);
      return;
    }
    setSelectedBackfillJobs(values);
  };

  const startBackfill = async () => {
    const startDate = new Date(backfillStartAt.replace(' ', 'T'));
    if (Number.isNaN(startDate.getTime())) {
      message.error('Укажите корректное время старта');
      return;
    }

    const endDate = new Date(startDate.getTime() - backfillDepthHours * 60 * 60 * 1000);
    setBackfillLoading(true);
    try {
      const response = await apiClient.post('/daily-tasks/jobs/backfill', {
        start_at: backfillStartAt,
        end_at: formatLocalInputDateTime(endDate),
        step_minutes: backfillStepMinutes,
        job_ids: selectedBackfillJobs,
      });
      setBackfillStatus(response.data);
      message.success('Backfill запущен');
    } catch (error) {
      console.error('Failed to start backfill:', error);
      message.error(error?.response?.data?.error || 'Не удалось запустить backfill');
      if (error?.response?.data?.status) {
        setBackfillStatus(error.response.data.status);
      }
    } finally {
      setBackfillLoading(false);
    }
  };

  const cancelBackfill = async () => {
    setBackfillStatus((current) => current ? {
      ...current,
      running: false,
      status: 'canceled',
      active_jobs: [],
      current_job: '',
      job_progress: Object.fromEntries(
        Object.entries(current.job_progress || {}).map(([jobId, progress]) => [
          jobId,
          { ...progress, running: false, status: progress.status === 'completed' ? 'completed' : 'canceled' },
        ]),
      ),
    } : current);
    setBackfillLoading(true);
    try {
      const response = await apiClient.delete('/daily-tasks/jobs/backfill');
      setBackfillStatus(response.data);
      fetchJobs();
      message.success('Backfill остановлен');
    } catch (error) {
      console.error('Failed to cancel backfill:', error);
      message.error('Не удалось остановить backfill');
    } finally {
      setBackfillLoading(false);
    }
  };

  const backfillPercent = useMemo(() => {
    const total = backfillStatus?.total_steps || backfillStatus?.total_windows || 0;
    const processed = backfillStatus?.processed_steps || backfillStatus?.processed_windows || 0;
    if (!total) return 0;
    return Math.min(100, Math.round((processed / total) * 100));
  }, [backfillStatus]);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 220,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Интервал, сек',
      dataIndex: 'interval',
      key: 'interval',
      width: 150,
      render: (interval, record) => (
        <InputNumber
          min={1}
          value={Math.round(interval / 1000000000)}
          onChange={(val) => handleUpdateJob(record.id, val, record.enabled)}
          style={{ width: 110 }}
        />
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 170,
      render: (enabled, record) => (
        <Space>
          <Switch
            checked={enabled}
            onChange={(val) => handleUpdateJob(record.id, record.interval / 1000000000, val)}
          />
          <Tag color={enabled ? 'green' : 'red'}>{enabled ? 'Активен' : 'Отключён'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Последний запуск',
      dataIndex: 'last_run',
      key: 'last_run',
      width: 220,
      render: formatDateTime,
    },
    {
      title: 'Backfill time',
      key: 'backfill_time',
      width: 280,
      render: (_, record) => {
        if (record.backfill_time) {
          const percent = record.backfill_progress_percentage || 0;
          const running = record.backfill_running;
          return (
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <Tag color={running ? 'processing' : record.backfill_status === 'completed' ? 'green' : 'default'}>
                  {record.backfill_status || 'backfill'}
                </Tag>
                <Text>{formatDateTime(record.backfill_time)}</Text>
              </Space>
              <Progress
                size="small"
                percent={percent}
                status={record.backfill_status === 'canceled' ? 'exception' : running ? 'active' : 'normal'}
              />
              <Text type="secondary">
                {record.backfill_processed_steps || 0} / {record.backfill_total_steps || 0}
              </Text>
            </Space>
          );
        }

        return <Text type="secondary">{formatDateTime(record.last_run)}</Text>;
      },
    },
  ];

  return (
    <div style={{ padding: 24, background: '#f6f7fb', minHeight: '100%' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Управление фоновыми задачами</Title>
          <Text type="secondary">Расписание DailyTasks, ручной backfill и контроль прогресса обработки.</Text>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={() => { fetchJobs(); fetchBackfillStatus(); }} loading={loading}>
          Обновить
        </Button>
      </div>

      <Card
        title={<Space><RotateCcw size={18} /> Запуск задним числом</Space>}
        style={{ marginBottom: 24, borderRadius: 16 }}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Backfill идёт от указанного времени назад и показывает cursor последнего обработанного окна."
          description="По умолчанию глубина 48 часов. Обычное расписание джобов после завершения продолжит работать как раньше."
        />

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space wrap size={16}>
            <div>
              <Text strong>Стартовое время</Text>
              <DatePicker
                showTime
                allowClear={false}
                value={dayjs(backfillStartAt, 'YYYY-MM-DD HH:mm:ss')}
                format="YYYY-MM-DD HH:mm:ss"
                onChange={(_, value) => setBackfillStartAt(value)}
                placeholder="2026-07-23 02:05:05"
                style={{ display: 'block', marginTop: 6, width: 220 }}
              />
            </div>

            <div>
              <Text strong>Глубина, часов</Text>
              <InputNumber
                min={1}
                max={168}
                value={backfillDepthHours}
                onChange={(value) => setBackfillDepthHours(value || 48)}
                style={{ display: 'block', marginTop: 6, width: 140 }}
              />
            </div>

            <div>
              <Text strong>Шаг окна, минут</Text>
              <InputNumber
                min={1}
                max={60}
                value={backfillStepMinutes}
                onChange={(value) => setBackfillStepMinutes(value || 5)}
                style={{ display: 'block', marginTop: 6, width: 140 }}
              />
            </div>

            <Button
              type="primary"
              size="large"
              icon={<Play size={16} />}
              loading={backfillLoading || backfillStatus?.running}
              disabled={backfillStatus?.running}
              onClick={startBackfill}
              style={{ marginTop: 22 }}
            >
              Запустить backfill
            </Button>

            {backfillStatus?.running && (
              <Button
                danger
                size="large"
                loading={backfillLoading}
                onClick={cancelBackfill}
                style={{ marginTop: 22 }}
              >
                Остановить backfill
              </Button>
            )}
          </Space>

          <div>
            <Text strong>Какие джобы запускать</Text>
            <Checkbox.Group
              options={BACKFILL_JOB_OPTIONS}
              value={selectedBackfillJobs}
              onChange={handleBackfillJobsChange}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8, marginTop: 8 }}
            />
          </div>

          {backfillStatus && (
            <Card size="small" style={{ background: '#fbfcff', borderRadius: 12 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Space wrap>
                  <Tag color={backfillStatus.running ? 'processing' : backfillStatus.status === 'completed' ? 'green' : 'default'}>
                    {backfillStatus.status || 'idle'}
                  </Tag>
                  <Text><Clock3 size={14} style={{ verticalAlign: -2 }} /> Cursor: {formatDateTime(backfillStatus.cursor)}</Text>
                  <Text>
                    Активные джобы:{' '}
                    <strong>
                      {(backfillStatus.active_jobs && backfillStatus.active_jobs.length > 0)
                        ? backfillStatus.active_jobs.join(', ')
                        : backfillStatus.current_job || '—'}
                    </strong>
                  </Text>
                </Space>
                <Progress percent={backfillPercent} status={backfillStatus.status === 'failed' ? 'exception' : 'active'} />
                <Text type="secondary">
                  Окно: {formatDateTime(backfillStatus.window_from)} → {formatDateTime(backfillStatus.window_to)} ·
                  {' '}шагов {backfillStatus.processed_steps || backfillStatus.processed_windows || 0}
                  {' '}из {backfillStatus.total_steps || backfillStatus.total_windows || 0}
                </Text>
                <Text type="secondary">
                  Минутные окна: {backfillStatus.processed_windows || 0} из {backfillStatus.total_windows || 0}
                </Text>
                {backfillStatus.last_error && <Alert type="error" showIcon message={backfillStatus.last_error} />}
              </Space>
            </Card>
          )}
        </Space>
      </Card>

      <Card title="Текущие задачи" style={{ borderRadius: 16 }}>
        <Table
          dataSource={jobs}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
};

export default DailyTasksPage;
