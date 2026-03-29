import { Layout as AntLayout } from "antd";
import { Outlet, useLocation } from "react-router-dom";

const { Content } = AntLayout;

export const ProductLayout = () => {
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
    <div className="dashboard-container">
      <div className="applications-list product-bank-page content-page">
        <AntLayout style={{ background: "transparent", minHeight: "auto" }}>
          <Content
            style={{
              padding: "0 24px 24px",
              background: "#ffffff",
              borderRadius: 20,
              boxShadow: "0 12px 30px rgba(0,0,0,0.05)",
              overflow: "initial",
            }}
          >
            <Outlet />
          </Content>
        </AntLayout>
      </div>
    </div>
  );
};
