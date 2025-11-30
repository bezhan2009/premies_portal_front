import React, { useEffect, useState } from "react";
import {
  getRoles,
  getRoleUserById,
  updateRoleUserById,
} from "../../api/roles/roles";
import { IoIosClose } from "react-icons/io";
import Spinner from "../Spinner";
import { BsToggle2Off, BsToggle2On } from "react-icons/bs";
import { getAllOffices } from "../../api/chairman/reports/employee_spec";
import Input from "../elements/Input";
import Select from "../elements/Select";

export default function ModalRoles({ open = true, data, setOpenRoles }) {
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(0);
  const [roles, setRoles] = useState([]);
  const [offices, setOffices] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [details, setDetails] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const rolesData = await getRoles();
      setRoles(rolesData);
    } finally {
      setLoading(false);
    }
  };

  const loadDataUser = async () => {
    setLoading(true);
    try {
      const rolesData = await getRoleUserById(data.ID);
      setUserRoles(rolesData);
    } finally {
      setLoading(false);
    }
  };

  const loadAllOffices = async () => {
    setLoading(true);
    try {
      const rolesData = await getAllOffices();
      setOffices(rolesData);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (role) => {
    if (userRoles.find((el) => el.ID === role.ID)) {
      setUserRoles(userRoles.filter((el) => el.ID !== role.ID));
    } else {
      setUserRoles([...userRoles, role]);
    }
  };

  useEffect(() => {
    loadData();
    loadDataUser();
    loadAllOffices();
  }, []);

  useEffect(() => {
    const hasRole6 = userRoles.some((el) => el.ID === 6);
    const hasRole8 = userRoles.some((el) => el.ID === 8);

    setRoles((prevRoles) =>
      prevRoles.map((role) => {
        if (role.ID === 8) {
          return { ...role, banned: hasRole6 };
        }
        if (role.ID === 6) {
          return { ...role, banned: hasRole8 };
        }
        return role;
      })
    );
  }, [userRoles]);

  if (!open) {
    return "";
  }
  console.log("roles", roles);
  console.log("data", data);
  console.log("userRoles", userRoles);

  return (
    <div className="modal-roles">
      <main>
        <header>
          <h2>Роспределение ролей</h2>
          <IoIosClose
            onClick={() => setOpenRoles({ open: false, data: null })}
          />
        </header>
        <nav>
          <h3>Данные сотрудника</h3>
          <ul>
            <li>
              <label>ФИО:</label> {data.full_name}
            </li>
            <li>
              <label>Логин:</label> {data.username}
            </li>
            <li>
              <label>Номер телефона:</label> {data.phone}
            </li>
            <li>
              <label>Email:</label> {data.email}
            </li>
            <li>
              <label>Присвоенные роли:</label>{" "}
              {userRoles.map((el) => el.Name).join(", ")}
            </li>
          </ul>
        </nav>
        <nav>
          <h3 style={{ marginTop: 30 }}>Роспределение ролей</h3>
          {loading ? (
            <Spinner />
          ) : (
            <div>
              {roles.map((role, idx) => (
                <span key={idx}>
                  <label>{role.Name}</label>{" "}
                  {loadingId === role.ID ? (
                    <Spinner />
                  ) : (
                    <>
                      {userRoles.find((el) => el.ID === role.ID) ? (
                        <BsToggle2On
                          // disabled={role.ID === 6 && !role.banned}
                          onClick={() => toggleRole(role)}
                          style={{ color: "#28a745" }}
                        />
                      ) : (
                        <BsToggle2Off
                          onClick={() => !role?.banned && toggleRole(role)}
                          style={{ color: role?.banned ? "red" : "#999" }}
                        />
                      )}
                    </>
                  )}
                </span>
              ))}
            </div>
          )}
        </nav>
        <main>
          {userRoles?.find((el) => el.ID === 5) ? (
            <>
              <h3 style={{ marginTop: 30 }}>Дополнительная информация</h3>
              <div>
                <Input
                  defValue={details?.place_work}
                  type="text"
                  value={details?.place_work}
                  placeholder="Введите место работы"
                  onChange={(e) => setDetails({ ...details, place_work: e })}
                  // onEnter={() => saveChange(edit)}
                />

                <Input
                  defValue={details?.position}
                  type="text"
                  placeholder="Введите должность"
                  value={details?.position}
                  onChange={(e) => setDetails({ ...details, position: e })}
                  // onEnter={() => saveChange(edit)}
                />
              </div>
            </>
          ) : (
            ""
          )}
          {userRoles?.find((el) => el.ID === 6) ? (
            <>
              <h3 style={{ marginTop: 30 }}>Дополнительная информация</h3>
              <div>
                <Input
                  defValue={details?.salary_project}
                  placeholder="Введите сумму проекта"
                  type="number"
                  value={details?.salary_project}
                  onChange={(e) =>
                    setDetails({ ...details, salary_project: e })
                  }
                  // onEnter={() => saveChange(edit)}
                />

                <Input
                  defValue={details?.plan}
                  placeholder="Введите план"
                  type="number"
                  value={details?.plan}
                  onChange={(e) => setDetails({ ...details, plan: e })}
                  // onEnter={() => saveChange(edit)}
                />

                <Input
                  defValue={details?.Salary}
                  placeholder="Сумма оклада"
                  type="number"
                  value={details?.Salary}
                  onChange={(e) => setDetails({ ...details, Salary: e })}
                  // onEnter={() => saveChange(edit)}
                />
                <Input
                  defValue={details?.position}
                  placeholder="Введите должность"
                  type="text"
                  value={details?.position}
                  onChange={(e) => setDetails({ ...details, position: e })}
                  // onEnter={() => saveChange(edit)}
                />

                <Select
                  style={{ width: "100%" }}
                  placeholder="Выберите офис"
                  defValue={details?.place_work}
                  value={details?.place_work}
                  options={offices.map((el) => ({
                    value: el.ID,
                    label: el.title,
                  }))}
                  onChange={(e) =>
                    setDetails({
                      ...details,
                      place_work: offices.find((item) => item.ID === +e)?.title,
                    })
                  }
                  // onEnter={() => saveChange(edit)}
                />
              </div>
            </>
          ) : (
            ""
          )}
          {userRoles?.find((el) => el.ID === 8) ? (
            <>
              <h3 style={{ marginTop: 30 }}>Дополнительная информация</h3>
              <div>
                <Input
                  defValue={details?.salary_project}
                  placeholder="Введите сумму проекта"
                  type="text"
                  value={details?.salary_project}
                  onChange={(e) =>
                    setDetails({ ...details, salary_project: e })
                  }
                  // onEnter={() => saveChange(edit)}
                />

                <Input
                  defValue={details?.plan}
                  placeholder="Введите план"
                  type="text"
                  value={details?.plan}
                  onChange={(e) => setDetails({ ...details, plan: e })}
                  // onEnter={() => saveChange(edit)}
                />

                <Input
                  defValue={details?.Salary}
                  placeholder="Сумма оклада"
                  type="text"
                  value={details?.Salary}
                  onChange={(e) => setDetails({ ...details, Salary: e })}
                  // onEnter={() => saveChange(edit)}
                />
                <Input
                  defValue={details?.position}
                  placeholder="Введите должность"
                  type="text"
                  value={details?.position}
                  onChange={(e) => setDetails({ ...details, position: e })}
                  // onEnter={() => saveChange(edit)}
                />

                <Select
                  style={{ width: "100%" }}
                  placeholder="Выберите офис"
                  defValue={details?.place_work}
                  value={details?.place_work}
                  options={offices.map((el) => ({
                    value: el.ID,
                    label: el.title,
                  }))}
                  onChange={(e) =>
                    setDetails({
                      ...details,
                      place_work: offices.find((a) => a.ID === e).title,
                    })
                  }
                  // onEnter={() => saveChange(edit)}
                />
              </div>
            </>
          ) : (
            ""
          )}
        </main>
        <div>
          <button
            className="button-edit-roles"
            onClick={async () => {
              await updateRoleUserById(data.ID, {
                ...data,
                ...details,
                Salary: +details.Salary,
                plan: +details.plan,
                salary_project: +details.salary_project,
                role_ids: userRoles.map((el) => el.ID),
              });
              setOpenRoles({ open: false, data: null });
            }}
          >
            Подтвердить
          </button>
          <button
            className="button-edit-roles"
            onClick={() => setOpenRoles({ open: false, data: null })}
          >
            Отменить
          </button>
        </div>
      </main>
    </div>
  );
}
