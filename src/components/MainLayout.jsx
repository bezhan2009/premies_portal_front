import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../pages/general/DynamicMenu.jsx";
import useSidebar from "../hooks/useSideBar.js";

const MainLayout = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();

  // Extract the active link from the current path to pass to Sidebar
  // This is a bit of a heuristic, but can be improved
  const getActiveLink = (pathname) => {
    if (pathname.includes("eqms")) return "eqms_list";
    if (pathname.includes("reports")) return "reports";
    if (pathname.includes("knowledge-base")) return "knowledge";
    if (pathname.includes("tests")) return "tests";
    if (pathname.includes("cards")) return "cards";
    if (pathname.includes("credits")) return "credits";
    if (pathname.includes("premies")) return "premi";
    if (pathname.includes("abs-search")) return "abs_search";
    if (pathname.includes("account-operations")) return "account_operations";
    if (pathname.includes("limits")) return "limits";
    if (pathname.includes("transactions")) return "transactions";
    return "";
  };

  // const activeLink = getActiveLink(location.pathname);

  return (
    <div
      className={` ${
        isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
      }`}
    >
      {/* <Sidebar
        activeLink={activeLink}
        isOpen={isSidebarOpen}
        toggle={toggleSidebar}
      /> */}
      <div className="main-content-wrapper">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
