import AppRouter from "./router";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import TechnicalDayBanner from "./pages/general/TechnicalDate.jsx";

function App() {
  const isTechnicalDay = false; 
  if (isTechnicalDay === true) {
    return <TechnicalDayBanner />;
  }

  return <AppRouter />; 
}

export default App;
