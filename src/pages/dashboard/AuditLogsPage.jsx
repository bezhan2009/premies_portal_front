import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Tag, Row, Col, DatePicker } from 'antd';
import FlexibleAntTable from '../../components/table/FlexibleAntTable';
import { apiClient } from '../../api/utils/apiClient';
import { RefreshCw, Filter, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const AuditLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [actionFilter, setActionFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [clientPhoneFilter, setClientPhoneFilter] = useState('');
    const [clientInnFilter, setClientInnFilter] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

    const fetchAuditLogs = async (page = 1, pageSize = 20) => {
        setLoading(true);
        try {
            const params = {
                size: pageSize,
                from: (page - 1) * pageSize,
            };
            if (actionFilter) params.action = actionFilter;
            if (userFilter) params.username = userFilter;
            if (clientPhoneFilter) params.client_phone = clientPhoneFilter;
            if (clientInnFilter) params.client_inn = clientInnFilter;
            if (dateRange && dateRange[0] && dateRange[1]) {
                params.startDate = dateRange[0].toISOString();
                params.endDate = dateRange[1].toISOString();
            }

            const response = await apiClient.get('/audit/logs', { params });
            setLogs(response.data.logs || []);
            setTotal(response.data.total || 0);
            setPagination({ current: page, pageSize });
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs(1, pagination.pageSize);
    }, [actionFilter, userFilter, clientPhoneFilter, clientInnFilter, dateRange]);

    const handleTableChange = (newPagination) => {
        fetchAuditLogs(newPagination.current, newPagination.pageSize);
    };

    const columns = [
        {
            title: 'Время',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text) => new Date(text).toLocaleString(),
            width: 170,
        },
        {
            title: 'Пользователь (Фронтовик)',
            dataIndex: 'username',
            key: 'username',
            render: (username) => <Tag color="blue">{username}</Tag>,
            width: 180,
        },
        {
            title: 'Действие',
            dataIndex: 'action',
            key: 'action',
            render: (action) => {
                let color = 'orange';
                if (action.includes('Поиск')) color = 'cyan';
                if (action.includes('Блокировка')) color = 'red';
                if (action.includes('Разблокировка')) color = 'green';
                if (action.includes('Сброс')) color = 'gold';
                if (action.includes('Смена PIN')) color = 'geekblue';
                if (action.includes('Скачивание')) color = 'purple';
                if (action.includes('Погашение')) color = 'success';
                return <Tag color={color}>{action}</Tag>;
            },
            width: 220,
        },
        {
            title: 'Данные клиента',
            key: 'client',
            render: (_, record) => (
                <div style={{ fontSize: '13px' }}>
                    {record.client_name && <div><b>ФИО:</b> {record.client_name}</div>}
                    {record.client_phone && <div><b>Тел:</b> {record.client_phone}</div>}
                    {record.client_inn && <div><b>ИНН:</b> {record.client_inn}</div>}
                    {!record.client_name && !record.client_phone && !record.client_inn && <span style={{ color: '#bfbfbf' }}>-</span>}
                </div>
            ),
            width: 280,
        },
        {
            title: 'Связанные объекты',
            key: 'objects',
            render: (_, record) => (
                <div style={{ fontSize: '13px' }}>
                    {record.card_number && <div><b>Карта:</b> <span style={{ fontFamily: 'monospace' }}>{record.card_number}</span></div>}
                    {record.account_number && <div><b>Счет:</b> <span style={{ fontFamily: 'monospace' }}>{record.account_number}</span></div>}
                    {record.credit_id && <div><b>Кредит ID:</b> <span style={{ fontFamily: 'monospace' }}>{record.credit_id}</span></div>}
                    {record.deposit_id && <div><b>Депозит ID:</b> <span style={{ fontFamily: 'monospace' }}>{record.deposit_id}</span></div>}
                    {!record.card_number && !record.account_number && !record.credit_id && !record.deposit_id && <span style={{ color: '#bfbfbf' }}>-</span>}
                </div>
            ),
            width: 280,
        },
        {
            title: 'Подробности',
            dataIndex: 'details',
            key: 'details',
            render: (text) => (
                <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    fontSize: '13px',
                    color: 'var(--text-color)',
                    background: 'rgba(0,0,0,0.02)',
                    padding: '6px 8px',
                    borderRadius: '4px'
                }}>
                    {text}
                </div>
            ),
        },
    ];

    const resetFilters = () => {
        setActionFilter('');
        setUserFilter('');
        setClientPhoneFilter('');
        setClientInnFilter('');
        setDateRange(null);
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const params = {
                size: 10000,
                from: 0,
            };
            if (actionFilter) params.action = actionFilter;
            if (userFilter) params.username = userFilter;
            if (clientPhoneFilter) params.client_phone = clientPhoneFilter;
            if (clientInnFilter) params.client_inn = clientInnFilter;
            if (dateRange && dateRange[0] && dateRange[1]) {
                params.startDate = dateRange[0].toISOString();
                params.endDate = dateRange[1].toISOString();
            }

            const response = await apiClient.get('/audit/logs', { params });
            const dataToExport = response.data.logs || [];

            if (dataToExport.length === 0) {
                return;
            }

            const exportData = dataToExport.map(log => ({
                'Время': new Date(log.timestamp).toLocaleString(),
                'Пользователь': log.username,
                'Действие': log.action,
                'ФИО клиента': log.client_name || '-',
                'Телефон клиента': log.client_phone || '-',
                'ИНН клиента': log.client_inn || '-',
                'Номер карты': log.card_number || '-',
                'Номер счета': log.account_number || '-',
                'Кредит ID': log.credit_id || '-',
                'Депозит ID': log.deposit_id || '-',
                'Подробности': log.details || '-'
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Журнал действий");
            
            // Auto width columns
            const colWidths = Object.keys(exportData[0]).map(key => ({
                wch: Math.max(key.length, ...exportData.map(row => String(row[key] || '').length)) + 2
            }));
            worksheet['!cols'] = colWidths;

            XLSX.writeFile(workbook, `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (error) {
            console.error('Failed to export audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2}>Журнал действий фронтовиков (ElasticSearch)</Title>
                <Space>
                    <Button icon={<Download size={16} />} onClick={handleExport} loading={loading} type="primary">
                        Экспорт в Excel
                    </Button>
                    <Button icon={<RefreshCw size={16} />} onClick={() => fetchAuditLogs(pagination.current, pagination.pageSize)} loading={loading}>
                        Обновить
                    </Button>
                </Space>
            </div>

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card title="Фильтры">
                        <Space wrap size={[16, 16]}>
                            <Space>
                                <Filter size={16} />
                                <span>Действие:</span>
                                <Input 
                                    placeholder="Например, Блокировка" 
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    style={{ width: 180 }}
                                    allowClear
                                />
                            </Space>
                            <Space>
                                <span>Фронтовик:</span>
                                <Input 
                                    placeholder="Имя пользователя" 
                                    value={userFilter}
                                    onChange={(e) => setUserFilter(e.target.value)}
                                    style={{ width: 150 }}
                                    allowClear
                                />
                            </Space>
                            <Space>
                                <span>Тел. клиента:</span>
                                <Input 
                                    placeholder="992XXXXXXXXX" 
                                    value={clientPhoneFilter}
                                    onChange={(e) => setClientPhoneFilter(e.target.value)}
                                    style={{ width: 150 }}
                                    allowClear
                                />
                            </Space>
                            <Space>
                                <span>ИНН клиента:</span>
                                <Input 
                                    placeholder="ИНН" 
                                    value={clientInnFilter}
                                    onChange={(e) => setClientInnFilter(e.target.value)}
                                    style={{ width: 150 }}
                                    allowClear
                                />
                            </Space>
                            <Space>
                                <span>Период:</span>
                                <RangePicker 
                                    showTime 
                                    value={dateRange} 
                                    onChange={setDateRange} 
                                    placeholder={['Начало', 'Конец']}
                                />
                            </Space>
                            {(actionFilter || userFilter || clientPhoneFilter || clientInnFilter || dateRange) && (
                                <Button type="link" onClick={resetFilters}>
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
                            pagination={{
                                current: pagination.current,
                                pageSize: pagination.pageSize,
                                total: total,
                                showSizeChanger: true,
                                showTotal: (total) => `Всего записей: ${total}`
                            }}
                            onChange={handleTableChange}
                            rowKey={(record, index) => record.timestamp + record.username + index}
                        />
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default AuditLogsPage;
