import { Layout as AntLayout } from "antd";
import { Outlet } from "react-router-dom";

const { Content } = AntLayout;

export const ProductLayout = () => {
  return (
    <div className="applications-list product-bank-page">
      <AntLayout style={{ background: "transparent", minHeight: "auto" }}>
        <Content
          style={{
            background: "#ffffff",
            borderRadius: 20,
            boxShadow: "0 12px 30px rgba(0,0,0,0.05)",
            overflow: "initial",
            width: "100%",
            padding: "24px",
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </div>
  );
};
