import React, { useState } from 'react';
import '../../../styles/components/ClientSelectorModal.scss';

const ClientSelectorModal = ({
                                 clients,
                                 selectedIndex,
                                 onSelect,
                                 onClose,
                                 title = "Выберите клиента",
                                 description = "Найдено несколько клиентов. Выберите нужного:"
                             }) => {
    const [currentIndex, setCurrentIndex] = useState(selectedIndex);

    const handleSelect = () => {
        onSelect(currentIndex);
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % clients.length);
    };

    const handlePrev = () => {
        setCurrentIndex(prev => (prev - 1 + clients.length) % clients.length);
    };

    const currentClient = clients[currentIndex];

    return (
        <div className="client-selector-modal-overlay">
            <div className="client-selector-modal">
                <div className="client-selector-modal__header">
                    <h3 className="client-selector-modal__title">{title}</h3>
                    <button
                        className="client-selector-modal__close-btn"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="client-selector-modal__body">
                    <p className="client-selector-modal__description">
                        {description}
                    </p>

                    <div className="client-selector-modal__navigation">
                        <button
                            onClick={handlePrev}
                            disabled={clients.length <= 1}
                            className="client-selector-modal__nav-btn client-selector-modal__nav-btn--prev"
                        >
                            ← Предыдущий
                        </button>

                        <div className="client-selector-modal__counter">
                            Клиент {currentIndex + 1} из {clients.length}
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={clients.length <= 1}
                            className="client-selector-modal__nav-btn client-selector-modal__nav-btn--next"
                        >
                            Следующий →
                        </button>
                    </div>

                    <div className="client-selector-modal__client-info">
                        <div className="client-info__field">
                            <span className="client-info__label">ФИО:</span>
                            <span className="client-info__value">
                                {currentClient.surname} {currentClient.name} {currentClient.patronymic}
                            </span>
                        </div>
                        <div className="client-info__field">
                            <span className="client-info__label">ИНН:</span>
                            <span className="client-info__value">{currentClient.tax_code}</span>
                        </div>
                        <div className="client-info__field">
                            <span className="client-info__label">Код клиента:</span>
                            <span className="client-info__value">{currentClient.client_code}</span>
                        </div>
                        <div className="client-info__field">
                            <span className="client-info__label">Документ:</span>
                            <span className="client-info__value">
                                {currentClient.identdoc_name} {currentClient.identdoc_series} {currentClient.identdoc_num}
                            </span>
                        </div>
                    </div>

                    <select
                        value={currentIndex}
                        onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                        className="client-selector-modal__select"
                    >
                        {clients.map((client, index) => (
                            <option key={index} value={index}>
                                {index + 1}. {client.surname} {client.name} {client.patronymic}
                                {client.tax_code && ` (ИНН: ${client.tax_code})`}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="client-selector-modal__footer">
                    <button
                        onClick={onClose}
                        className="client-selector-modal__btn client-selector-modal__btn--cancel"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSelect}
                        className="client-selector-modal__btn client-selector-modal__btn--select"
                    >
                        Выбрать этого клиента
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientSelectorModal;
