import AppRouter from "./router";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import GiftCard from "./pages/general/GiftCard";
import MyApplications from "./pages/general/MyApplications";
import ApplicationsList from "./pages/general/ApplicationsList";

function App() {
  return <AppRouter />; 
  // return <GiftCard />; // page: "Карты"
  // return <MyApplications />; // page: "Мои заявки"
  // return <ApplicationsList />; // page: "Список заявкок"
}

export default App;
