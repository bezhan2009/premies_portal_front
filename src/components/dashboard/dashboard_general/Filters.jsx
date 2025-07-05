import React, { useState } from 'react';
import LastModified from './LastModified';
import '../../../styles/components/Filters.scss';
import Spinner from "../../Spinner.jsx";

const Filters = ({ initialDate, modificationDesc, onChange }) => {
    const [showModal, setShowModal] = useState(false);
    const [selectedType, setSelectedType] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const uploadRoutes = {
        'Мобильный банк': `${import.meta.env.VITE_BACKEND_URL}/automation/mobile-bank`,
        'Карты': `${import.meta.env.VITE_BACKEND_URL}/automation/cards`,
        'Цены карт': `${import.meta.env.VITE_BACKEND_URL}/automation/card-prices`,
        'Коллцентр': `${import.meta.env.VITE_BACKEND_URL}/automation/call-center`,
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedType || !file) {
            alert('Выберите тип загрузки и файл');
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('access_token');

            const response = await fetch(uploadRoutes[selectedType], {
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
            }
        } catch (error) {
            console.error(error);
            alert('Произошла ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    const handleReportsDownload = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/automation/reports`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                alert(`Ошибка при создании отчётов: ${error}`);
            } else {
                const blob = await response.blob();

                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = 'report.zip';

                if (contentDisposition) {
                    const match = contentDisposition.match(/filename="?([^"]+)"?/);
                    if (match?.[1]) {
                        filename = match[1];
                    }
                }

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error(error);
            alert('Произошла ошибка при создании отчётов');
        } finally {
            setLoading(false);
        }
    };

    const buttons = [
        { text: 'Загрузить файл', class: 'filters__button--green', onClick: () => setShowModal(true) },
        { text: 'Выгрузить отчёты', class: 'filters__button--green', onClick: handleReportsDownload },
    ];

    return (
        <div className="filters">
            <div className="filters__left">
                <LastModified initialDate={initialDate} modificationDesc={modificationDesc} onChange={onChange} />
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
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        <input
                            type="file"
                            onChange={handleFileChange}
                        />

                        <div className="filters__modal-actions">
                            <button
                                onClick={handleUpload}
                                disabled={loading}
                            >
                                {loading ? 'Загрузка...' : 'Загрузить'}
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={loading}
                            >
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
                                width: 'auto'
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
