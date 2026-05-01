import "../../styles/components/Menu.scss";
import LogoImageComponent from "../Logo.jsx";
import LogoutButton from "./Logout.jsx";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useWebSocket } from "../../api/application/wsnotifications.js";
import { FaChevronDown, FaEye, FaEyeSlash } from "react-icons/fa";
import { MdPassword } from "react-icons/md";
import AlertMessage from "./AlertMessage.jsx";
import Spinner from "../Spinner.jsx";
import {
    Settings,
    BookOpen,
    GraduationCap,
    Award,
    BarChart2,
    PieChart,
    UserCog,
    Trophy,
    FileText,
    Database,
    CheckSquare,
    Settings2,
    CreditCard,
    PlusCircle,
    ListChecks,
    Briefcase,
    DollarSign,
    Wallet,
    PiggyBank,
    ArrowLeftRight,
    Landmark,
    Coins,
    ClipboardList,
    Banknote,
    Vault,
    History,
    QrCode,
    Activity,
    Receipt,
    Monitor,
    List,
    Sliders,
    MessageSquare,
    Send,
    Zap,
    RefreshCw,
    Type,
    Ship,
    Anchor,
    Users,
    Search,
    Cpu,
    ShieldAlert,
    Repeat,
    ZoomIn,
    Folder,
    Layers,
    HardDrive,
    Table,
    FileSpreadsheet,
    Eye,
    Gift,
    Wrench
} from "lucide-react";
import SettingsModal from "./SettingsModal.jsx";

export default function Sidebar({ activeLink = "reports", isOpen, toggle }) {
    const navigate = useNavigate();
    const username = localStorage.getItem("username") || "Неизвестное имя";
    const [hasNewApplications, setHasNewApplications] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
            { name: "База знаний", href: "/user/knowledge-base", key: "knowledge", icon: BookOpen },
        ];

        const additionalLinks = [];

        if (roles.includes(6) || roles.includes(8)) {
            additionalLinks.push(
                { name: "Тесты", href: "/worker/tests", key: "tests", icon: GraduationCap },
                { name: "Моя премия", href: "/worker/premies", key: "worker_premies", icon: Award },
            );
        }

        if (roles.includes(5)) {
            additionalLinks.push({
                name: "Статистика моего офиса",
                href: "/director/reports",
                key: "director",
                icon: BarChart2
            });
        }

        if (roles.includes(9)) {
            additionalLinks.push({
                name: "Статистика банка",
                href: "/chairman/reports",
                key: "chairman",
                icon: PieChart
            });
        }

        if (roles.includes(3)) {
            additionalLinks.push({
                name: "Оператор",
                key: "operator",
                icon: UserCog,
                children: [
                    { name: "Премии", href: "/operator/premies", key: "premi", icon: Trophy },
                    {
                        name: "Отчеты",
                        href: "/operator/reports",
                        key: "reports_operator",
                        icon: FileText
                    },
                    { name: "Данные", href: "/operator/data", key: "data", icon: Database },
                    { name: "Тесты", href: "/operator/tests", key: "tests_operator", icon: CheckSquare },
                    {
                        name: "Управление Базой знаний",
                        href: "/operator/knowledge-base",
                        key: "kb_operator",
                        icon: Settings2
                    },
                ],
            });
        }

        if (roles.includes(10)) {
            additionalLinks.push({
                name: "Заявки на карты",
                key: "application",
                icon: CreditCard,
                children: [
                    { name: "Карта", href: "/agent/card", key: "gift_card", icon: PlusCircle },
                    {
                        name: "Заявки",
                        href: "/agent/applications-list",
                        key: "applications",
                        icon: ListChecks,
                        hasNotification: hasNewApplications,
                    },
                ],
            });
        }

        if (roles.includes(22)) {
            additionalLinks.push({
                name: "Продукты банка",
                key: "products",
                icon: Briefcase,
                children: [
                    {
                        name: "Карты",
                        href: "/product/cards",
                        key: "product_cards",
                        icon: CreditCard
                    },
                    {
                        name: "Кредиты",
                        href: "/product/credits",
                        key: "product_credits",
                        icon: DollarSign
                    },
                    {
                        name: "Счета",
                        href: "/product/accounts",
                        key: "product_accounts",
                        icon: Wallet
                    },
                    {
                        name: "Депозиты",
                        href: "/product/deposits",
                        key: "product_deposits",
                        icon: PiggyBank
                    },
                    {
                        name: "Переводы",
                        href: "/product/transfers",
                        key: "product_transfers",
                        icon: ArrowLeftRight
                    },
                ],
            });
        }

        if (roles.includes(11)) {
            additionalLinks.push({
                name: "Заявки на кредиты",
                key: "credit",
                icon: Landmark,
                children: [
                    { name: "Кредит", href: "/credit/card", key: "gift_credit", icon: Coins },
                    { name: "Заявки", href: "/credit/applications-list", key: "credits", icon: ClipboardList },
                ],
            });
        }

        if (roles.includes(12)) {
            additionalLinks.push({
                name: "Заявки на депозиты",
                key: "deposit",
                icon: Banknote,
                children: [
                    { name: "Депозит", href: "/agent/dipozit/card", key: "gift_deposit", icon: Vault },
                    {
                        name: "Заявки",
                        href: "/agent/dipozit/applications-list",
                        key: "deposits",
                        icon: History
                    },
                ],
            });
        }

        if (roles.includes(13)) {
            additionalLinks.push({
                name: "Агент по QR-ам",
                key: "qr",
                icon: QrCode,
                children: [
                    {
                        name: "Транзакции",
                        href: "/agent-qr/transactions/list",
                        key: "list_qr",
                        icon: Activity
                    },
                    {
                        name: "QR другого банка выписки",
                        href: "/accounts-qr/operations",
                        key: "qr_another_bank_transactions",
                        icon: Receipt
                    },
                    {
                        name: "QR другого банка настройки",
                        href: "/accounts-qr/settings",
                        key: "qr_another_bank_settings",
                        icon: Settings
                    },
                ],
            });
        }

        if (roles.includes(25)) {
            additionalLinks.push({
                name: "Управления ПВН",
                key: "pvn",
                icon: Monitor,
                children: [
                    {
                        name: "ПВН транзакций",
                        href: "/pvn/transactions/list",
                        key: "pvn_transactions",
                        icon: List
                    },
                    {
                        name: "ПВН настройки",
                        href: "/pvn/settings/list",
                        key: "pvn_settings",
                        icon: Sliders
                    },
                ],
            });
        }

        if (roles.includes(14)) {
            additionalLinks.push({
                name: "Агент по SMS",
                key: "sms",
                icon: MessageSquare,
                children: [
                    {
                        name: "Отправка SMS",
                        href: "/agent-sms/sms-sender",
                        key: "sms_send",
                        icon: Send
                    },
                ],
            });
        }

        if (roles.includes(15)) {
            additionalLinks.push({
                name: "Агент по транзакциям",
                key: "transactions",
                icon: Zap,
                children: [
                    {
                        name: "Обновление типа транзакции",
                        href: "/agent-transaction/update-transaction",
                        key: "update_transaction",
                        icon: RefreshCw
                    },
                    {
                        name: "Названия терминалов",
                        href: "/agent-transaction/terminal-names",
                        key: "terminal_names",
                        icon: Type
                    },
                ],
            });
        }

        if (roles.includes(16)) {
            additionalLinks.push({
                name: "Агент по таможне",
                key: "customs",
                icon: Ship,
                children: [
                    {
                        name: "Просмотр/Оплата таможни",
                        href: "/agent-custom/eqms",
                        key: "eqms_list",
                        icon: Anchor
                    },
                ],
            });
        }

        if (roles.includes(17)) {
            additionalLinks.push({
                name: "Фронтовик",
                key: "frontovik",
                icon: Users,
                children: [
                    {
                        name: "Поиск клиентов в АБС",
                        href: "/frontovik/abs-search",
                        key: "abs_search",
                        icon: Search
                    },
                ],
            });
        }

        if (roles.includes(18)) {
            additionalLinks.push({
                name: "Процессинг",
                key: "processing",
                icon: Cpu,
                children: [
                    {
                        name: "Лимиты",
                        href: "/processing/limits",
                        key: "limits",
                        icon: ShieldAlert,
                        description: "Управление лимитами карт",
                    },
                    {
                        name: "Транзакции",
                        href: "/processing/transactions",
                        key: "transactions",
                        icon: Repeat,
                        description: "Мониторинг транзакций",
                    },
                ],
            });
        }

        if (roles.includes(21)) {
            additionalLinks.push({
                name: "Поиск по процессингу",
                key: "processing_search",
                icon: Search,
                children: [
                    {
                        name: "Поиск транзакций",
                        href: "/processing-search/transactions",
                        key: "transactions_search",
                        icon: ZoomIn,
                        description: "Мониторинг транзакций универсальный поиск",
                    },
                ],
            });
        }

        if (roles.includes(27)) {
            additionalLinks.push({
                name: "База документов клиентов",
                href: "/client-documents",
                key: "client_documents",
                icon: Folder
            });
        }

        if (roles.includes(28)) {
            additionalLinks.push({
                name: "Остатки по картам",
                href: "/card-balance",
                key: "card_balance",
                icon: Layers
            });
        }

        if (roles.includes(19)) {
            additionalLinks.push({
                name: "Банкоматы",
                key: "atms",
                icon: HardDrive,
                children: [
                    {
                        name: "Таблица банкоматов",
                        href: "/atm/table",
                        key: "atm_table",
                        icon: Table,
                        description: "Таблица ATM",
                    },
                ],
            });
        }

        if (roles.includes(20)) {
            additionalLinks.push({
                name: "Выписки со счетов",
                key: "acc_operations",
                icon: FileSpreadsheet,
                children: [
                    {
                        name: "Просмотр выписки со счетов",
                        href: "/accounts/account-operations",
                        key: "account_operations",
                        icon: Eye
                    },
                ],
            });
        }

        if (roles.includes(23)) {
            additionalLinks.push({
                name: "Кэшбэк",
                key: "cashbacks",
                icon: Gift,
                children: [
                    {
                        name: "Настройки кэшбэк-ов",
                        href: "/cashback/settings",
                        key: "cashbacks_settings",
                        icon: Wrench
                    },
                    {
                        name: "Кэшбэк по картам",
                        href: "/cashback/card-list",
                        key: "card_cashback_list",
                        icon: CreditCard
                    },
                    {
                        name: "Кэшбэк по QR",
                        href: "/cashback/qr-list",
                        key: "qr_cashback_list",
                        icon: QrCode
                    },
                ],
            });
        }

        if (roles.includes(24)) {
            additionalLinks.push({
                name: "Платежи",
                key: "payments",
                icon: CreditCard,
                children: [
                    {
                        name: "Список платежей",
                        href: "/agent-payments/list",
                        key: "payments_list",
                        icon: List
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
        setNewPassword("");
        setConfirmNewPassword("");
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalError("");

        if (newPassword !== confirmNewPassword) {
            setModalError("Пароли не совпадают");
            return;
        }

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
                    new_password: newPassword,
                }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(
                    errorData?.detail || "Не удалось изменить пароль",
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
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {link.icon && <link.icon size={20} style={{ marginRight: isOpen ? '12px' : '0' }} />}
                                            {isOpen && link.name}
                                        </div>
                                        {isOpen && (
                                            <span
                                                className={`dropdown-arrow ${
                                                    isDropdownOpen ? "open" : ""
                                                }`}
                                            >
                                                <FaChevronDown size={16} />
                                            </span>
                                        )}
                                    </button>
                                    {isDropdownOpen && isOpen && (
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
                                                    {child.icon && <child.icon size={18} style={{ marginRight: '10px' }} />}
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
                                {link.icon && <link.icon size={20} style={{ marginRight: isOpen ? '12px' : '0' }} />}
                                {isOpen && link.name}
                                {link.hasNotification && (
                                    <span className="notification-dot"></span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
                <div className={`sidebar-bottom ${isOpen ? "" : "collapsed"}`}>
                    <div className="username-wrapper">
            <span>
              Пользователь: <strong>{username}</strong>
            </span>
                        <button
                            className="change-password-btn"
                            onClick={() => setIsSettingsOpen(true)}
                        >
                            <Settings
                                className="settings-icon"
                                size={27}
                                title="Настройки интерфейса"
                            />
                        </button>
                        <button
                            className="change-password-btn"
                            onClick={handleChangePassword}
                        >
                            <MdPassword
                                size={27}
                                title="Изменить пароль"
                            />
                        </button>
                        <LogoutButton
                            className="change-password-btn"
                            iconSize={{ width: 27, height: 27 }}
                        />
                    </div>
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
                                Новый пароль:
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                        }}
                                    >
                                        {showNewPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                                    </button>
                                </div>
                            </label>
                            <label>
                                Подтвердите новый пароль:
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                        }}
                                    >
                                        {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                                    </button>
                                </div>
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

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    );
}
