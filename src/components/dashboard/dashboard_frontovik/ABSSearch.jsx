import React, { useEffect, useState } from "react";
import "../../../styles/ABSSearch.scss";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/ProcessingIntegration.scss";
import AlertMessage from "../../general/AlertMessage.jsx";
import Modal from "../../general/Modal.jsx";
import {
  getUserAccounts,
  getUserCards,
} from "../../../api/ABS_frotavik/getUserCredits.js";

const API_BASE_URL = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;

export default function ABSClientSearch() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [clientsData, setClientsData] = useState([]);
  const [selectedClientIndex, setSelectedClientIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cardsData, setCardsData] = useState([]);
  const [accountsData, setAccountsData] = useState([]);
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Функция для показа уведомления
  const showAlert = (message, type = "success") => {
    setAlert({
      show: true,
      message,
      type,
    });
  };

  // Функция для скрытия уведомления
  const hideAlert = () => {
    setAlert({
      show: false,
      message: "",
      type: "success",
    });
  };

  // Функция для форматирования номера телефона
  const formatPhoneNumber = (value) => {
    return value;
  };

  // Обработка изменения номера телефона
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, "");

    // Сохраняем только цифры в state для отправки
    setPhoneNumber(digitsOnly);
    // Сохраняем форматированный номер для отображения
    setDisplayPhone(formatPhoneNumber(digitsOnly));
  };

  // Функция для очистки всех полей
  const handleClear = () => {
    setPhoneNumber("");
    setDisplayPhone("");
    setClientsData([]);
    setSelectedClientIndex(0);
    setCardsData([]);
    setAccountsData([]);
  };

  // Функция для поиска клиентов в АБС
  const handleSearchClient = async () => {
    if (!phoneNumber) {
      showAlert("Пожалуйста, введите номер телефона", "error");
      return;
    }

    // Форматируем телефонный номер
    let formattedPhone = phoneNumber.trim();

    // Удаляем все нецифровые символы
    formattedPhone = formattedPhone.replace(/\D/g, "");

    try {
      setIsLoading(true);
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `${API_BASE_URL}/client/info?phoneNumber=${formattedPhone}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          showAlert("Клиенты не найдены в АБС", "error");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setClientsData([]);
        return;
      }

      const data = await response.json();
      setClientsData(data);
      setSelectedClientIndex(0);

      if (data.length === 0) {
        showAlert("Клиенты не найдены в АБС", "error");
      } else {
        showAlert(`Найдено клиентов: ${data.length}`, "success");
      }
    } catch (error) {
      console.error("Ошибка при поиске клиента в АБС:", error);
      showAlert("Произошла ошибка при поиске клиента в АБС", "error");
      setClientsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetDataUser = async () => {
    if (!clientsData?.[0]?.client_code) return;
    try {
      const clientCode = clientsData[selectedClientIndex]?.client_code;
      const resCards = await getUserCards(clientCode);
      const resAcc = await getUserAccounts(clientCode);

      setCardsData(resCards || []);
      setAccountsData(resAcc || []);
    } catch (error) {
      console.error("Error fetching user cards/accounts:", error);
      showAlert("Ошибка при получении данных карт/счетов", "error");
    }
  };

  // Функция для копирования значения в буфер обмена
  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showAlert("Скопировано в буфер обмена", "success");
      })
      .catch((err) => {
        console.error("Ошибка копирования: ", err);
        showAlert("Не удалось скопировать", "error");
      });
  };

  // Функция для копирования всех клиентов в JSON
  const copyAllClientsToClipboard = () => {
    copyToClipboard(JSON.stringify(clientsData, null, 2));
  };

  // Функция для копирования выбранного клиента в JSON
  const copySelectedClientToClipboard = () => {
    if (clientsData[selectedClientIndex]) {
      copyToClipboard(
        JSON.stringify(clientsData[selectedClientIndex], null, 2)
      );
    }
  };

  // Получение выбранного клиента
  const selectedClient =
    clientsData.length > 0 ? clientsData[selectedClientIndex] : null;

  // Подготовка данных для таблицы
  const tableData = selectedClient
    ? [
        { label: "Телефон", key: "phone", value: selectedClient.phone },
        { label: "Флаг ARC", key: "arc_flag", value: selectedClient.arc_flag },
        {
          label: "Тип клиента",
          key: "client_type_name",
          value: selectedClient.client_type_name,
        },
        {
          label: "Флаг банковского счета",
          key: "ban_acc_open_flag",
          value: selectedClient.ban_acc_open_flag,
        },
        {
          label: "Код департамента",
          key: "dep_code",
          value: selectedClient.dep_code,
        },
        {
          label: "Код клиента в АБС",
          key: "client_code",
          value: selectedClient.client_code,
        },
        {
          label: "Карты",
          key: "cards",
          value:
            cardsData.length > 0 ? (
              <button
                className="limits-table__action-btn"
                onClick={() => setShowCardsModal(true)}
              >
                Показать ({cardsData.length})
              </button>
            ) : (
              "Нет карт"
            ),
          isAction: true,
        },
        {
          label: "Счета",
          key: "accounts",
          value:
            accountsData.length > 0 ? (
              <button
                className="limits-table__action-btn"
                onClick={() => setShowAccountsModal(true)}
              >
                Показать ({accountsData.length})
              </button>
            ) : (
              "Нет счетов"
            ),
          isAction: true,
        },
        { label: "Фамилия", key: "surname", value: selectedClient.surname },
        { label: "Имя", key: "name", value: selectedClient.name },
        {
          label: "Отчество",
          key: "patronymic",
          value: selectedClient.patronymic,
        },
        {
          label: "Фамилия (латиница)",
          key: "ltn_surname",
          value: selectedClient.ltn_surname,
        },
        {
          label: "Имя (латиница)",
          key: "ltn_name",
          value: selectedClient.ltn_name,
        },
        {
          label: "Отчество (латиница)",
          key: "ltn_patronymic",
          value: selectedClient.ltn_patronymic,
        },
        { label: "ИНН", key: "tax_code", value: selectedClient.tax_code },
        {
          label: "Тип документа",
          key: "identdoc_name",
          value: selectedClient.identdoc_name,
        },
        {
          label: "Серия документа",
          key: "identdoc_series",
          value: selectedClient.identdoc_series,
        },
        {
          label: "Номер документа",
          key: "identdoc_num",
          value: selectedClient.identdoc_num,
        },
        {
          label: "Дата выдачи",
          key: "identdoc_date",
          value: selectedClient.identdoc_date,
        },
        {
          label: "Кем выдан",
          key: "identdoc_orgname",
          value: selectedClient.identdoc_orgname,
        },
        { label: "SV ID", key: "sv_id", value: selectedClient.sv_id },
      ]
    : [];

  useEffect(() => {
    if (selectedClient?.client_code) handleGetDataUser();
  }, [selectedClient?.client_code]);

  return (
    <>
      <div className="block_info_prems" align="center">
        {alert.show && (
          <AlertMessage
            message={alert.message}
            type={alert.type}
            onClose={hideAlert}
            duration={3000}
          />
        )}

        {/* Modal for Cards */}
        <Modal
          isOpen={showCardsModal}
          onClose={() => setShowCardsModal(false)}
          title={`Карты клиента (Всего: ${cardsData.length})`}
        >
          <div className="limits-table__wrapper">
            <table className="limits-table">
              <thead className="limits-table__head">
                <tr>
                  <th className="limits-table__th">ID Карты</th>
                  <th className="limits-table__th">Тип</th>
                  <th className="limits-table__th">Статус</th>
                  <th className="limits-table__th">Срок</th>
                  <th className="limits-table__th">Валюта</th>
                  <th className="limits-table__th">Остаток</th>
                </tr>
              </thead>
              <tbody className="limits-table__body">
                {cardsData.map((card, idx) => (
                  <tr key={idx} className="limits-table__row">
                    <td className="limits-table__td">{card.cardId}</td>
                    <td className="limits-table__td">{card.type}</td>
                    <td className="limits-table__td">{card.statusName}</td>
                    <td className="limits-table__td">{card.expirationDate}</td>
                    <td className="limits-table__td">{card.currency}</td>
                    <td className="limits-table__td">
                      {card.accounts?.[0]?.state || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() =>
                copyToClipboard(JSON.stringify(cardsData, null, 2))
              }
              className="limits-table__action-btn limits-table__action-btn--secondary"
            >
              Копировать JSON карт
            </button>
          </div>
        </Modal>

        {/* Modal for Accounts */}
        <Modal
          isOpen={showAccountsModal}
          onClose={() => setShowAccountsModal(false)}
          title={`Счета клиента (Всего: ${accountsData.length})`}
        >
          <div className="limits-table__wrapper">
            <table className="limits-table">
              <thead className="limits-table__head">
                <tr>
                  <th className="limits-table__th">Номер счета</th>
                  <th className="limits-table__th">Валюта</th>
                  <th className="limits-table__th">Баланс</th>
                  <th className="limits-table__th">Статус</th>
                  <th className="limits-table__th">Дата открытия</th>
                  <th className="limits-table__th">Филиал</th>
                </tr>
              </thead>
              <tbody className="limits-table__body">
                {accountsData.map((acc, idx) => (
                  <tr key={idx} className="limits-table__row">
                    <td className="limits-table__td">{acc.Number}</td>
                    <td className="limits-table__td">{acc.Currency?.Code}</td>
                    <td className="limits-table__td">{acc.Balance}</td>
                    <td className="limits-table__td">{acc.Status?.Name}</td>
                    <td className="limits-table__td">{acc.DateOpened}</td>
                    <td className="limits-table__td">{acc.Branch?.Name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() =>
                copyToClipboard(JSON.stringify(accountsData, null, 2))
              }
              className="limits-table__action-btn limits-table__action-btn--secondary"
            >
              Копировать JSON счетов
            </button>
          </div>
        </Modal>

        <div className="processing-integration">
          <div className="processing-integration__container">
            {/* Заголовок */}
            <div className="processing-integration__header">
              <h1 className="processing-integration__title">
                Поиск клиента в АБС по номеру телефона
              </h1>
            </div>

            {/* Поиск по номеру телефона */}
            <div className="processing-integration__search-card">
              <div className="search-card">
                <div className="search-card__content">
                  <div className="search-card__input-group">
                    <label htmlFor="phoneNumber" className="search-card__label">
                      Номер телефона
                    </label>
                    <input
                      type="text"
                      id="phoneNumber"
                      value={displayPhone}
                      onChange={handlePhoneChange}
                      placeholder="Введите номер телефона"
                      className="search-card__input"
                      maxLength={20}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="search-card__buttons">
                    <button
                      onClick={handleSearchClient}
                      disabled={!phoneNumber || isLoading}
                      className={`search-card__button ${
                        isLoading ? "search-card__button--loading" : ""
                      }`}
                    >
                      {isLoading ? "Поиск..." : "Найти клиента"}
                    </button>
                    <button
                      onClick={handleClear}
                      disabled={isLoading}
                      className="search-card__button search-card__button--secondary"
                    >
                      Очистить
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Если найдено несколько клиентов, показываем селектор */}
            {clientsData.length > 1 && (
              <div className="processing-integration__client-selector">
                <div className="client-selector">
                  <h3 className="client-selector__title">
                    Найдено клиентов: {clientsData.length}
                  </h3>
                  <div className="client-selector__controls">
                    <select
                      value={selectedClientIndex}
                      onChange={(e) =>
                        setSelectedClientIndex(parseInt(e.target.value))
                      }
                      className="client-selector__select"
                    >
                      {clientsData.map((client, index) => (
                        <option key={index} value={index}>
                          {index + 1}. {client.surname} {client.name}{" "}
                          {client.patronymic}
                          {client.tax_code && ` (ИНН: ${client.tax_code})`}
                        </option>
                      ))}
                    </select>
                    <div className="client-selector__navigation">
                      <button
                        onClick={() =>
                          setSelectedClientIndex((prev) =>
                            Math.max(0, prev - 1)
                          )
                        }
                        disabled={selectedClientIndex === 0}
                        className="client-selector__nav-btn client-selector__nav-btn--prev"
                      >
                        ← Предыдущий
                      </button>
                      <button
                        onClick={() =>
                          setSelectedClientIndex((prev) =>
                            Math.min(clientsData.length - 1, prev + 1)
                          )
                        }
                        disabled={
                          selectedClientIndex === clientsData.length - 1
                        }
                        className="client-selector__nav-btn client-selector__nav-btn--next"
                      >
                        Следующий →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Таблица с данными клиента */}
            {selectedClient && (
              <div className="processing-integration__limits-table">
                <div className="limits-table">
                  <div className="limits-table__header">
                    <h2 className="limits-table__title">
                      Данные клиента из АБС
                      {clientsData.length > 1 && (
                        <span className="limits-table__client-counter">
                          (Клиент {selectedClientIndex + 1} из{" "}
                          {clientsData.length})
                        </span>
                      )}
                    </h2>
                    <div className="limits-table__actions">
                      <button
                        onClick={copySelectedClientToClipboard}
                        className="limits-table__action-btn limits-table__action-btn--secondary"
                      >
                        Скопировать JSON клиента
                      </button>
                      {clientsData.length > 1 && (
                        <button
                          onClick={copyAllClientsToClipboard}
                          className="limits-table__action-btn limits-table__action-btn--secondary"
                        >
                          Скопировать JSON всех клиентов
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="limits-table__wrapper">
                    <table className="limits-table">
                      <thead className="limits-table__head">
                        <tr>
                          <th className="limits-table__th limits-table__th--field">
                            Поле
                          </th>
                          <th className="limits-table__th limits-table__th--value">
                            Значение
                          </th>
                          <th className="limits-table__th limits-table__th--actions">
                            Действия
                          </th>
                        </tr>
                      </thead>
                      <tbody className="limits-table__body">
                        {tableData.map((item) => (
                          <tr key={item.key} className="limits-table__row">
                            <td className="limits-table__td limits-table__td--info">
                              <div className="limit-info">
                                <div className="limit-info__name">
                                  {item.label}
                                </div>
                                <div className="limit-info__id">{item.key}</div>
                              </div>
                            </td>
                            <td className="limits-table__td limits-table__td--value">
                              <span className="current-value">
                                {item.value ||
                                  (item.value === 0 ? 0 : "Не указано")}
                              </span>
                            </td>
                            <td className="limits-table__td limits-table__td--actions">
                              <div className="action-buttons">
                                {!item.isAction && (
                                  <button
                                    onClick={() =>
                                      copyToClipboard(item.value || "")
                                    }
                                    className="action-buttons__btn action-buttons__btn--copy"
                                    disabled={!item.value}
                                    title="Скопировать значение"
                                  >
                                    Копировать
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Сводная информация */}
                  <div className="limits-table__footer">
                    <div className="limits-table__stats">
                      <span className="limits-table__stat">
                        ФИО: {selectedClient.surname} {selectedClient.name}{" "}
                        {selectedClient.patronymic}
                      </span>
                      <span className="limits-table__stat">
                        Телефон: {selectedClient.phone}
                      </span>
                      <span className="limits-table__stat">
                        ИНН: {selectedClient.tax_code}
                      </span>
                      <span className="limits-table__stat">
                        Код клиента: {selectedClient.client_code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Индикатор загрузки */}
            {isLoading && (
              <div className="processing-integration__loading">
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Поиск клиента в АБС...</p>
                </div>
              </div>
            )}

            {/* Сообщение об отсутствии данных */}
            {!isLoading && clientsData.length === 0 && phoneNumber && (
              <div className="processing-integration__no-data">
                <div className="no-data-message">
                  <p>По данному номеру телефона клиенты не найдены</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
