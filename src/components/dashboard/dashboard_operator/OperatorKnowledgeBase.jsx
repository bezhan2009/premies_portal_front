import React, { useEffect, useState } from 'react';
import '../../../styles/components/BlockInfo.scss';
import '../../../styles/components/KnowledgeBase.scss';
import fileLogo from '../../../assets/file_logo.png';

const baseURL = import.meta.env.VITE_BACKEND_URL;

export default function OperatorKnowledgeBaseBlockInfo() {
    const [bases, setBases] = useState([]);
    const [selectedBaseId, setSelectedBaseId] = useState(null);
    const [baseData, setBaseData] = useState(null);
    const [showModal, setShowModal] = useState(null);
    const [modalData, setModalData] = useState(null);
    const token = localStorage.getItem('access_token');

    // Загрузить все базы
    const loadBases = () => {
        fetch(`${baseURL}/knowledge/bases`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
            .then(setBases)
            .catch(console.error);
    };
    useEffect(loadBases, []);

    // Загрузить выбранную базу
    useEffect(() => {
        if (!selectedBaseId) { setBaseData(null); return; }
        fetch(`${baseURL}/knowledge/bases/${selectedBaseId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
            .then(setBaseData)
            .catch(console.error);
    }, [selectedBaseId]);

    // Сохранить или обновить
    const handleSave = async (endpoint, payload, isFormData = false, isUpdate = false) => {
        try {
            const res = await fetch(`${baseURL}${endpoint}`, {
                method: isUpdate ? 'PATCH' : 'POST',
                headers: isFormData
                    ? { Authorization: `Bearer ${token}` }
                    : { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: isFormData ? payload : JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await res.text());
            await res.json();
            loadBases();
            if (selectedBaseId) {
                fetch(`${baseURL}/knowledge/bases/${selectedBaseId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(setBaseData);
            }
            setShowModal(null);
        } catch (e) {
            alert(`Ошибка сохранения: ${e.message}`);
        }
    };

    // Удалить
    const handleDelete = async (endpoint) => {
        if (!window.confirm('Вы уверены?')) return;
        try {
            const res = await fetch(`${baseURL}${endpoint}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error(await res.text());
            loadBases();
            setBaseData(null);
        } catch (e) {
            alert(`Ошибка удаления: ${e.message}`);
        }
    };

    return (
        <div className="knowledge-module">
            <div className="kb-sidebar">
                <h3>Базы знаний
                    <button className="kb-add-btn" onClick={() => { setModalData({ entity: 'knowledge_base' }); setShowModal('knowledge_base'); }}>+</button>
                </h3>
                <ul>
                    {bases.map(b => (
                        <li key={b.ID} className={b.ID === selectedBaseId ? 'active' : ''} onClick={() => setSelectedBaseId(b.ID)}>
                            {b.title}
                            <span className="kb-action-btn" onClick={e => { e.stopPropagation(); setModalData({ entity: 'knowledge_base', data: b }); setShowModal('knowledge_base'); }}>✏️</span>
                            <span className="kb-action-btn" onClick={e => { e.stopPropagation(); handleDelete(`/knowledge/bases/${b.ID}`); }}>🗑️</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="kb-content">
                {baseData ? (
                    <KnowledgeBaseDetail data={baseData} onAdd={(entity, data) => { setModalData({ entity, data }); setShowModal(entity); }} onDelete={handleDelete} onSave={handleSave} />
                ) : <p>Выберите базу знаний</p>}
            </div>
            {showModal && <ModalEditor data={modalData} onClose={() => setShowModal(null)} onSave={handleSave} baseId={selectedBaseId} />}
        </div>
    );
}

// Детали базы
function KnowledgeBaseDetail({ data, onAdd, onDelete }) {
    const items = Array.isArray(data.knowledge) ? data.knowledge : [];
    const [selId, setSelId] = useState(null);
    const sel = items.find(k => k.ID === selId);

    return (
        <div className="kb-detail">
            <h2>{data.title}
                <button className="kb-add-btn" onClick={() => onAdd('knowledge', { knowledge_base_id: data.ID })}>+</button>
            </h2>
            <div className="kb-items">
                {items.map(item => (
                    <div key={item.ID} className={`kb-item ${item.ID === selId ? 'active' : ''}`} onClick={() => setSelId(item.ID)}>
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                        <div className="kb-item-actions">
                            <span onClick={e => { e.stopPropagation(); onAdd('knowledge', item); }}>✏️</span>
                            <span onClick={e => { e.stopPropagation(); onDelete(`/knowledge/${item.ID}`); }}>🗑️</span>
                        </div>
                    </div>
                ))}
            </div>
            {sel && Array.isArray(sel.knowledge_docs) && (
                <div className="kb-docs">
                    <h3>Документы
                        <button className="kb-add-btn" onClick={() => onAdd('knowledge_doc', { knowledge_id: sel.ID })}>+</button>
                    </h3>
                    <KnowledgeDocsList docs={sel.knowledge_docs} onEdit={onAdd} onDelete={onDelete} />
                </div>
            )}
        </div>
    );
}

// Список документов
function KnowledgeDocsList({ docs, onEdit, onDelete }) {
    if (!Array.isArray(docs) || docs.length === 0) return <p>Документы отсутствуют</p>;
    return (
        <ul className="kb-docs-list">
            {docs.map(doc => (
                <li key={doc.ID} className="kb-doc-item">
                    <a href={`${baseURL}/${doc.file_path.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" className="doc-label">
                        <img src={doc.imgUrl || fileLogo} alt={doc.title} />
                        {doc.title}
                    </a>
                    <div className="kb-doc-actions">
                        <span onClick={() => onEdit('knowledge_doc', doc)}>✏️</span>
                        <span onClick={() => onDelete(`/knowledge/docs/${doc.ID}`)}>🗑️</span>
                    </div>
                </li>
            ))}
        </ul>
    );
}

// Модалка создания/редактирования
function ModalEditor({ data, onClose, onSave, baseId }) {
    const [form, setForm] = useState({});
    const [file, setFile] = useState(null);
    useEffect(() => { setForm(data.data || {}); }, [data]);

    const handleChange = e => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = () => {
        let endpoint = '', payload, isFormData = false, isUpdate = false;
        if (data.entity === 'knowledge_base') {
            isUpdate = !!form.ID;
            endpoint = isUpdate ? `/knowledge/bases/${form.ID}` : '/knowledge/bases';
            payload = { title: form.title };
        }
        if (data.entity === 'knowledge') {
            isUpdate = !!form.ID;
            endpoint = isUpdate ? `/knowledge/${form.ID}` : '/knowledge';
            payload = { title: form.title, description: form.description, knowledge_base_id: form.knowledge_base_id || baseId };
        }
        if (data.entity === 'knowledge_doc') {
            isUpdate = !!form.ID;
            endpoint = isUpdate ? `/knowledge/docs/${form.ID}` : '/knowledge/docs';
            payload = new FormData();
            payload.append('title', form.title);
            payload.append('knowledge_id', form.knowledge_id);
            if (file) payload.append('file', file);
            isFormData = true;
        }
        onSave(endpoint, payload, isFormData, isUpdate);
    };

    return (
        <div className="kb-modal-overlay">
            <div className="kb-modal">
                <h3>{form.ID ? 'Редактировать' : 'Создать'} {data.entity.replace('_', ' ')}</h3>
                <div className="kb-modal-content">
                    <label>Название</label>
                    <input name="title" value={form.title||''} onChange={handleChange} />
                    {data.entity === 'knowledge' && <><label>Описание</label><textarea name="description" value={form.description||''} onChange={handleChange} /></>}
                    {data.entity === 'knowledge_doc' && <><label>Файл</label><input type="file" onChange={e => setFile(e.target.files[0])} /></>}
                </div>
                <div className="kb-modal-actions">
                    <button onClick={handleSubmit}>Сохранить</button>
                    <button onClick={onClose}>Отмена</button>
                </div>
            </div>
        </div>
    );
}
