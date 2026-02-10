import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/NotFound.scss'
import { Helmet } from "react-helmet";

// Функция для сохранения важных ключей перед очисткой
const preserveImportantKeys = () => {
    const keysToPreserve = ['last_password_change', 'password_check_done'];
    const preserved = {};

    keysToPreserve.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            preserved[key] = value;
        }
    });

    return preserved;
};

// Функция для восстановления важных ключей после очистки
const restoreImportantKeys = (preserved) => {
    Object.keys(preserved).forEach(key => {
        localStorage.setItem(key, preserved[key]);
    });
};

export default function PageNotFound() {
    const navigate = useNavigate();

    const handleFix = () => {
        // Сохраняем важные ключи перед очисткой
        const preserved = preserveImportantKeys();

        localStorage.clear();

        // Восстанавливаем важные ключи
        restoreImportantKeys(preserved);

        navigate('/');
    };

    return (
        <>
            <Helmet>
                <title>Страница не найдена</title>
            </Helmet>

            <div className="page page--not-found">
                <div className="section__not_found">
                    <div className="item__suptitle">404</div>
                    <div className="item__title"></div>
                    <div className="item__subtitle">Зато есть много других страниц об услугах портала Activ Daily</div>
                    <ul className="list-inline">
                        <li><Link to="/">Главная страница</Link></li>
                        <li>
                            <button
                                onClick={handleFix}
                                style={{
                                    marginTop: "15px",
                                    background: "#e74c3c",
                                    border: "none",
                                    padding: "10px 20px",
                                    color: "#fff",
                                    cursor: "pointer",
                                    borderRadius: "6px",
                                    fontSize: "14px"
                                }}
                            >
                                Исправить (очистить данные)
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </>
    );
}
