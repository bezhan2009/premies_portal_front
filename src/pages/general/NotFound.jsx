import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/NotFound.scss'
import {Helmet} from "react-helmet";


export default function PageNotFound() {
    return (
        <>
            <Helmet>
                <title>Тесты</title>
            </Helmet>

            <div className="page page--not-found">
                <div className="section__not_found">
                    <div className="item__suptitle">404</div>
                    <div className="item__title"></div>
                    <div className="item__subtitle">Зато есть много других страниц об услугах банка</div>
                    <ul className="list-inline">
                        <li><Link to="/">Главная страница</Link></li>
                    </ul>
                </div>
            </div>
        </>
    );
}
