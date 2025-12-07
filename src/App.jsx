import AppRouter from "./router";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import TechnicalDayBanner from "./pages/general/TechnicalDate.jsx";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
    const isTechnicalDay = false;

    if (isTechnicalDay === true) {
        return <TechnicalDayBanner />;
    }

    return (
        <>
            <AppRouter />
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored" // опционально — красивее выглядит
            />
        </>
    );
}

export default App;
