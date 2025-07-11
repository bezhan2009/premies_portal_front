import React, { useState } from 'react';
import LastModified from './LastModified';
import '../../../styles/components/Filters.scss';
import Spinner from "../../Spinner.jsx";

const Filters = ({ initialDate, modificationDesc, onChange }) => {
    const [showModal, setShowModal] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [selectedType, setSelectedType] = useState('');
    const [selectedDownloadType, setSelectedDownloadType] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const currentYear = new Date().getFullYear();

    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const [selectedDownloadMonth, setSelectedDownloadMonth] = useState('');
    const [selectedDownloadYear, setSelectedDownloadYear] = useState(currentYear);

    const monthOptions = [
        { name: 'Январь', value: 1 },
        { name: 'Февраль', value: 2 },
        { name: 'Март', value: 3 },
        { name: 'Апрель', value: 4 },
        { name: 'Май', value: 5 },
        { name: 'Июнь', value: 6 },
        { name: 'Июль', value: 7 },
        { name: 'Август', value: 8 },
        { name: 'Сентябрь', value: 9 },
        { name: 'Октябрь', value: 10 },
        { name: 'Ноябрь', value: 11 },
        { name: 'Декабрь', value: 12 },
    ];

    const uploadRoutes = {
        'Мобильный банк': `${import.meta.env.VITE_BACKEND_URL}/automation/mobile-bank`,
        'Карты': `${import.meta.env.VITE_BACKEND_URL}/automation/cards`,
        'Цены карт': `${import.meta.env.VITE_BACKEND_URL}/automation/card-prices`,
        'Коллцентр': `${import.meta.env.VITE_BACKEND_URL}/automation/call-center`,
    };

    const downloadRoutes = {
        'Выгрузить все отчёты': `${import.meta.env.VITE_BACKEND_URL}/automation/reports`,
        'Выгрузить отчёт для бухгалтерии': `${import.meta.env.VITE_BACKEND_URL}/automation/accountant`,
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedType || !file) {
            alert('Выберите тип загрузки и файл');
            return;
        }

        if (!selectedMonth || !selectedYear) {
            alert('Выберите месяц и год');
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('access_token');

            let url = uploadRoutes[selectedType];
            url += `?month=${selectedMonth}&year=${selectedYear}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.text();
                alert(`Ошибка загрузки: ${error}`);
            } else {
                alert('Файл успешно загружен!');
                setShowModal(false);
                setFile(null);
                setSelectedType('');
                setSelectedMonth('');
                setSelectedYear('');
            }
        } catch (error) {
            console.error(error);
            alert('Произошла ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    const handleReportsDownload = () => {
        setShowDownloadModal(true);
    };

    const executeDownload = async () => {
        if (!selectedDownloadType) {
            alert('Выберите тип отчёта');
            return;
        }

        if (!selectedDownloadMonth || !selectedDownloadYear) {
            alert('Выберите месяц и год');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');

            let url = downloadRoutes[selectedDownloadType];
            url += `?month=${selectedDownloadMonth}&year=${selectedDownloadYear}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                alert(`Ошибка при создании отчёта: ${error}`);
            } else {
                const blob = await response.blob();

                let filename = 'report.zip';
                if (selectedDownloadType === 'Выгрузить отчёт для бухгалтерии') {
                    filename = 'accountant-report.xlsx';
                } else {
                    const contentDisposition = response.headers.get('Content-Disposition');
                    if (contentDisposition) {
                        const match = contentDisposition.match(/filename="?([^"]+)"?/);
                        if (match?.[1]) {
                            filename = match[1];
                        }
                    }
                }

                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);

                setShowDownloadModal(false);
                setSelectedDownloadType('');
                setSelectedDownloadMonth('');
                setSelectedDownloadYear(currentYear);
            }
        } catch (error) {
            console.error(error);
            alert('Произошла ошибка при выгрузке отчёта');
        } finally {
            setLoading(false);
        }
    };

    const buttons = [
        {
            text: 'Загрузить файл',
            class: 'filters__button--green',
            onClick: () => setShowModal(true),
        },
        {
            text: 'Выгрузить отчёты',
            class: 'filters__button--green',
            onClick: handleReportsDownload,
        },
        {
            text: 'Зарегистрировать нового сотрудника',
            class: 'filters__button--green',
            onClick: () => {
                window.location.href = '/auth/register';
            },
        },
    ];

    return (
        <div className="filters">
            <div className="filters__left">
                <LastModified
                    initialDate={initialDate}
                    modificationDesc={modificationDesc}
                    onChange={onChange}
                />
            </div>
            <div className="filters__right">
                {buttons.map((btn) => (
                    <button
                        key={btn.text}
                        className={`filters__button ${btn.class}`}
                        onClick={btn.onClick}
                    >
                        {btn.text}
                    </button>
                ))}
            </div>

            {/* Upload Modal */}
            {showModal && (
                <div className="filters__modal">
                    <div className="filters__modal-content">
                        <h3>Загрузка файла</h3>

                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="">-- Выберите тип загрузки --</option>
                            {Object.keys(uploadRoutes).map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>

                        <div className="filters__date-selection">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                <option value="">-- Выберите месяц --</option>
                                {monthOptions.map((month) => (
                                    <option
                                        key={month.value}
                                        value={month.value}
                                    >
                                        {month.name}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="number"
                                placeholder="Год"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="filters__year-input"
                            />
                        </div>

                        <input
                            type="file"
                            onChange={handleFileChange}
                        />

                        <div className="filters__modal-actions">
                            <button onClick={handleUpload} disabled={loading}>
                                {loading ? 'Загрузка...' : 'Загрузить'}
                            </button>
                            <button onClick={() => setShowModal(false)} disabled={loading}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Download Modal */}
            {showDownloadModal && (
                <div className="filters__modal">
                    <div className="filters__modal-content">
                        <h3>Выгрузка отчёта</h3>

                        <select
                            value={selectedDownloadType}
                            onChange={(e) => setSelectedDownloadType(e.target.value)}
                        >
                            <option value="">-- Выберите тип отчёта --</option>
                            {Object.keys(downloadRoutes).map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>

                        <div className="filters__date-selection">
                            <select
                                value={selectedDownloadMonth}
                                onChange={(e) => setSelectedDownloadMonth(e.target.value)}
                            >
                                <option value="">-- Выберите месяц --</option>
                                {monthOptions.map((month) => (
                                    <option
                                        key={month.value}
                                        value={month.value}
                                    >
                                        {month.name}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="number"
                                placeholder="Год"
                                value={selectedDownloadYear}
                                onChange={(e) => setSelectedDownloadYear(e.target.value)}
                                className="filters__year-input"
                            />
                        </div>

                        <div className="filters__modal-actions">
                            <button onClick={executeDownload} disabled={loading}>
                                {loading ? 'Выгрузка...' : 'Выгрузить'}
                            </button>
                            <button onClick={() => setShowDownloadModal(false)} disabled={loading}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="filters__overlay">
                    <div className="filters__overlay-text">
                        <div
                            style={{
                                transform: 'scale(2)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: '100px',
                                width: 'auto',
                            }}
                        >
                            <Spinner />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Filters;
