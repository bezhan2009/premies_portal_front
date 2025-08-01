import React, { useState } from 'react';
import '../../../../styles/components/Table.scss';
import ReportsContent from "./ReportContent.jsx";

const ApplicationReport = () => {
    const initialData = [
        {
            id: "75746346",
            status: "Статус",
            comment: "Комментарий",
            fio: "ФИО",
            turnover: "Оборот",
            cardType: "Тип карты",
            document: "Документ",
            inn: "ИНН",
            address: "Адрес",
            card: "Карта",
            turnoverPoint: "Скважина оборота",
            turnoverDetails: "Детали оборота",
            date: "01.02.2024"
        },
        {
            id: "9677272",
            status: "Статус",
            comment: "Комментарий",
            fio: "Иван Иван",
            turnover: "Муж",
            cardType: "Visa Gold",
            document: "Российский",
            inn: "123456789",
            address: "Москва, ул. Ленина, д. 1",
            card: "1234 5678 9012 3456",
            turnoverPoint: "Скважина 1",
            turnoverDetails: "Детали 1",
            date: ""
        },
        // Add more data entries as needed
    ];

    const [checkedStates, setCheckedStates] = useState(
        initialData.map(() => false)
    );

    const handleHeaderCheckboxChange = (e) => {
        const newCheckedState = e.target.checked;
        setCheckedStates(initialData.map(() => newCheckedState));
    };

    const handleRowCheckboxChange = (index) => (e) => {
        const newCheckedStates = [...checkedStates];
        newCheckedStates[index] = e.target.checked;
        setCheckedStates(newCheckedStates);

        // Update "select all" checkbox if not all are checked
        const allChecked = newCheckedStates.every(Boolean);
        if (allChecked !== checkedStates.every(Boolean)) {
            setCheckedStates(newCheckedStates);
        }
    };

    return (
        <>
            <div className="report-table-container">
                <h2>Заявки</h2>
                <table className="table-reports">
                    <thead>
                    <tr>
                        <th>
                            <div className="checkbox-wrapper">
                                <input
                                    type="checkbox"
                                    checked={checkedStates.every(Boolean)}
                                    onChange={handleHeaderCheckboxChange}
                                />
                                <span className="tooltip">Выбрать все</span>
                            </div>
                        </th>
                        <th>ID</th>
                        <th>Статус</th>
                        <th>Комментарий</th>
                        <th>ФИО</th>
                        <th>Оборот</th>
                        <th>Тип карты</th>
                        <th>Документ</th>
                        <th>ИНН</th>
                        <th>Адрес</th>
                        <th>Карта</th>
                        <th>Скважина оборота</th>
                        <th>Детали оборота</th>
                        <th>Дата</th>
                    </tr>
                    </thead>
                    <tbody>
                    {initialData.map((item, index) => (
                        <tr key={index}>
                            <td>
                                <div className="checkbox-wrapper">
                                    <input
                                        type="checkbox"
                                        checked={checkedStates[index]}
                                        onChange={handleRowCheckboxChange(index)}
                                    />
                                    <span className="tooltip">Выбрать</span>
                                </div>
                            </td>
                            <td>{item.id || ""}</td>
                            <td>{item.status || ""}</td>
                            <td>{item.comment || ""}</td>
                            <td>{item.fio || ""}</td>
                            <td>{item.turnover || ""}</td>
                            <td>{item.cardType || ""}</td>
                            <td>{item.document || ""}</td>
                            <td>{item.inn || ""}</td>
                            <td>{item.address || ""}</td>
                            <td>{item.card || ""}</td>
                            <td>{item.turnoverPoint || ""}</td>
                            <td>{item.turnoverDetails || ""}</td>
                            <td>{item.date || ""}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default ApplicationReport;
