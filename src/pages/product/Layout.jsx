import { Layout as AntLayout } from "antd";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../../components/general/DynamicMenu.jsx";
import useSidebar from "../../hooks/useSideBar.js";

const { Content } = AntLayout;

export const ProductLayout = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();

  // Highlight the current menu item based on the URL
  const getActiveLink = (pathname) => {
    if (pathname.includes("cards")) return "product_cards";
    if (pathname.includes("credits")) return "product_credits";
    if (pathname.includes("accounts")) return "product_accounts";
    if (pathname.includes("deposits")) return "product_deposits";
    if (pathname.includes("transfers")) return "product_transfers";
    return "products";
  };

  const activeLink = getActiveLink(location.pathname);

  return (
    <div
      className={`dashboard-container ${
        isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
      }`}
    >
      <Sidebar
        activeLink={activeLink}
        isOpen={isSidebarOpen}
        toggle={toggleSidebar}
      />
      <div className="applications-list product-bank-page content-page">
        <AntLayout style={{ background: "transparent", minHeight: "auto" }}>
          <Content
            style={{
              // padding: "0 24px 24px",
              background: "#ffffff",
              borderRadius: 20,
              boxShadow: "0 12px 30px rgba(0,0,0,0.05)",
              overflow: "initial",
              // marginTop: 20,
            }}
          >
            <Outlet />
          </Content>
        </AntLayout>
      </div>
    </div>
  );
};
