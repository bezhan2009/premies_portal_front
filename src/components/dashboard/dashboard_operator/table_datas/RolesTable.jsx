import React, { useEffect, useState } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import { fetchOffices } from "../../../../api/offices/all_offices.js";
import { translate_role_id } from "../../../../api/utils/translate_role_id.js";
import Input from "../../../elements/Input.jsx";
import { fullUpdateWorkers } from "../../../../api/workers/FullUpdateWorkers.js";
import ModalRoles from "../../../modal/ModalRoles.jsx";
import { getAllUsers } from "../../../../api/users/get_user.js";

const RolesTable = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [openRoles, setOpenRoles] = useState({ data: null, open: false });
  const loadData = async ({ res = false }) => {
    setLoading(true);
    try {
      const { users } = await getAllUsers({
        after: res ? null : employees?.[employees?.length - 1]?.ID,
      });
      if (res) {
        setEmployees((prev) => [...prev, ...users]);
        setFilteredEmployees((prev) => [...prev, ...users]);
      } else {
        setEmployees(users);
        setFilteredEmployees(users);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData({ res: false });
  }, []);

  const handleChange = (key, value) => {
    setEdit({ ...edit, [key]: value });
  };

  const saveChange = async () => {
    try {
      await fullUpdateWorkers({ ...edit, full_name: edit.full_name.trim() });
      loadData({ res: true });
      setEdit({ ID: null });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = (filtered) => {
    setFilteredEmployees(filtered || []);
  };

  console.log("employees", employees);

  return (
    <div className="report-table-container">
      <SearchBar
        allData={employees}
        onSearch={handleSearch}
        placeholder="Поиск по ФИО или названию офиса..."
        searchFields={[
          (item) => item.full_name || "",
          (item) => item.officeTitle || "",
        ]}
      />

      {loading ? (
        <Spinner />
      ) : (
        <>
          {filteredEmployees && filteredEmployees.length > 0 ? (
            <div
              className="table-reports-div"
              style={{ maxHeight: " calc(100vh - 480px)" }}
            >
              <table className="table-reports">
                <thead>
                  <tr>
                    {/* <th>Название офиса</th> */}
                    <th>ФИО</th>
                    <th>Логин</th>
                    <th>Номер телефона</th>
                    <th>Email</th>
                    <th>Перераспределение ролей</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((row, idx) => (
                    <tr key={idx}>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.full_name || row.full_name}
                            type="text"
                            value={edit?.full_name}
                            onChange={(e) => handleChange("full_name", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.full_name
                        )}
                      </td>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.username || row.username}
                            type="text"
                            value={edit?.username}
                            onChange={(e) => handleChange("username", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.username
                        )}
                      </td>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.phone || row.phone}
                            type="text"
                            value={edit?.phone}
                            onChange={(e) => handleChange("phone", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.phone
                        )}
                      </td>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.email || row.email}
                            type="text"
                            value={edit?.email}
                            onChange={(e) => handleChange("email", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.email
                        )}
                      </td>
                      <td>
                        <button
                          className="button-edit-roles"
                          onClick={() =>
                            setOpenRoles({ data: row, open: true })
                          }
                        >
                          Перераспределить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <h2>Нет данных</h2>
          )}
        </>
      )}
      {openRoles.open && (
        <ModalRoles data={openRoles.data} setOpenRoles={setOpenRoles} />
      )}
    </div>
  );
};

export default RolesTable;
