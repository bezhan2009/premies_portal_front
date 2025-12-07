import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/NotFound.scss'
import { Helmet } from "react-helmet";

export default function PageNotFound() {
    const navigate = useNavigate();

    const handleFix = () => {
        localStorage.clear();
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

