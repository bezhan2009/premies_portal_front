import { useEffect, useState } from "react";
import "../../../../styles/components/Table.scss";
import Spinner from "../../../Spinner.jsx";
import SearchBar from "../../../general/SearchBar.jsx";
import { fetchOffices } from "../../../../api/offices/all_offices.js";
import Input from "../../../elements/Input.jsx";
import { fullUpdateWorkers } from "../../../../api/workers/fullUpdateWorkers.js";
import ModalRoles from "../../../modal/ModalRoles.jsx";
const EmployeesTable = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [openRoles, setOpenRoles] = useState({ data: null, open: false });
  const loadData = async () => {
    setLoading(true);
    try {
      const offices = await fetchOffices();
      const users = [];
      offices.forEach((office) => {
        if (office.office_user && office.office_user.length > 0) {
          office.office_user.forEach((u) => {
            users.push({
              ID: u.worker.user.ID,
              officeTitle: office.title,
              fio: u.worker?.user?.full_name || "",
              login: u.worker?.user?.username || "",
              position: u.worker?.position || "",
              placeWork: u.worker?.place_work || "",
              salary: u.worker?.Salary || "",
              group:
                u.worker?.user?.roles?.map((role) => role.Name).join(", ") ||
                "",
            });
          });
        }
      });
      setEmployees(users);
      setFilteredEmployees(users);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);
  const handleChange = (key, value) => {
    setEdit({ ...edit, [key]: value });
  };
  const saveChange = async () => {
    try {
      await fullUpdateWorkers({ ...edit, fio: edit.fio.trim() });
      loadData();
      setEdit({ ID: null });
    } catch (e) {
      console.error(e);
    }
  };
  const handleSearch = (filtered) => {
    setFilteredEmployees(filtered || []);
  };
  console.log("openRoles", openRoles);
  return (
    <div className="report-table-container">
      <SearchBar
        allData={employees}
        onSearch={handleSearch}
        placeholder="Поиск по ФИО или названию офиса..."
        searchFields={[
          (item) => item.fio || "",
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
                    <th>Название офиса</th>
                    <th>ФИО</th>
                    <th>Логин</th>
                    <th>Должность</th>
                    <th>Место работы</th>
                    <th>Оклад</th>
                    <th>Группа продаж</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((row, idx) => (
                    <tr key={idx}>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.officeTitle || row.officeTitle}
                            type="text"
                            value={edit?.officeTitle}
                            onChange={(e) => handleChange("officeTitle", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.officeTitle
                        )}
                      </td>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.fio || row.fio}
                            type="text"
                            value={edit?.fio}
                            onChange={(e) => handleChange("fio", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.fio
                        )}
                      </td>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.login || row.login}
                            type="text"
                            value={edit?.login}
                            onChange={(e) => handleChange("login", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.login
                        )}
                      </td>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.position || row.position}
                            type="text"
                            value={edit?.position}
                            onChange={(e) => handleChange("position", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.position
                        )}
                      </td>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.placeWork || row.placeWork}
                            type="text"
                            value={edit?.placeWork}
                            onChange={(e) => handleChange("placeWork", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.placeWork
                        )}
                      </td>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.salary || row.salary}
                            type="text"
                            value={edit?.salary}
                            onChange={(e) => handleChange("salary", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.salary
                        )}
                      </td>
                      <td onClick={() => setEdit(row)}>
                        {edit?.ID === row.ID ? (
                          <Input
                            defValue={edit?.group || row.group}
                            type="text"
                            value={edit?.group}
                            onChange={(e) => handleChange("group", e)}
                            onEnter={() => saveChange(edit)}
                          />
                        ) : (
                          row.group
                        )}
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
      <ModalRoles
        open={openRoles.open}
        data={openRoles.data}
        setOpenRoles={setOpenRoles}
      />
    </div>
  );
};
export default EmployeesTable;
