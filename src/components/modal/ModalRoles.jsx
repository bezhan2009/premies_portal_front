import React, { useEffect, useState } from "react";
import {
    getRoles,
    getRoleUserById,
    updateRoleUserById,
} from "../../api/roles/roles";
import { IoIosClose } from "react-icons/io";
import Spinner from "../Spinner";
import { getAllOffices } from "../../api/chairman/reports/employee_spec";
import Input from "../elements/Input";
import Select from "../elements/Select";
import AlertMessage from "../general/AlertMessage";
import UserPhoto from "../../assets/user.png";
import { getWorkerByUserId } from "../../api/workers/getWorkerByUserId";
import "../../styles/components/ModalRoles.scss";

export default function ModalRoles({ open = true, data, setOpenRoles }) {
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [offices, setOffices] = useState([]);
    const [userRoles, setUserRoles] = useState([]);
    const [details, setDetails] = useState({
        office_title: "",
        office_desc: "",
        office_code: "",
        Salary: "",
        position: "",
        plan: "",
        salary_project: "",
        place_work: ""
    });
    const [alert, setAlert] = useState({ message: "", type: "error" });
    const [workerData, setWorkerData] = useState(null);
    const [directorOfficeData, setDirectorOfficeData] = useState(null);
    const backendURL = import.meta.env.VITE_BACKEND_URL;

    const loadData = async () => {
        setLoading(true);
        try {
            const rolesData = await getRoles();
            setRoles(rolesData || []);
        } catch (err) {
            console.error(err);
            setAlert({ message: "Ошибка загрузки ролей", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const loadDataUser = async () => {
        if (!data?.ID) return;
        setLoading(true);
        try {
            const rolesData = await getRoleUserById(data.ID);
            setUserRoles(rolesData || []);
        } catch (err) {
            console.error(err);
            setUserRoles([]);
            setAlert({ message: "Ошибка загрузки ролей пользователя", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const loadAllOffices = async () => {
        try {
            const officesData = await getAllOffices();
            setOffices(officesData || []);
        } catch (err) {
            console.error(err);
            setAlert({ message: "Ошибка загрузки офисов", type: "error" });
        }
    };

    const loadWorkerData = async () => {
        if (!data?.ID) return;
        try {
            const worker = await getWorkerByUserId(data.ID);
            setDetails(prev => ({
                ...prev,
                Salary: worker.Salary || "",
                position: worker.position || "",
                plan: worker.plan || "",
                salary_project: worker.salary_project || "",
                place_work: worker.place_work || ""
            }));
            setWorkerData(worker);
        } catch (err) {
            if (err.response?.data?.error === "ErrUserNotFound") {
                setWorkerData(null);
                // Сбрасываем поля сотрудника если worker не найден
                setDetails(prev => ({
                    ...prev,
                    Salary: "",
                    position: "",
                    plan: "",
                    salary_project: "",
                    place_work: ""
                }));
            } else {
                console.error(err);
            }
        }
    };

    const loadDirectorOffice = async () => {
        if (!data?.ID) return;
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`${backendURL}/office/director/${data.ID}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const officeData = await response.json();
                setDirectorOfficeData(officeData);
                setDetails(prev => ({
                    ...prev,
                    office_title: officeData.title || "",
                    office_desc: officeData.description || "",
                    office_code: officeData.code || ""
                }));
            } else if (response.status === 404) {
                setDirectorOfficeData(null);
                // Сбрасываем поля офиса если офис не найден
                setDetails(prev => ({
                    ...prev,
                    office_title: "",
                    office_desc: "",
                    office_code: ""
                }));
            } else {
                throw new Error("Ошибка загрузки данных офиса");
            }
        } catch (err) {
            console.error(err);
            setDirectorOfficeData(null);
        }
    };

    const toggleRole = (role) => {
        if (role.banned) return;

        setUserRoles((prev) => {
            const exists = prev.some((el) => el.ID === role.ID);
            if (exists) {
                return prev.filter((el) => el.ID !== role.ID);
            }
            return [...prev, role];
        });
    };

    useEffect(() => {
        if (open && data) {
            loadData();
            loadDataUser();
            loadAllOffices();
            loadWorkerData();
            loadDirectorOffice();
        }
    }, [open, data]);

    useEffect(() => {
        const hasRole6 = userRoles.some((el) => el.ID === 6);
        const hasRole8 = userRoles.some((el) => el.ID === 8);

        setRoles((prev) =>
            prev.map((role) => ({
                ...role,
                banned: (role.ID === 6 && hasRole8) || (role.ID === 8 && hasRole6),
            }))
        );
    }, [userRoles]);

    const isRoleActive = (roleId) => userRoles.some((el) => el.ID === roleId);

    const validateFields = () => {
        const errors = [];

        if (isRoleActive(5) && !directorOfficeData) {
            if (!details.office_title?.trim()) errors.push("Название офиса");
            if (!details.office_code?.trim()) errors.push("Код офиса");
            if (!details.office_desc?.trim()) errors.push("Описание офиса");
        }

        if ((isRoleActive(6) || isRoleActive(8)) && !workerData) {
            if (!details.Salary && details.Salary !== 0) errors.push("Сумма оклада");
            if (!details.position?.trim()) errors.push("Должность");
            if (!details.plan && details.plan !== 0) errors.push("План");
            if (!details.salary_project && details.salary_project !== 0) errors.push("ЗП по проекту");
            if (!details.place_work?.trim()) errors.push("Офис");
        }

        if (errors.length > 0) {
            setAlert({
                message: `Заполните обязательные поля: ${errors.join(", ")}`,
                type: "warning",
            });
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateFields()) return;

        setLoading(true);
        try {
            await updateRoleUserById(data.ID, {
                ...data,
                ...details,
                Salary: +details.Salary || 0,
                plan: +details.plan || 0,
                salary_project: +details.salary_project || 0,
                role_ids: userRoles.map((r) => r.ID),
            });
            setAlert({ message: "Изменения успешно сохранены!", type: "success" });
            setTimeout(() => setOpenRoles({ open: false, data: null }), 10);
        } catch (err) {
            console.error(err);
            setAlert({ message: "Ошибка сохранения изменений", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    if (!open || !data) return null;

    return (
        <div className="modal-roles">
            <main>
                <header>
                    <h2>Распределение ролей</h2>
                    <IoIosClose onClick={() => setOpenRoles({ open: false, data: null })} />
                </header>

                <div className="user-card">
                    <div className="user-avatar">
                        <img
                            src={data.avatar || UserPhoto}
                            alt={data.full_name}
                        />
                    </div>
                    <div className="user-info">
                        <h3>{data.full_name || "Не указано"}</h3>
                        <p>Email: <span>{data.email || "—"}</span></p>
                        <div className="roles-preview">
                            <strong>Роли:</strong>
                            <div className="roles-list">
                                {userRoles.length > 0 ? (
                                    userRoles.map((role) => (
                                        <span key={role.ID} className="role-tag">
                      {role.Name}
                    </span>
                                    ))
                                ) : (
                                    <span className="no-roles">Нет ролей</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-body">
                    <section className="roles-section">
                        <h3>Доступные роли</h3>
                        {loading ? (
                            <Spinner />
                        ) : (
                            <div className="roles-grid">
                                {roles.map((role, index) => {
                                    const active = isRoleActive(role.ID);
                                    const banned = role.banned;
                                    const id = `role-${role.ID}`;

                                    return (
                                        <label
                                            key={role.ID}
                                            htmlFor={id}
                                            className={`role-item ${active ? "active" : ""} ${banned ? "disabled" : ""}`}
                                            style={{ animationDelay: `${index * 0.07}s` }}
                                        >
                                            <input
                                                id={id}
                                                type="checkbox"
                                                checked={active}
                                                onChange={() => toggleRole(role)}
                                                disabled={banned}
                                            />
                                            <span className="checkmark">
                        <svg viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                                            <span className="role-label">{role.Name}</span>
                                            {banned && <span className="conflict">Конфликт с другой ролью</span>}
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {(isRoleActive(5) || directorOfficeData) && (
                        <section className="extra-section office-manager">
                            <h3>Данные руководителя офиса</h3>
                            <div className="form-grid">
                                {directorOfficeData ? (
                                    <>
                                        <p className="display-field">Название офиса: {details.office_title}</p>
                                        <p className="display-field">Код офиса: {details.office_code}</p>
                                        <div className="full-width">
                                            <p className="display-field">Описание офиса: {details.office_desc}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Input
                                            placeholder="Название офиса"
                                            value={details.office_title || ""}
                                            onChange={(value) => setDetails({ ...details, office_title: value })}
                                        />
                                        <Input
                                            placeholder="Код офиса"
                                            value={details.office_code || ""}
                                            onChange={(value) => setDetails({ ...details, office_code: value })}
                                        />
                                        <div className="full-width">
                      <textarea
                          placeholder="Описание офиса"
                          rows={4}
                          value={details.office_desc || ""}
                          onChange={(e) => setDetails({ ...details, office_desc: e.target.value })}
                          style={{ width: "95%" }}
                      />
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    )}

                    {(isRoleActive(6) || isRoleActive(8) || workerData) && (
                        <section className="extra-section employee-fields">
                            <h3>Данные сотрудника</h3>
                            <div className="form-grid">
                                {workerData ? (
                                    <>
                                        <p className="display-field">Сумма оклада: {details.Salary}</p>
                                        <p className="display-field">Должность: {details.position}</p>
                                        <p className="display-field">План: {details.plan}</p>
                                        <p className="display-field">ЗП по проекту: {details.salary_project}</p>
                                        <p className="display-field">Офис: {details.place_work}</p>
                                    </>
                                ) : (
                                    <>
                                        <Input
                                            placeholder="Сумма оклада"
                                            type="number"
                                            value={details.Salary || ""}
                                            onChange={(value) => setDetails({ ...details, Salary: value })}
                                        />
                                        <Input
                                            placeholder="Должность"
                                            value={details.position || ""}
                                            onChange={(value) => setDetails({ ...details, position: value })}
                                        />
                                        <Input
                                            placeholder="План"
                                            type="number"
                                            value={details.plan || ""}
                                            onChange={(value) => setDetails({ ...details, plan: value })}
                                        />
                                        <Input
                                            placeholder="ЗП по проекту"
                                            type="number"
                                            value={details.salary_project || ""}
                                            onChange={(value) => setDetails({ ...details, salary_project: value })}
                                        />
                                        <Select
                                            placeholder="Офис"
                                            value={details.place_work || ""}
                                            options={offices.map((o) => ({ value: o.title, label: o.title }))}
                                            onChange={(val) => setDetails({ ...details, place_work: val })}
                                        />
                                    </>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                {alert.message && (
                    <AlertMessage
                        message={alert.message}
                        type={alert.type}
                        onClose={() => setAlert({ message: "", type: "error" })}
                        duration={5000}
                    />
                )}

                <div className="actions">
                    <button className="btn-confirm" onClick={handleSave} disabled={loading}>
                        {loading ? <Spinner /> : "Сохранить"}
                    </button>
                    <button className="btn-cancel" onClick={() => setOpenRoles({ open: false, data: null })}>
                        Отмена
                    </button>
                </div>
            </main>
        </div>
    );
}
