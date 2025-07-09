import React, { useEffect, useState } from 'react';
import '../../../../styles/components/Table.scss';
import Spinner from '../../../Spinner.jsx';
import SearchBar from '../../../general/SearchBar.jsx';
import {fetchOffices} from "../../../../api/offices/all_offices.js";
import {translate_role_id} from "../../../../api/utils/translate_role_id.js";

const EmployeesTable = () => {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const offices = await fetchOffices();

                const users = [];
                offices.forEach((office) => {
                    if (office.office_user && office.office_user.length > 0) {
                        office.office_user.forEach((u) => {
                            users.push({
                                officeTitle: office.title,
                                fio: u.worker?.user?.full_name || '',
                                login: u.worker?.user?.Username || '',
                                position: u.worker?.position || '',
                                placeWork: u.worker?.place_work || '',
                                salary: u.worker?.Salary || '',
                                group: translate_role_id(u.worker?.user.role_id) ,
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

        loadData();
    }, []);

    const handleSearch = (filtered) => {
        setFilteredEmployees(filtered || []);
    };

    return (
        <div className="report-table-container">
            <SearchBar
                allData={employees}
                onSearch={handleSearch}
                placeholder="Поиск по ФИО или названию офиса..."
                searchFields={[
                    (item) => item.fio || "",
                    (item) => item.officeTitle || ""
                ]}
            />

            {loading ? (
                <Spinner />
            ) : (
                <>
                    {(filteredEmployees && filteredEmployees.length > 0) ? (
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
                                    <td>{row.officeTitle}</td>
                                    <td>{row.fio}</td>
                                    <td>{row.login}</td>
                                    <td>{row.position}</td>
                                    <td>{row.placeWork}</td>
                                    <td>{row.salary}</td>
                                    <td>{row.group}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <h2>Нет данных</h2>
                    )}
                </>
            )}
        </div>
    );
};

export default EmployeesTable;
