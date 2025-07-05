import React, { useEffect, useState } from 'react';
import '../../../styles/components/BlockInfo.scss';
import '../../../styles/components/KnowledgeBase.scss';
import fileLogo from '../../../assets/file_logo.png';
import { Document, Page } from 'react-pdf';

const baseURL = import.meta.env.VITE_BACKEND_URL;

// Main wrapper
export default function GeneralKnowledgeBaseBlockInfo() {
    const [bases, setBases] = useState([]);
    const [selectedBaseId, setSelectedBaseId] = useState(null);
    const [baseData, setBaseData] = useState(null);

    // Получаем список баз
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        fetch(`${baseURL}/knowledge/bases`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
            .then(setBases)
            .catch(err => console.error('Error fetching bases:', err));
    }, []);

    // При смене выбранной базы — получаем её содержимое
    useEffect(() => {
        if (!selectedBaseId) {
            setBaseData(null);
            return;
        }
        const token = localStorage.getItem('access_token');
        fetch(`${baseURL}/knowledge/bases/${selectedBaseId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
            .then(setBaseData)
            .catch(err => console.error('Error fetching base data:', err));
    }, [selectedBaseId]);

    return (
        <div className="knowledge-module">
            <aside className="kb-sidebar">
                <h3>Базы знаний</h3>
                <ul>
                    {bases.map(b => (
                        <li
                            key={b.ID}
                            className={b.ID === selectedBaseId ? 'active' : ''}
                            onClick={() => setSelectedBaseId(b.ID)}
                        >
                            {b.title}
                        </li>
                    ))}
                </ul>
            </aside>

            <section className="kb-content">
                {baseData
                    ? <KnowledgeBaseDetail data={baseData} />
                    : <p>Выберите базу знаний</p>
                }
            </section>
        </div>
    );
}

// Детали выбранной базы
function KnowledgeBaseDetail({ data }) {
    const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(null);

    // Находим массив документов для выбранного знания
    const docs = data.knowledge.find(k => k.ID === selectedKnowledgeId)?.knowledge_docs || [];

    return (
        <div className="kb-detail">
            <h2>{data.title}</h2>
            <div className="kb-items">
                {data.knowledge.map(item => (
                    <div
                        key={item.ID}
                        className={`kb-item ${item.ID === selectedKnowledgeId ? 'active' : ''}`}
                        onClick={() => setSelectedKnowledgeId(item.ID)}
                    >
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                    </div>
                ))}
            </div>

            <div className="kb-docs-and-viewer">
                <div className="kb-docs">
                    <KnowledgeDocsList docs={docs} />
                </div>
            </div>
        </div>
    );
}

// Список документов + просмотрщик
function KnowledgeDocsList({ docs }) {
    const [selectedDocUrl, setSelectedDocUrl] = useState(null);

    if (!docs.length) {
        return <p>Документы отсутствуют</p>;
    }

    return (
        <>
            <ul className="kb-docs-list">
                {docs.map(doc => {
                    const url = `${baseURL}/${doc.file_path.replace(/\\/g, '/')}`;
                    return (
                        <li
                            key={doc.ID}
                            className="kb-doc-item"
                            onClick={() => setSelectedDocUrl(url)}
                        >
                            <img src={fileLogo} alt="" />
                            <span className="doc-label">{doc.title}</span>
                        </li>
                    );
                })}
            </ul>

            <div className="kb-pdf-viewer">
                <PdfViewer fileUrl={selectedDocUrl} />
            </div>
        </>
    );
}

// Собственно отображение PDF
function PdfViewer({ fileUrl }) {
    const [numPages, setNumPages] = useState(null);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    if (!fileUrl) {
        return <p>Выберите документ для просмотра</p>;
    }

    return (
        <div className="pdf-container">
            <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<p>Загрузка документа...</p>}
                error={<p>Не удалось загрузить документ.</p>}
            >
                {Array.from({ length: numPages }, (_, i) => (
                    <Page key={i} pageNumber={i + 1} />
                ))}
            </Document>
        </div>
    );
}
