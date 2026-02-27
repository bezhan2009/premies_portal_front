import "../../styles/components/Menu.scss";
import LogoImageComponent from "../Logo.jsx";
import LogoutButton from "./Logout.jsx";
import RowDown from "../../assets/row_down.png";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useWebSocket } from "../../api/application/wsnotifications.js";
import ChangePasswordIcon from "../../assets/change_password.png";
import AlertMessage from "./AlertMessage.jsx";
import { fetchConversionRates } from "../../api/conversion/conversion.js";

const CURRENCY_META = {
  USD: { flag: "🇺🇸", label: "Доллар" },
  EUR: { flag: "🇪🇺", label: "Евро" },
};

function CurrencyRatesWidget() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchConversionRates(new Date());
        if (mounted) {
          setRates(data);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    rates.forEach((r) => {
      const fc = r.currencyFrom !== "TJS" ? r.currencyFrom : r.currencyTo;
      if (!CURRENCY_META[fc]) return;
      if (!g[fc]) g[fc] = { buy: null, sell: null };
      if (r.type === "from" && r.currencyFrom !== "TJS") g[fc].buy = r.amountTo;
      else if (r.type === "to" && r.currencyTo !== "TJS") g[fc].sell = r.amount;
    });
    return Object.entries(g).map(([c, v]) => ({
      currency: c,
      ...v,
      meta: CURRENCY_META[c],
    }));
  }, [rates]);

  if (loading) {
    return (
      <div className="currency-widget">
        <div className="currency-widget-title">💱 Курсы валют</div>
        <div className="currency-widget-loading">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="currency-widget">
        <div className="currency-widget-title">💱 Курсы валют</div>
        <div className="currency-widget-error">Ошибка загрузки</div>
      </div>
    );
  }

  return (
    <div className="currency-widget">
      <div className="currency-widget-title">💱 Курсы валют</div>
      <div className="currency-widget-table">
        <div className="currency-widget-header">
          <span>Валюта</span>
          <span>Покупка</span>
          <span>Продажа</span>
        </div>
        {grouped.map((row) => (
          <div key={row.currency} className="currency-widget-row">
            <span className="currency-widget-name">
              {row.meta.flag} {row.currency}
            </span>
            <span className="currency-widget-buy">
              {row.buy != null ? row.buy.toFixed(2) : "—"}
            </span>
            <span className="currency-widget-sell">
              {row.sell != null ? row.sell.toFixed(2) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ activeLink = "reports", isOpen, toggle }) {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Неизвестное имя";
  const [hasNewApplications, setHasNewApplications] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [modalError, setModalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const [roles, setRoles] = useState([]);
  const [ws, setWs] = useState(null);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  // Функция для проверки необходимости смены пароля
  const checkPasswordChangeRequired = useCallback(() => {
    const lastPasswordChange = localStorage.getItem("last_password_change");

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Проверка смены пароля в конце месяца
    if (lastPasswordChange) {
      const lastChange = new Date(lastPasswordChange);
      const lastChangeMonth = lastChange.getMonth();
      const lastChangeYear = lastChange.getFullYear();

      // Если последняя смена была в прошлом месяце или раньше
      if (
        lastChangeYear < currentYear ||
        (lastChangeYear === currentYear && lastChangeMonth < currentMonth)
      ) {
        return true;
      }
    }

    return false;
  }, []);

  // Функция для проверки дефолтного пароля
  const checkDefaultPassword = useCallback(async () => {
    const passwordCheckDone = localStorage.getItem("password_check_done");

    // Если проверка уже была выполнена, пропускаем
    if (passwordCheckDone === "true") {
      return false;
    }

    const currentYear = new Date().getFullYear();
    const defaultPassword = `Activ${currentYear}`;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/auth/sign-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            password: defaultPassword,
          }),
        },
      );

      if (response.ok) {
        // Если дефолтный пароль сработал - требуем смену
        return true;
      } else {
        // Если дефолтный пароль не сработал - помечаем проверку как выполненную
        localStorage.setItem("password_check_done", "true");
        return false;
      }
    } catch (error) {
      console.error("Ошибка при проверке дефолтного пароля:", error);
      // В случае ошибки помечаем проверку как выполненную, чтобы не блокировать работу
      localStorage.setItem("password_check_done", "true");
      return false;
    }
  }, [username]);

  // Проверка при монтировании компонента
  useEffect(() => {
    const performPasswordChecks = async () => {
      // Сначала проверяем месячную смену пароля
      const monthlyChangeRequired = checkPasswordChangeRequired();

      if (monthlyChangeRequired) {
        setForcePasswordChange(true);
        setIsModalOpen(true);
        return;
      }

      // Затем проверяем дефолтный пароль
      const defaultPasswordDetected = await checkDefaultPassword();

      if (defaultPasswordDetected) {
        setForcePasswordChange(true);
        setIsModalOpen(true);
      }
    };

    performPasswordChecks();
  }, [checkPasswordChangeRequired, checkDefaultPassword]);

  // Функция для очистки localStorage и перенаправления на логин
  const clearStorageAndRedirect = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  // Функция для получения ролей пользователя
  const fetchUserRoles = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.warn("Access token not found in localStorage");
      return [];
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/roles/user/my`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 403) {
          clearStorageAndRedirect();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rolesData = await response.json();
      const roleIds = rolesData.map((role) => role.ID);

      console.log("Получены роли пользователя:", roleIds);
      return roleIds;
    } catch (error) {
      console.error("Ошибка при получении ролей пользователя:", error);
      return [];
    }
  }, [clearStorageAndRedirect]);

  // Загрузка ролей пользователя при монтировании компонента
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const roleIds = await fetchUserRoles();

        if (roleIds.length > 0) {
          localStorage.setItem("role_ids", JSON.stringify(roleIds));
          setRoles(roleIds);
          console.log("Роли успешно загружены и сохранены:", roleIds);
        } else {
          console.log("Роли пользователя не найдены или пусты");
        }
      } catch (error) {
        console.error("Ошибка при загрузке ролей:", error);
      }
    };

    loadRoles();
  }, [fetchUserRoles]);

  // WebSocket для обновления ролей
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const wsUrl = `${
      import.meta.env.VITE_BACKEND_URL_WS
    }/listen/roles?Authorization=${encodeURIComponent(token)}`;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket for roles connected");
    };

    websocket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received roles update via WebSocket:", data);

        if (data.type === "roles_updated" || data.role_ids) {
          const freshRoleIds = await fetchUserRoles();

          if (freshRoleIds.length > 0) {
            localStorage.setItem("role_ids", JSON.stringify(freshRoleIds));
            setRoles(freshRoleIds);

            setAlert({
              show: true,
              message: "Роли пользователя были обновлены",
              type: "success",
            });
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);

      const errorMessage = error?.message || "";
      if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        console.log("Обнаружена ошибка 403 в WebSocket, очищаем хранилище...");
        clearStorageAndRedirect();
      }
    };

    websocket.onclose = (event) => {
      console.log("WebSocket for roles closed", event.code, event.reason);

      if (
        event.code === 4003 ||
        event.reason?.includes("403") ||
        event.reason?.includes("Forbidden")
      ) {
        console.log("WebSocket закрыт с кодом 403, очищаем хранилище...");
        clearStorageAndRedirect();
        return;
      }

      if (event.code !== 1000 && event.code !== 1001) {
        console.log("WebSocket connection lost. Attempting to reconnect...");
        setTimeout(() => {
          if (localStorage.getItem("access_token")) {
            const newWebsocket = new WebSocket(
              `${
                import.meta.env.VITE_BACKEND_URL_WS
              }/listen/roles?Authorization=${encodeURIComponent(
                localStorage.getItem("access_token"),
              )}`,
            );
            setWs(newWebsocket);
          }
        }, 3000);
      }
    };

    setWs(websocket);

    return () => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close(1000, "Component unmounting");
      }
    };
  }, [fetchUserRoles, clearStorageAndRedirect]);

  // Инициализация ролей из localStorage (резервный вариант)
  useEffect(() => {
    if (roles.length === 0) {
      let storedRoles = [];
      try {
        const item = localStorage.getItem("role_ids");
        if (item) {
          storedRoles = JSON.parse(item);
          if (!Array.isArray(storedRoles)) {
            storedRoles = [];
            localStorage.removeItem("role_ids");
          }
        }
      } catch (err) {
        console.error("Error parsing role_ids from localStorage:", err);
        storedRoles = [];
        localStorage.removeItem("role_ids");
      }

      if (storedRoles.length > 0) {
        setRoles(storedRoles);
        console.log("Роли загружены из localStorage:", storedRoles);
      }
    }
  }, [roles.length]);

  // WebSocket для новых заявок
  const wsUrl =
    import.meta.env.VITE_BACKEND_APPLICATION_URL_WS + "/applications/portal";
  const handleNewApplication = useCallback(
    (newApplication) => {
      console.log("Новая заявка в хедере:", newApplication);

      setHasNewApplications(true);
      if (activeLink !== "applications") {
        setAlert({
          show: true,
          message: `Новая заявка #${newApplication.ID} от ${newApplication.request_сreator}`,
          type: "info",
        });
      }
    },
    [activeLink],
  );
  useWebSocket(wsUrl, handleNewApplication, [activeLink]);

  // Базовые ссылки меню (доступны всем) и дополнительные в зависимости от ролей
  const links = useMemo(() => {
    const baseLinks = [
      { name: "База знаний", href: "/user/knowledge-base", key: "knowledge" },
    ];

    const additionalLinks = [];

    if (roles.includes(6) || roles.includes(8)) {
      additionalLinks.push(
        { name: "Тесты", href: "/worker/tests", key: "tests" },
        { name: "Моя премия", href: "/worker/premies", key: "worker_premies" },
      );
    }

    if (roles.includes(5)) {
      additionalLinks.push({
        name: "Статистика моего офиса",
        href: "/director/reports",
        key: "director",
      });
    }

    if (roles.includes(9)) {
      additionalLinks.push({
        name: "Статистика банка",
        href: "/chairman/reports",
        key: "chairman",
      });
    }

    if (roles.includes(3)) {
      additionalLinks.push({
        name: "Оператор",
        key: "operator",
        children: [
          { name: "Премии", href: "/operator/premies", key: "premi" },
          {
            name: "Отчеты",
            href: "/operator/reports",
            key: "reports_operator",
          },
          { name: "Данные", href: "/operator/data", key: "data" },
          { name: "Тесты", href: "/operator/tests", key: "tests_operator" },
          {
            name: "Управление Базой знаний",
            href: "/operator/knowledge-base",
            key: "kb_operator",
          },
        ],
      });
    }

    if (roles.includes(10)) {
      additionalLinks.push({
        name: "Заявки на карты",
        key: "application",
        children: [
          { name: "Карта", href: "/agent/card", key: "gift_card" },
          {
            name: "Заявки",
            href: "/agent/applications-list",
            key: "applications",
            hasNotification: hasNewApplications,
          },
        ],
      });
    }

    if (roles.includes(22)) {
      additionalLinks.push({
        name: "Продукты банка",
        key: "products",
        children: [
          {
            name: "Карты",
            href: "/product/cards",
            key: "product_cards",
          },
          {
            name: "Кредиты",
            href: "/product/credits",
            key: "product_credits",
          },
          {
            name: "Счета",
            href: "/product/accounts",
            key: "product_accounts",
          },
          {
            name: "Депозиты",
            href: "/product/deposits",
            key: "product_deposits",
          },
          {
            name: "Переводы",
            href: "/product/transfers",
            key: "product_transfers",
          },
        ],
      });
    }

    if (roles.includes(11)) {
      additionalLinks.push({
        name: "Заявки на кредиты",
        key: "credit",
        children: [
          { name: "Кредит", href: "/credit/card", key: "gift_credit" },
          { name: "Заявки", href: "/credit/applications-list", key: "credits" },
        ],
      });
    }

    if (roles.includes(12)) {
      additionalLinks.push({
        name: "Заявки на депозиты",
        key: "deposit",
        children: [
          { name: "Депозит", href: "/agent/dipozit/card", key: "gift_deposit" },
          {
            name: "Заявки",
            href: "/agent/dipozit/applications-list",
            key: "deposits",
          },
        ],
      });
    }

    if (roles.includes(13)) {
      additionalLinks.push({
        name: "Агент по QR-ам",
        key: "qr",
        children: [
          {
            name: "Транзакции",
            href: "/agent-qr/transactions/list",
            key: "list_qr",
          },
        ],
      });
    }

    if (roles.includes(14)) {
      additionalLinks.push({
        name: "Агент по SMS",
        key: "sms",
        children: [
          {
            name: "Отправка SMS",
            href: "/agent-sms/sms-sender",
            key: "sms_send",
          },
        ],
      });
    }

    if (roles.includes(15)) {
      additionalLinks.push({
        name: "Агент по транзакциям",
        key: "transactions",
        children: [
          {
            name: "Обновление типа транзакции",
            href: "/agent-transaction/update-transaction",
            key: "update_transaction",
          },
          {
            name: "Названия терминалов",
            href: "/agent-transaction/terminal-names",
            key: "terminal_names",
          },
        ],
      });
    }

    if (roles.includes(16)) {
      additionalLinks.push({
        name: "Агент по таможне",
        key: "customs",
        children: [
          {
            name: "Просмотр/Оплата таможни",
            href: "/agent-custom/eqms",
            key: "eqms_list",
          },
        ],
      });
    }

    if (roles.includes(17)) {
      additionalLinks.push({
        name: "Фронтовик",
        key: "frontovik",
        children: [
          {
            name: "Поиск клиентов в АБС",
            href: "/frontovik/abs-search",
            key: "abs_search",
          },
        ],
      });
    }

    if (roles.includes(18)) {
      additionalLinks.push({
        name: "Процессинг",
        key: "processing",
        children: [
          {
            name: "Лимиты",
            href: "/processing/limits",
            key: "limits",
            description: "Управление лимитами карт",
          },
          {
            name: "Транзакции",
            href: "/processing/transactions",
            key: "transactions",
            description: "Мониторинг транзакций",
          },
        ],
      });
    }

    if (roles.includes(21)) {
      additionalLinks.push({
        name: "Поиск по процессингу",
        key: "processing_search",
        children: [
          {
            name: "Поиск транзакций",
            href: "/processing-search/transactions",
            key: "transactions_search",
            description: "Мониторинг транзакций универсальный поиск",
          },
        ],
      });
    }

    if (roles.includes(19)) {
      additionalLinks.push({
        name: "Банкоматы",
        key: "atms",
        children: [
          {
            name: "Таблица банкоматов",
            href: "/atm/table",
            key: "atm_table",
            description: "Таблица ATM",
          },
        ],
      });
    }

    if (roles.includes(20)) {
      additionalLinks.push({
        name: "Выписки со счетов",
        key: "acc_operations",
        children: [
          {
            name: "Просмотр выписки со счетов",
            href: "/accounts/account-operations",
            key: "account_operations",
          },
        ],
      });
    }

    if (roles.includes(23)) {
      additionalLinks.push({
        name: "Кэшбэк",
        key: "cashbacks",
        children: [
          {
            name: "Настройки кэшбэк-ов",
            href: "/cashback/settings",
            key: "cashbacks_settings",
          },
        ],
      });
    }

    return [...baseLinks, ...additionalLinks];
  }, [roles, hasNewApplications]);

  const [openDropdowns, setOpenDropdowns] = useState({});

  useEffect(() => {
    const newOpen = {};
    links.forEach((link) => {
      if (
        link.children &&
        link.children.some((child) => child.key === activeLink)
      ) {
        newOpen[link.key] = true;
      }
    });
    setOpenDropdowns((prev) => ({
      ...prev,
      ...newOpen,
    }));
  }, [links, activeLink]);

  const toggleDropdown = (key) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const createRipple = (event) => {
    const element = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(element.clientWidth, element.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${
      event.clientX - element.getBoundingClientRect().left - radius
    }px`;
    circle.style.top = `${
      event.clientY - element.getBoundingClientRect().top - radius
    }px`;
    circle.classList.add("ripple-effect");

    const existingRipple = element.querySelector(".ripple-effect");
    if (existingRipple) {
      existingRipple.remove();
    }

    element.appendChild(circle);

    setTimeout(() => {
      circle.remove();
    }, 600);
  };

  const handleChangePassword = () => {
    setIsModalOpen(true);
    setModalError("");
    setOldPassword("");
    setNewPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData?.detail || "Походу вы ввели неправильный пароль",
        );
      }

      // Обновляем дату последней смены пароля
      localStorage.setItem("last_password_change", new Date().toISOString());
      // Помечаем проверку дефолтного пароля как выполненную
      localStorage.setItem("password_check_done", "true");

      setIsModalOpen(false);
      setForcePasswordChange(false);
      alert("Пароль успешно изменен!");
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationsClick = () => {
    setHasNewApplications(false);
    if (window.innerWidth <= 768) {
      toggle();
    }
  };

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      toggle();
    }
  };

  // Блокируем взаимодействие с sidebar, если требуется смена пароля
  const sidebarStyle = forcePasswordChange
    ? { pointerEvents: "none", opacity: 0.5 }
    : {};

  return (
    <>
      {alert.show && (
        <AlertMessage
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ ...alert, show: false })}
          duration={5000}
        />
      )}
      <aside
        className={`sidebar ${isOpen ? "open" : "collapsed"}`}
        style={sidebarStyle}
      >
        <div className="sidebar-top">
          <Link to="/" onClick={handleLinkClick}>
            <LogoImageComponent
              width={isOpen ? 75 : 53}
              height={isOpen ? 65 : 46}
            />
          </Link>
          <button
            className={`sidebar-toggle ${isOpen ? "open" : ""}`}
            onClick={toggle}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        <nav className={`nav-links ${isOpen ? "visible" : "hidden"}`}>
          {links.map((link) => {
            if (link.children) {
              const isDropdownOpen = openDropdowns[link.key] || false;
              const isActive = link.children.some(
                (child) => child.key === activeLink,
              );
              return (
                <div key={link.key} className="dropdown-wrapper">
                  <button
                    className={`dropdown-toggle ${isActive ? "active" : ""}`}
                    onClick={(e) => {
                      createRipple(e);
                      toggleDropdown(link.key);
                    }}
                  >
                    {link.name}
                    <span
                      className={`dropdown-arrow ${
                        isDropdownOpen ? "open" : ""
                      }`}
                    >
                      <img src={RowDown} alt="▼" width="16" height="10" />
                    </span>
                  </button>
                  {isDropdownOpen && (
                    <div className="sub-menu">
                      {link.children.map((child) => (
                        <Link
                          key={child.key}
                          to={child.href}
                          className={`sub-link ${
                            child.key === activeLink ? "active" : ""
                          }`}
                          onClick={(e) => {
                            createRipple(e);
                            handleLinkClick();
                          }}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={link.key}
                to={link.href}
                className={`${link.key === activeLink ? "active" : ""}`}
                onClick={(e) => {
                  createRipple(e);
                  if (link.key === "applications") {
                    handleApplicationsClick();
                  } else {
                    handleLinkClick();
                  }
                }}
              >
                {link.name}
                {link.hasNotification && (
                  <span className="notification-dot"></span>
                )}
              </Link>
            );
          })}
        </nav>
        {isOpen && <CurrencyRatesWidget />}
        <div className={`sidebar-bottom ${isOpen ? "" : "collapsed"}`}>
          <div className="username-wrapper">
            <span>
              Пользователь: <strong>{username}</strong>
            </span>
            <button
              className="change-password-btn"
              onClick={handleChangePassword}
            >
              <img
                src={ChangePasswordIcon}
                alt="Изменить пароль"
                width={27}
                height={27}
                title="Изменить пароль"
              />
            </button>
          </div>
          <LogoutButton />
        </div>
      </aside>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>
              {forcePasswordChange ? "Требуется смена пароля" : "Смена пароля"}
            </h3>
            {forcePasswordChange && (
              <p style={{ color: "#ff6b6b", marginBottom: "15px" }}>
                Вы должны сменить пароль, чтобы продолжить работу с системой.
              </p>
            )}
            <form onSubmit={handleSubmit}>
              <label>
                Старый пароль:
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </label>
              <label>
                Новый пароль:
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </label>
              {modalError && <div className="modal-error">{modalError}</div>}
              <div className="modal-buttons">
                <button type="submit" disabled={loading}>
                  {loading ? "Сохраняю..." : "Сменить пароль"}
                </button>
                {!forcePasswordChange && (
                  <button type="button" onClick={() => setIsModalOpen(false)}>
                    Отмена
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
