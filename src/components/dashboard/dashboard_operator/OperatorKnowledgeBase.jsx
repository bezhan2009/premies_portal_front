import React, { useEffect, useState } from 'react';
import '../../../styles/components/BlockInfo.scss';
import KnowledgeBase from '../../knowledge_base/KnowledgeBase.jsx';
import RenderPage from '../../RenderPage.jsx';
import { get_knowledge_base_data } from '../../../api/knowledge_base.js';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const OperatorKnowledgeBaseBlockInfo = () => {
    const [blocks, setBlocks] = useState(null);

    useEffect(() => {
        async function fetchData() {
            const data = await get_knowledge_base_data();
            setBlocks(data);
        }
        fetchData();
    }, []);

    if (!blocks) {
        return <Skeleton height={120} />;
    }

    return (
        <div className='block_info_prems' align='center'>
            <RenderPage pageKey=''>
                {blocks.map((block, index) => (
                    <KnowledgeBase
                        key={index}
                        title={block.title}
                        items={block.items}
                    />
                ))}
            </RenderPage>
        </div>
    );
};

export default OperatorKnowledgeBaseBlockInfo;
