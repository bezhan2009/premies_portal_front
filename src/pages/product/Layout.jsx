import { Layout as AntLayout, Menu, Button, Space } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CreditCardOutlined,
  BankOutlined,
  WalletOutlined,
  SwapOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import active from "../../assets/product_active.png";

const { Sider, Header, Content } = AntLayout;

const menuItems = [
  { key: "cards", label: "Карты", icon: <IdcardOutlined /> },
  { key: "credits", label: "Кредиты", icon: <CreditCardOutlined /> },
  { key: "accounts", label: "Текущий счёт", icon: <WalletOutlined /> },
  { key: "deposits", label: "Депозит", icon: <BankOutlined /> },
  { key: "transfers", label: "Денежный перевод", icon: <SwapOutlined /> },
];

export const ProductLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Highlight the current menu item based on the URL
  const selectedKey = location.pathname.split("/").pop();

  return (
    <AntLayout style={{ minHeight: "100vh", background: "#f3f4f6" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={260}
        style={{
          background: "#ffffff",
          padding: "16px 12px",
          boxShadow: "4px 0 20px rgba(0,0,0,0.05)",
        }}
        theme="light"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            marginBottom: 30,
            paddingLeft: collapsed ? 0 : 10,
            cursor: "pointer",
          }}
          onClick={() => navigate("/product")}
        >
          <img
            src={active}
            alt="logo"
            style={{
              width: collapsed ? 38 : 46,
              transition: "0.3s",
            }}
          />
          {!collapsed && (
            <span
              style={{
                marginLeft: 12,
                fontSize: 18,
                fontWeight: 700,
                color: "#d60000",
                letterSpacing: 0.5,
              }}
            >
              ACTIV BANK
            </span>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{
            border: "none",
            background: "transparent",
          }}
          theme="light"
        />
      </Sider>

      <AntLayout>
        <Header
          style={{
            background: "#ffffff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 18,
                borderRadius: 8,
              }}
            />
          </Space>
        </Header>

        <Content
          style={{
            margin: 24,
            padding: 24,
            background: "#ffffff",
            borderRadius: 20,
            boxShadow: "0 12px 30px rgba(0,0,0,0.05)",
            overflow: "initial",
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
