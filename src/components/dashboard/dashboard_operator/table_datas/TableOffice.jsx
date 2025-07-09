import React, { useEffect, useState } from 'react';
import '../../../../styles/components/Table.scss';
import '../../../../styles/components/Office.scss';
import Spinner from '../../../Spinner.jsx';
import {fetchOffices} from "../../../../api/offices/all_offices.js";

const OfficeTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetchOffices();
        setData(res || []);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
      <>
        <div className="report-table-container">
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

            {!loading && data.length > 0 ? (
                data.map((office) => (
                    <tr
                        key={office.ID}
                    >
                      <td>{office.title || "-"}</td>
                    </tr>
                ))
            ) : (
                !loading && (
                    <tr>
                      <td style={{ textAlign: "center" }}>
                        Нет данных
                      </td>
                    </tr>
                )
            )}
            </tbody>
          </table>
        </div>
      </>
  );
};

export default OfficeTable;
