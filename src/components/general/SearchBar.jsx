import React, { useState } from 'react';
import '../../styles/components/SearchBar.scss';
import {flattenObjectToString} from "../../pkg/utils/search_utils.jsx";


const SearchBar = ({ allData, onSearch }) => {
    const [input, setInput] = useState('');

    const handleClick = () => {
        const query = input.trim().toLowerCase();

        if (!query) {
            onSearch(null); // Пустой поиск
            return;
        }

        const filtered = allData.filter(item => {
            const text = flattenObjectToString(item);
            return text.includes(query);
        });

        onSearch(filtered);
    };

    return (
        <div className="search-bar">
            <input
                type="text"
                placeholder="Поиск по всем полям..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
            <button onClick={handleClick}>Поиск</button>
        </div>
    );
};

export default SearchBar;
