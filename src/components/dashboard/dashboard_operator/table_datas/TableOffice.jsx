import React, { useEffect, useState, useRef } from "react";
import "../../../../styles/components/Table.scss";
import "../../../../styles/components/Office.scss";
import Spinner from "../../../Spinner.jsx";
import { fetchOffices } from "../../../../api/offices/all_offices.js";
import Input from "../../../elements/Input.jsx";

const OfficeTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const inputRef = useRef(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchOffices();
      setData(res || []);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setEdit({ ...edit, [key]: value });
  };

  const saveChange = async (edit) => {
    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${backendURL}/office/${edit.ID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(edit),
      });

      if (!response.ok) throw new Error("Ошибка при обновлении");
      setEdit(null);
    } catch (error) {
      console.error("Ошибка:", error);
    } finally {
      setEdit(null);
    }
  };

  console.log("edit", edit);
  

  return (
    <div className="report-table-container">
      <div
        className="table-reports-div"
        style={{ maxHeight: "calc(100vh - 425px)" }}
      >
        <table className="table-reports">
          <thead>
            <tr>
              <th>Название офиса</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td style={{ textAlign: "center" }}>
                  <Spinner />
                </td>
              </tr>
            )}

            {!loading && data.length > 0
              ? data.map((office) => (
                  <tr
                    key={office.ID}
                    // className={edit?.ID === office.ID ? "row-updated" : ""}
                  >
                    <td onClick={() => !edit && setEdit(office)}>
                      {edit?.ID === office.ID ? (
                        <Input
                          defValue={edit?.title || office.title}
                          ref={inputRef}
                          type="text"
                          value={edit?.title}
                          onChange={(e) => handleChange("title", e)}
                          onEnter={() => saveChange(edit)}
                        />
                      ) : (
                        office.title || "-"
                      )}
                    </td>
                  </tr>
                ))
              : !loading && (
                  <tr>
                    <td style={{ textAlign: "center" }}>Нет данных</td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OfficeTable;
