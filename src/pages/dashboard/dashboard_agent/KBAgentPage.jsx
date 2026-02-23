import "../../../styles/dashboard.scss";
import HeaderWorker from "../../../components/dashboard/dashboard_worker/MenuWorker";
import GetBlockInfo from "../../../components/general/GeneralBlockInfo.jsx";
import { Helmet } from "react-helmet";
import HeaderAgent from "../../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import Sidebar from "../../../components/general/DynamicMenu.jsx";
import { useState, useEffect } from "react";

export default function DashboardAgentKB() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <>
      <Helmet>
        <title>База знаний</title>
      </Helmet>
      <div className="sidebar-open">
        <div
          className={`main-content-wrapper dashboard-container ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}
        >
          <Sidebar
            activeLink="knowledge"
            isOpen={isSidebarOpen}
            toggle={toggleSidebar}
          />
          <GetBlockInfo page="worker_knowledge_base" />
        </div>
      </div>
    </>
  );
}
