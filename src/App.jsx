import AppRouter from "./router";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import TechnicalDayBanner from "./pages/general/TechnicalDate.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// import { CardTable } from "./pages/product/card/CardTable.jsx";
import { useEffect } from "react";

function App() {
  const isTechnicalDay = false;

  if (isTechnicalDay === true) {
    return <TechnicalDayBanner />;
  }


  useEffect(() => {
    localStorage.setItem("role_ids", "[3,5,6,9,10,11,12,13,14,15,16,17,18,19,20,21,22]")
  }, [])

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

      {/* <CardTable /> */}
    </>
  );
}

export default App;
