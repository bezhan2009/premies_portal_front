import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Switch, InputNumber, Space, Typography, Tag, message, Modal } from 'antd';
import { apiClient } from '../../api/utils/apiClient';
import { RefreshCw, Play, Settings } from 'lucide-react';

const { Title } = Typography;

const DailyTasksPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

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

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleUpdateJob = async (id, intervalSeconds, enabled) => {
        try {
            await apiClient.put(`/daily-tasks/jobs/${id}`, {
                interval_seconds: intervalSeconds,
                enabled: enabled
            });
            message.success('Задача обновлена');
            fetchJobs();
        } catch (error) {
            console.error('Failed to update job:', error);
            message.error('Ошибка при обновлении задачи');
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: 'Название',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: 'Интервал (сек)',
            dataIndex: 'interval',
            key: 'interval',
            render: (interval, record) => (
                <InputNumber 
                    min={1} 
                    value={interval / 1000000000} // Go duration is in nanoseconds
                    onChange={(val) => handleUpdateJob(record.id, val, record.enabled)}
                    style={{ width: 100 }}
                />
            ),
        },
        {
            title: 'Статус',
            dataIndex: 'enabled',
            key: 'enabled',
            render: (enabled, record) => (
                <Space>
                    <Switch 
                        checked={enabled} 
                        onChange={(val) => handleUpdateJob(record.id, record.interval / 1000000000, val)} 
                    />
                    <Tag color={enabled ? 'green' : 'red'}>
                        {enabled ? 'Активен' : 'Отключен'}
                    </Tag>
                </Space>
            ),
        },
        {
            title: 'Последний запуск',
            dataIndex: 'last_run',
            key: 'last_run',
            render: (date) => date && date !== '0001-01-01T00:00:00Z' ? new Date(date).toLocaleString() : 'Никогда',
        },
        {
            title: 'Действия',
            key: 'actions',
            render: (_, record) => (
                <Button 
                    icon={<Play size={14} />} 
                    type="primary" 
                    size="small"
                    onClick={() => message.info('Функция немедленного запуска в разработке')}
                >
                    Запустить
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2}>Управление фоновыми задачами (DailyTasks)</Title>
                <Button icon={<RefreshCw size={16} />} onClick={fetchJobs} loading={loading}>
                    Обновить
                </Button>
            </div>

            <Card>
                <Table 
                    dataSource={jobs} 
                    columns={columns} 
                    loading={loading}
                    rowKey="id"
                    pagination={false}
                />
            </Card>

            <div style={{ marginTop: '24px' }}>
                <Card title="Справка" size="small">
                    <Typography.Text type="secondary">
                        Здесь вы можете настраивать частоту выполнения фоновых задач. 
                        Интервал указывается в секундах. Изменения применяются мгновенно без перезагрузки сервиса.
                    </Typography.Text>
                </Card>
            </div>
        </div>
    );
};

export default DailyTasksPage;
