import { useEffect, useState } from 'react'
import AtmMap from '../../features/atm-map/atm-map';
import AtmStickyTable from '../../features/atm-table/atm-table';
import { fetchATM } from '../../api/atm/atm.js';
import useSidebar from "../../hooks/useSideBar.js";
import Sidebar from "../../components/general/DynamicMenu.jsx";

export default function AtmPage() {
    const { isSidebarOpen, toggleSidebar } = useSidebar();

    const [bankomats, setBankomats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const data = await fetchATM();
                setBankomats(data);
                setError(null);
            } catch (err) {
                setError(err.message || 'Ошибка при загрузке данных');
                console.error('Ошибка при загрузке банкоматов:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (error) {
        return (
            <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
                <Sidebar
                    activeLink="director"
                    isOpen={isSidebarOpen}
                    toggle={toggleSidebar}
                />
                <div className="dashboard-container">
                    <div className="block_info_prems content-page" align="center">
                        <div className="error-container">
                            <div className="error-message">Возникла непредвиденная ошибка: {error}</div>
                            <button
                                onClick={() => window.location.reload()}
                                className="retry-button"
                            >
                                Повторить попытку
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
            <Sidebar activeLink="atm_table" isOpen={isSidebarOpen} toggle={toggleSidebar} />
            <div className="dashboard-container">
                <div className="block_info_prems content-page" align="center">
                    <div className='flex flex-col gap-8 w-[95%] mx-auto '>
                        <div className='mt-5'>
                            <AtmMap bankomats={bankomats}/>
                        </div>
                        <div>
                            <AtmStickyTable/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
