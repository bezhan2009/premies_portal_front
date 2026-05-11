import React, { useState, useEffect, useMemo } from 'react';
import { Card, Select, Button, Space, Typography, Tag, Row, Col } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import FlexibleAntTable from '../../components/table/FlexibleAntTable';
import { apiClient } from '../../api/utils/apiClient';
import { RefreshCw, Filter } from 'lucide-react';

const { Title } = Typography;
const { Option } = Select;

const LogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [levelFilter, setLevelFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = {};
            if (levelFilter) params.level = levelFilter;
            if (serviceFilter) params.service = serviceFilter;
            
            const [logsRes, statsRes] = await Promise.all([
                apiClient.get('/logs', { params }),
                apiClient.get('/logs/stats')
            ]);

            setLogs(logsRes.data.logs || []);
            
            // Format stats for Recharts
            const chartData = Object.entries(statsRes.data).map(([key, value]) => ({
                name: key,
                count: value,
            }));
            setStats(chartData);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [levelFilter, serviceFilter]);

    const columns = [
        {
            title: 'Время',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text) => new Date(text).toLocaleString(),
            sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
        },
        {
            title: 'Уровень',
            dataIndex: 'level',
            key: 'level',
            render: (level) => {
                let color = 'blue';
                if (level === 'ERROR') color = 'red';
                if (level === 'WARN') color = 'orange';
                if (level === 'DEBUG') color = 'gray';
                return <Tag color={color}>{level}</Tag>;
            },
            filters: [
                { text: 'INFO', value: 'INFO' },
                { text: 'ERROR', value: 'ERROR' },
                { text: 'WARN', value: 'WARN' },
                { text: 'DEBUG', value: 'DEBUG' },
            ],
            onFilter: (value, record) => record.level === value,
        },
        {
            title: 'Сервис',
            dataIndex: 'service',
            key: 'service',
            render: (service) => <Tag color="purple">{service}</Tag>,
        },
        {
            title: 'Сообщение',
            dataIndex: 'message',
            key: 'message',
            render: (text) => (
                <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: 'var(--text-color)',
                    background: 'rgba(0,0,0,0.02)',
                    padding: '8px',
                    borderRadius: '4px'
                }}>
                    {text}
                </div>
            ),
        },
    ];

    const COLORS = {
        INFO: '#1890ff',
        ERROR: '#f5222d',
        WARN: '#faad14',
        DEBUG: '#8c8c8c'
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2}>Логи системы (ElasticSearch)</Title>
                <Button icon={<RefreshCw size={16} />} onClick={fetchLogs} loading={loading}>
                    Обновить
                </Button>
            </div>

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card title="Фильтры">
                        <Space wrap>
                            <Space>
                                <Filter size={16} />
                                <span>Уровень:</span>
                                <Select 
                                    style={{ width: 120 }} 
                                    placeholder="Все" 
                                    allowClear 
                                    value={levelFilter}
                                    onChange={setLevelFilter}
                                >
                                    <Option value="INFO">INFO</Option>
                                    <Option value="ERROR">ERROR</Option>
                                    <Option value="WARN">WARN</Option>
                                    <Option value="DEBUG">DEBUG</Option>
                                </Select>
                            </Space>
                            <Space>
                                <span>Сервис:</span>
                                <Select 
                                    style={{ width: 150 }} 
                                    placeholder="Все" 
                                    allowClear 
                                    value={serviceFilter}
                                    onChange={setServiceFilter}
                                >
                                    <Option value="premies_portal">premies_portal</Option>
                                    <Option value="daily_tasks">daily_tasks</Option>
                                </Select>
                            </Space>
                            {(levelFilter || serviceFilter) && (
                                <Button type="link" onClick={() => { setLevelFilter(''); setServiceFilter(''); }}>
                                    Сбросить
                                </Button>
                            )}
                        </Space>
                    </Card>
                    <div style={{ marginTop: '16px' }}>
                        <FlexibleAntTable
                            dataSource={logs}
                            columns={columns}
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            rowKey={(record, index) => record.timestamp + record.message + index}
                        />
                    </div>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col span={24}>
                    <Card title="Статистика логов" style={{ minHeight: '400px' }}>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="count" onClick={(data) => setLevelFilter(data.name)}>
                                    {stats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: '12px', marginTop: '8px' }}>
                            Кликните на столбец для фильтрации по уровню
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default LogsPage;
