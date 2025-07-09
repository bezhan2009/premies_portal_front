import React from 'react';
import '../../styles/components/KnowledgeBase.scss';

const KnowledgeBase = ({ title, items }) => {
    const half = Math.ceil(items.length / 2);
    const leftColumn = items.slice(0, half);
    const rightColumn = items.slice(half);

    return (
        <div className="knowledge-base-card">
            <div className="card-title">{title}</div>
            <div className="card-content">
                {items.map((item, index) => (
                    <div key={index} className="card-item">
                        <span className="item-label">{item.label}</span>
                        {item.value && (
                            <span className="item-value red-circle">{item.value}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KnowledgeBase;
