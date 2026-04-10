import React from "react";
import {
  MdOutlinePhonelinkErase,
  MdOutlinePhonelinkRing,
  MdOutlineSmartphone,
} from "react-icons/md";
import { FaTelegramPlane } from "react-icons/fa";
import { TYPE_SEARCH_CLIENT } from "../../../const/defConst.js";
import Select from "../../elements/Select";
import "../../../styles/components/ClientDocuments.scss";

const SearchForm = ({
  selectTypeSearchClient,
  setSelectTypeSearchClient,
  displayPhone,
  handlePhoneChange,
  isLoading,
  handleSearchClient,
  handleClear,
  phoneNumber,
  isMobile,
  telegramLoading,
  telegramData,
  handleDeleteTelegram,
  telegramDeleteLoading,
  clientPhotoUrl,
  clientPhotoLoading,
  onOpenClientPhoto,
  onOpenClientDocuments,
  documentsCount = 0,
  selectedClientINN,
}) => {
  return (
    <div className="processing-integration__search-card">
      <div className="search-card">
        <div className="search-card__content">
          <div className="search-card__select-group">
            <Select
                id="searchType"
                options={TYPE_SEARCH_CLIENT}
                value={selectTypeSearchClient}
                onChange={(e) => {
                  setSelectTypeSearchClient(e);
                }}
                disabled={isLoading}
            />
          </div>

          <div className="search-card__mobile-group">
            {isMobile ? (
              <>
                <MdOutlinePhonelinkRing color="#4ee14e" size={"30px"} />
                счет: {isMobile?.Iban || "000"}
              </>
            ) : isMobile !== null ? (
              <>
                <MdOutlinePhonelinkErase color="#e21a1c" size={"30px"} />
                Не подключен к мобильному банку
              </>
            ) : (
              <MdOutlineSmartphone size={"30px"} />
            )}
          </div>

          <div className="search-card__telegram-group">
            {telegramLoading ? (
              <span style={{ fontSize: "13px", color: "#999" }}>
                Проверка Telegram...
              </span>
            ) : telegramData?.userTelegramId ? (
              <>
                <FaTelegramPlane
                  color="#0088cc"
                  size={"28px"}
                  title="Пользователь в Telegram"
                />
                <button
                  className="search-card__button search-card__button--danger"
                  onClick={handleDeleteTelegram}
                  disabled={telegramDeleteLoading}
                  style={{
                    marginLeft: "8px",
                    fontSize: "12px",
                    padding: "4px 10px",
                  }}
                >
                  {telegramDeleteLoading ? "Удаление..." : "Удалить Telegram"}
                </button>
              </>
            ) : telegramData !== null || (displayPhone && !telegramLoading) ? (
              <FaTelegramPlane
                color="#e21a1c"
                size={"28px"}
                title="Пользователь не найден в Telegram"
              />
            ) : null}
          </div>

          <div className="search-card__input-group">
            <input
              type="text"
              id="phoneNumber"
              value={displayPhone}
              onChange={handlePhoneChange}
              placeholder={
                "Введите " +
                TYPE_SEARCH_CLIENT.find(
                  (e) => e.value === selectTypeSearchClient,
                )?.inputLabel.toLocaleLowerCase()
              }
              className="search-card__input"
              maxLength={20}
              onKeyDown={(e) => {
                if (e.key === "Enter" && phoneNumber) {
                  handleSearchClient();
                }
              }}
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

          {selectedClientINN && (
            <div className="search-card__photo-group">
              <button
                type="button"
                className="search-card__photo-button"
                onClick={onOpenClientPhoto}
                disabled={!clientPhotoUrl}
                title={
                  clientPhotoUrl
                    ? "Посмотреть фото клиента"
                    : "Фото клиента не найдено"
                }
              >
                {clientPhotoLoading ? (
                  <div className="search-card__photo-placeholder">Загрузка...</div>
                ) : clientPhotoUrl ? (
                  <img
                    src={clientPhotoUrl}
                    alt="Фото клиента"
                    className="search-card__photo"
                  />
                ) : (
                  <div className="search-card__photo-placeholder">Фото не найдено</div>
                )}
              </button>

              <div className="search-card__photo-meta">
                <div className="search-card__photo-title">Лицо клиента</div>
                <div className="search-card__photo-description">
                  ИНН: {selectedClientINN}
                  <br />
                  Документов найдено: {documentsCount}
                </div>
                <button
                  type="button"
                  className="search-card__documents-button"
                  onClick={onOpenClientDocuments}
                  disabled={clientPhotoLoading && !documentsCount}
                >
                  Посмотреть документы клиента
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
