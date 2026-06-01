import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import {
  FaUserShield,
  FaEdit,
  FaUserCheck,
  FaSpinner,
  FaUsers,
  FaFolderOpen,
  FaAddressCard,
  FaPhoneAlt,
  FaRegBuilding,
  FaBriefcase,
  FaShieldAlt,
  FaBuilding,
  FaPlus,
  FaTrash,
  FaSearch,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";
import Select from "../../../components/elements/Select.jsx";
import Spinner from "../../../components/Spinner";

const USERS_PER_PAGE = 15;

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roles, setRoles] = useState([]);
  const [workOffices, setWorkOffices] = useState([]);
  const [appOffices, setAppOffices] = useState([]);
  const [loadingOffices, setLoadingOffices] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // User edit modal states
  const [editingUser, setEditingUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [complianceCode, setComplianceCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedAppOffices, setSelectedAppOffices] = useState([]);

  // Worker/Office details
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [plan, setPlan] = useState("");
  const [salaryProject, setSalaryProject] = useState("");
  const [placeWork, setplaceWork] = useState("");

  const [officeTitle, setOfficeTitle] = useState("");
  const [officeCode, setOfficeCode] = useState("");
  const [officeDesc, setOfficeDesc] = useState("");

  // Application office management states
  const [newOfficeTitle, setNewOfficeTitle] = useState("");
  const [editingAppOffice, setEditingAppOffice] = useState(null);
  const [editOfficeTitle, setEditOfficeTitle] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("access_token");

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.first_name || "").toLowerCase().includes(q) ||
      (u.last_name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fetch all data
  const loadData = async () => {
    setLoadingUsers(true);
    try {
      const usersRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      const rolesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.filter((r) => r.ID !== 1));
      }

      const workOfficesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/office`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (workOfficesRes.ok) {
        const officesData = await workOfficesRes.json();
        if (Array.isArray(officesData)) {
          setWorkOffices(officesData.map((o) => o.title));
        }
      }

      await fetchAppOffices();
    } catch (err) {
      console.error(err);
      setError("Ошибка при загрузке данных");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAppOffices = async () => {
    setLoadingOffices(true);
    try {
      const appOfficesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (appOfficesRes.ok) {
        const appOfficesData = await appOfficesRes.json();
        setAppOffices(Array.isArray(appOfficesData) ? appOfficesData : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOffices(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleOpenEdit = async (u) => {
    setError("");
    setSuccess("");
    setEditingUser(u);
    setFullName(u.full_name || "");
    setFirstName(u.first_name || "");
    setLastName(u.last_name || "");
    setUsername(u.username || "");
    setEmail(u.email || "");
    setPhone(u.phone || "");
    setComplianceCode(u.compliance_code || "");
    setIsActive(u.is_active !== false);

    try {
      const userRolesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/user/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRolesRes.ok) {
        const userRolesData = await userRolesRes.json();
        setSelectedRoles(userRolesData.map((r) => r.ID));
      }
    } catch (err) {
      console.error(err);
    }

    try {
      const userAppOfficesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices/user/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userAppOfficesRes.ok) {
        const userAppOfficesData = await userAppOfficesRes.json();
        setSelectedAppOffices(userAppOfficesData.map((o) => o.ID));
      }
    } catch (err) {
      console.error(err);
    }

    setPosition("");
    setSalary("");
    setPlan("");
    setSalaryProject("");
    setplaceWork("");
    setOfficeTitle("");
    setOfficeCode("");
    setOfficeDesc("");
  };

  const handleRoleChange = (e, roleId) => {
    if (e.target.checked) {
      if ((roleId === 6 && selectedRoles.includes(8)) || (roleId === 8 && selectedRoles.includes(6))) {
        setError("Нельзя одновременно назначить роли: Карточник и Кредитник");
        return;
      }
      setSelectedRoles([...selectedRoles, roleId]);
    } else {
      setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
    }
    setError("");
  };

  const handleAppOfficeChange = (e, officeId) => {
    if (e.target.checked) {
      setSelectedAppOffices([...selectedAppOffices, officeId]);
    } else {
      setSelectedAppOffices(selectedAppOffices.filter((id) => id !== officeId));
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      const profileRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          username: username,
          email: email,
          phone: phone,
          compliance_code: complianceCode,
          is_active: isActive,
        }),
      });

      if (!profileRes.ok) {
        const errData = await profileRes.json();
        throw new Error(errData.error || "Не удалось обновить профиль");
      }

      const rolesRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/user/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role_ids: selectedRoles,
          application_office_ids: selectedAppOffices,
          salary: Number(salary),
          position: position,
          plan: Number(plan),
          salary_project: Number(salaryProject),
          place_work: placeWork,
          office_title: officeTitle,
          office_code: officeCode,
          office_desc: officeDesc,
        }),
      });

      if (!rolesRes.ok) {
        const errData = await rolesRes.json();
        throw new Error(errData.error || "Не удалось обновить роли сотрудника");
      }

      setSuccess("Данные сотрудника успешно обновлены");
      setEditingUser(null);
      loadData();
    } catch (err) {
      setError(err.message || "Произошла ошибка при сохранении");
    } finally {
      setActionLoading(false);
    }
  };

  // Application office list management
  const handleAddAppOffice = async (e) => {
    e.preventDefault();
    if (!newOfficeTitle.trim()) return;
    setError("");
    setActionLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newOfficeTitle.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Не удалось создать офис");
      }

      setNewOfficeTitle("");
      fetchAppOffices();
    } catch (err) {
      setError(err.message || "Ошибка при создании офиса");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAppOffice = async (e) => {
    e.preventDefault();
    if (!editingAppOffice || !editOfficeTitle.trim()) return;
    setError("");
    setActionLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices/${editingAppOffice.ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: editOfficeTitle.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Не удалось обновить офис");
      }

      setEditingAppOffice(null);
      setEditOfficeTitle("");
      fetchAppOffices();
    } catch (err) {
      setError(err.message || "Ошибка при изменении офиса");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAppOffice = async (officeId) => {
    if (!window.confirm("Вы действительно хотите удалить этот офис заявок?")) return;
    setError("");
    setActionLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices/${officeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Не удалось удалить офис");
      }

      fetchAppOffices();
    } catch (err) {
      setError(err.message || "Ошибка при удалении офиса");
    } finally {
      setActionLoading(false);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="up-pagination">
        <button
          className="up-pagination-btn"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <FaChevronLeft />
        </button>
        {startPage > 1 && (
          <>
            <button className="up-pagination-btn" onClick={() => setCurrentPage(1)}>1</button>
            {startPage > 2 && <span className="up-pagination-dots">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            className={`up-pagination-btn ${p === currentPage ? "active" : ""}`}
            onClick={() => setCurrentPage(p)}
          >
            {p}
          </button>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="up-pagination-dots">...</span>}
            <button className="up-pagination-btn" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
          </>
        )}
        <button
          className="up-pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          <FaChevronRight />
        </button>
        <span className="up-pagination-info">
          {filteredUsers.length} сотрудник(ов), стр. {currentPage}/{totalPages}
        </span>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Управление пользователями</title>
      </Helmet>

      <style>{`
        .up-container {
          padding: 32px;
          max-width: 1400px;
          margin: 0 auto;
          color: #fff;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        }
        .up-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }
        .up-header h1 {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
        }
        .up-header h1 svg {
          -webkit-text-fill-color: #ef4444;
          font-size: 26px;
        }
        .up-tabs {
          display: flex;
          gap: 4px;
          background: rgba(15, 10, 10, 0.6);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 16px;
          padding: 4px;
          margin-bottom: 24px;
          width: fit-content;
        }
        .up-tab {
          padding: 12px 28px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #888;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .up-tab:hover {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.05);
        }
        .up-tab.active {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
        }
        .up-alert {
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          animation: slideIn 0.3s ease;
        }
        .up-alert-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }
        .up-alert-success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #a7f3d0;
        }
        .up-search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          position: relative;
        }
        .up-search-bar svg {
          position: absolute;
          left: 16px;
          color: #ef4444;
          opacity: 0.7;
          font-size: 16px;
        }
        .up-search-bar input {
          width: 100%;
          max-width: 480px;
          padding: 14px 16px 14px 44px;
          background: rgba(15, 10, 10, 0.6);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 14px;
          color: #fff;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .up-search-bar input:focus {
          border-color: #ef4444;
          outline: none;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .up-search-bar input::placeholder {
          color: #666;
        }
        .up-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 16px;
        }
        .up-card {
          background: rgba(15, 10, 10, 0.5);
          border: 1px solid rgba(239, 68, 68, 0.12);
          border-radius: 18px;
          padding: 22px 26px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .up-card:hover {
          border-color: rgba(239, 68, 68, 0.35);
          box-shadow: 0 8px 32px rgba(239, 68, 68, 0.08);
          transform: translateY(-2px);
        }
        .up-card.inactive {
          opacity: 0.55;
        }
        .up-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .up-card-name {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
        }
        .up-card-username {
          font-size: 12px;
          color: #999;
          margin-left: 6px;
        }
        .up-card-badge-blocked {
          font-size: 11px;
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 3px 10px;
          border-radius: 8px;
          font-weight: 700;
        }
        .up-card-details {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 13px;
          color: #aaa;
        }
        .up-card-details span {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .up-card-details svg {
          color: #ef4444;
          font-size: 12px;
        }
        .up-card-roles {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .up-role-badge {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          font-weight: 600;
        }
        .up-card-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: auto;
        }
        .up-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .up-btn-edit {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .up-btn-edit:hover {
          background: #ef4444;
          color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
        }
        .up-btn-save {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.25);
        }
        .up-btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
          filter: brightness(1.1);
        }
        .up-btn-cancel {
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .up-btn-cancel:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #fff;
        }
        .up-btn-add {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
          white-space: nowrap;
        }
        .up-btn-add:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .up-btn-delete {
          background: transparent;
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .up-btn-delete:hover {
          background: rgba(239, 68, 68, 0.15);
        }
        .up-pagination {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 28px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .up-pagination-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          background: rgba(15, 10, 10, 0.5);
          color: #999;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .up-pagination-btn:hover:not(:disabled) {
          border-color: #ef4444;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }
        .up-pagination-btn.active {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        .up-pagination-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .up-pagination-dots {
          color: #666;
          padding: 0 4px;
        }
        .up-pagination-info {
          color: #888;
          font-size: 13px;
          margin-left: 12px;
        }
        .up-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 80px 20px;
          color: #666;
          font-size: 16px;
        }
        .up-empty svg {
          font-size: 48px;
          opacity: 0.4;
          color: #ef4444;
        }

        /* MODAL */
        .up-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 40px 20px;
          overflow-y: auto;
          animation: fadeIn 0.2s ease;
        }
        .up-modal {
          background: linear-gradient(145deg, #1a0e0e 0%, #0f0808 100%);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 24px;
          width: 100%;
          max-width: 760px;
          padding: 36px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(239, 68, 68, 0.08);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .up-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(239, 68, 68, 0.15);
        }
        .up-modal-header h2 {
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }
        .up-modal-close {
          background: none;
          border: none;
          color: #888;
          font-size: 28px;
          cursor: pointer;
          transition: color 0.2s;
          line-height: 1;
        }
        .up-modal-close:hover {
          color: #ef4444;
        }
        .up-section-title {
          color: #ef4444;
          font-weight: 800;
          font-size: 15px;
          margin-bottom: 16px;
          margin-top: 28px;
          border-left: 3px solid #ef4444;
          padding-left: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .up-section-title:first-of-type {
          margin-top: 0;
        }
        .up-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .up-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .up-form-group.span-2 {
          grid-column: span 2;
        }
        .up-form-group label {
          font-size: 12px;
          color: #fca5a5;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .up-form-group input,
        .up-form-group textarea {
          padding: 12px 16px;
          background: rgba(15, 10, 10, 0.6);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .up-form-group input:focus,
        .up-form-group textarea:focus {
          border-color: #ef4444;
          outline: none;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .up-form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        .up-checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
          grid-column: span 2;
        }
        .up-checkbox-row input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #ef4444;
        }
        .up-checkbox-row label {
          cursor: pointer;
          font-size: 14px;
          color: #ccc;
        }
        .up-roles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 8px;
        }
        .up-role-check {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(15, 10, 10, 0.4);
          border: 1px solid rgba(239, 68, 68, 0.1);
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        .up-role-check:hover {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }
        .up-role-check input[type="checkbox"] {
          accent-color: #ef4444;
          cursor: pointer;
        }
        .up-role-check label {
          cursor: pointer;
          font-size: 13px;
          color: #ddd;
        }
        .up-conditional-section {
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.03);
          padding: 24px;
          border-radius: 18px;
          margin-top: 20px;
        }
        .up-conditional-title {
          color: #ef4444;
          font-weight: 800;
          font-size: 14px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .up-form-actions {
          display: flex;
          gap: 14px;
          justify-content: flex-end;
          margin-top: 36px;
          padding-top: 24px;
          border-top: 1px solid rgba(239, 68, 68, 0.1);
        }

        /* Office tab styles */
        .up-office-form {
          display: flex;
          gap: 12px;
          background: rgba(15, 10, 10, 0.5);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 20px 24px;
          border-radius: 18px;
          margin-bottom: 24px;
        }
        .up-office-form input {
          flex: 1;
          padding: 12px 16px;
          background: rgba(15, 10, 10, 0.6);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
        }
        .up-office-form input:focus {
          border-color: #ef4444;
          outline: none;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .up-office-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 10, 10, 0.5);
          border: 1px solid rgba(239, 68, 68, 0.12);
          border-radius: 14px;
          padding: 16px 24px;
          transition: all 0.2s ease;
        }
        .up-office-card:hover {
          border-color: rgba(239, 68, 68, 0.3);
        }
        .up-office-name {
          font-size: 16px;
          color: #fff;
          font-weight: 700;
        }
        .up-office-actions {
          display: flex;
          gap: 8px;
        }
        .up-office-edit-form {
          display: flex;
          gap: 10px;
          width: 100%;
        }
        .up-office-edit-form input {
          flex: 1;
          padding: 8px 14px;
          background: rgba(15, 10, 10, 0.6);
          border: 1px solid #ef4444;
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
        }
        .up-office-edit-form input:focus {
          outline: none;
        }
        .up-office-small-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pulse-animation {
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div className="up-container">
        <div className="up-header">
          <h1>
            <FaUsers />
            <span>Панель оператора</span>
          </h1>
        </div>

        <div className="up-tabs">
          <button
            className={`up-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => { setActiveTab("users"); setError(""); }}
          >
            Сотрудники банка
          </button>
          <button
            className={`up-tab ${activeTab === "offices" ? "active" : ""}`}
            onClick={() => { setActiveTab("offices"); setError(""); }}
          >
            Офисы приема заявок
          </button>
        </div>

        {error && <div className="up-alert up-alert-error">{error}</div>}
        {success && <div className="up-alert up-alert-success">{success}</div>}

        {/* --- USERS TAB --- */}
        {activeTab === "users" && (
          loadingUsers ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
              <Spinner size="large" label="Загрузка списка пользователей..." />
            </div>
          ) : users.length === 0 ? (
            <div className="up-empty">
              <FaFolderOpen />
              <h3>Пользователи не найдены</h3>
            </div>
          ) : (
            <>
              <div className="up-search-bar">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Поиск по ФИО, username, телефону, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="up-grid">
                {paginatedUsers.map((u) => (
                  <div key={u.id} className={`up-card ${u.is_active === false ? "inactive" : ""}`}>
                    <div className="up-card-top">
                      <div>
                        <span className="up-card-name">
                          {u.last_name || u.first_name
                            ? `${u.last_name || ""} ${u.first_name || ""}`.trim()
                            : u.full_name || "Без ФИО"
                          }
                        </span>
                        <span className="up-card-username">@{u.username}</span>
                      </div>
                      {u.is_active === false && (
                        <span className="up-card-badge-blocked">Заблокирован</span>
                      )}
                    </div>
                    <div className="up-card-details">
                      <span><FaPhoneAlt /> {u.phone || "Без телефона"}</span>
                      {u.email && <span>Email: {u.email}</span>}
                      {u.compliance_code && <span>Комплаенс: {u.compliance_code}</span>}
                    </div>
                    <div className="up-card-roles">
                      {u.roles?.map((r) => (
                        <span key={r.ID} className="up-role-badge">{r.Name}</span>
                      ))}
                    </div>
                    <div className="up-card-actions">
                      <button className="up-btn up-btn-edit" onClick={() => handleOpenEdit(u)}>
                        <FaEdit />
                        <span>Редактировать</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {renderPagination()}
            </>
          )
        )}

        {/* --- OFFICES TAB --- */}
        {activeTab === "offices" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <form onSubmit={handleAddAppOffice} className="up-office-form">
              <input
                type="text"
                value={newOfficeTitle}
                onChange={(e) => setNewOfficeTitle(e.target.value)}
                placeholder="Введите название нового офиса приема заявок"
                required
              />
              <button type="submit" className="up-btn up-btn-add" disabled={actionLoading}>
                <FaPlus />
                <span>Добавить офис</span>
              </button>
            </form>

            {loadingOffices ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Spinner size="medium" label="Загрузка списка офисов..." />
              </div>
            ) : appOffices.length === 0 ? (
              <div className="up-empty">
                <FaFolderOpen />
                <h3>Офисы отсутствуют</h3>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {appOffices.map((office) => (
                  <div key={office.ID} className="up-office-card">
                    <div style={{ flex: 1 }}>
                      {editingAppOffice && editingAppOffice.ID === office.ID ? (
                        <form onSubmit={handleUpdateAppOffice} className="up-office-edit-form">
                          <input
                            type="text"
                            value={editOfficeTitle}
                            onChange={(e) => setEditOfficeTitle(e.target.value)}
                            required
                          />
                          <button type="submit" className="up-office-small-btn up-btn-save">ОК</button>
                          <button type="button" className="up-office-small-btn up-btn-cancel" onClick={() => setEditingAppOffice(null)}>Отмена</button>
                        </form>
                      ) : (
                        <span className="up-office-name">{office.title}</span>
                      )}
                    </div>

                    {!editingAppOffice && (
                      <div className="up-office-actions">
                        <button
                          className="up-btn up-btn-edit"
                          style={{ padding: "8px 16px" }}
                          onClick={() => { setEditingAppOffice(office); setEditOfficeTitle(office.title); }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="up-btn up-btn-delete"
                          style={{ padding: "8px 16px" }}
                          onClick={() => handleDeleteAppOffice(office.ID)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- EDIT USER MODAL --- */}
        {editingUser && (
          <div className="up-overlay">
            <form className="up-modal" onSubmit={handleSaveUser}>
              <div className="up-modal-header">
                <h2>Редактирование: {editingUser.username}</h2>
                <button type="button" className="up-modal-close" onClick={() => setEditingUser(null)}>
                  &times;
                </button>
              </div>

              {error && <div className="up-alert up-alert-error">{error}</div>}

              <div className="up-section-title">1. Учетные данные сотрудника</div>
              <div className="up-form-grid">
                <div className="up-form-group">
                  <label>Фамилия</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Иванов" />
                </div>
                <div className="up-form-group">
                  <label>Имя</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Иван" />
                </div>
                <div className="up-form-group span-2">
                  <label>ФИО сотрудника (полное)</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" />
                </div>
                <div className="up-form-group">
                  <label>Имя пользователя (username)</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="up-form-group">
                  <label>Номер телефона</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <div className="up-form-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="up-form-group">
                  <label>Код комплаенса</label>
                  <input type="text" value={complianceCode} onChange={(e) => setComplianceCode(e.target.value)} />
                </div>
                <div className="up-checkbox-row">
                  <input
                    type="checkbox"
                    id="edit-isactive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor="edit-isactive">
                    Активный аккаунт (сотрудник разблокирован)
                  </label>
                </div>
              </div>

              <div className="up-section-title">2. Роли сотрудника</div>
              <div className="up-roles-grid">
                {roles.map((role) => (
                  <div key={role.ID} className="up-role-check">
                    <input
                      type="checkbox"
                      id={`edit-role-${role.ID}`}
                      checked={selectedRoles.includes(role.ID)}
                      onChange={(e) => handleRoleChange(e, role.ID)}
                    />
                    <label htmlFor={`edit-role-${role.ID}`}>{role.Name}</label>
                  </div>
                ))}
              </div>

              <div className="up-section-title">3. Офисы приема заявок</div>
              <div className="up-roles-grid">
                {appOffices.map((office) => (
                  <div key={office.ID} className="up-role-check">
                    <input
                      type="checkbox"
                      id={`edit-appoffice-${office.ID}`}
                      checked={selectedAppOffices.includes(office.ID)}
                      onChange={(e) => handleAppOfficeChange(e, office.ID)}
                    />
                    <label htmlFor={`edit-appoffice-${office.ID}`}>{office.title}</label>
                  </div>
                ))}
              </div>

              {/* Conditional Worker Details */}
              {selectedRoles.some((r) => [6, 8].includes(r)) && (
                <div className="up-conditional-section">
                  <div className="up-conditional-title">
                    <span>💼 Рабочие сведение для карточного/кредитного отдела</span>
                  </div>
                  <div className="up-form-grid">
                    <div className="up-form-group">
                      <label>Должность *</label>
                      <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} required />
                    </div>
                    <div className="up-form-group">
                      <label>Сумма оклада *</label>
                      <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} required />
                    </div>
                    <div className="up-form-group">
                      <label>План *</label>
                      <input type="number" value={plan} onChange={(e) => setPlan(e.target.value)} required />
                    </div>
                    <div className="up-form-group">
                      <label>ЗП проект *</label>
                      <input type="number" value={salaryProject} onChange={(e) => setSalaryProject(e.target.value)} required />
                    </div>
                    <div className="up-form-group span-2">
                      <label>Обслуживающий офис *</label>
                      <Select
                        value={placeWork}
                        onChange={(val) => setplaceWork(val)}
                        options={[
                          { value: "", label: "Выберите офис" },
                          ...workOffices.map((o) => ({ value: o, label: o })),
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Director Office Details */}
              {selectedRoles.includes(5) && (
                <div className="up-conditional-section">
                  <div className="up-conditional-title">
                    <span>🏢 Сведения о филиале (директор филиала)</span>
                  </div>
                  <div className="up-form-grid">
                    <div className="up-form-group">
                      <label>Название филиала *</label>
                      <input type="text" value={officeTitle} onChange={(e) => setOfficeTitle(e.target.value)} required />
                    </div>
                    <div className="up-form-group">
                      <label>Код филиала *</label>
                      <input type="text" value={officeCode} onChange={(e) => setOfficeCode(e.target.value)} required />
                    </div>
                    <div className="up-form-group span-2">
                      <label>Описание и адрес филиала *</label>
                      <textarea
                        value={officeDesc}
                        onChange={(e) => setOfficeDesc(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="up-form-actions">
                <button type="button" className="up-btn up-btn-cancel" onClick={() => setEditingUser(null)} disabled={actionLoading}>
                  Отмена
                </button>
                <button type="submit" className="up-btn up-btn-save" disabled={actionLoading}>
                  {actionLoading ? (
                    <FaSpinner className="pulse-animation" />
                  ) : (
                    <>
                      <FaUserCheck />
                      <span>Сохранить изменения</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
