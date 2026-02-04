import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.scss';
import AtmStickyTable from './features/atm-table/atm-table';
import { BrowserRouter } from 'react-router-dom';


ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <AtmStickyTable />
    </BrowserRouter>
);
