import { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Modal } from "antd";
import { useCardStore } from "../../../store/product/useCard.store";
import { CardForm } from "./CardForm";
import {
  CardTypeDict,
  CurrencyTypeDict,
} from "../../../domain/product/dictionaries";

export const CardTable = () => {
  const { cards, fetchCards, createCard, updateCard, deleteCard } =
    useCardStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleCreate = () => {
    setEditingCard(null);
    setModalOpen(true);
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setModalOpen(true);
  };

  const handleSubmit = async (card) => {
    setSubmitting(true);
    try {
      if (editingCard) {
        console.log("Payload для update:", card);
        await updateCard(editingCard.id, card);
        message.success("Карта успешно обновлена");
      } else {
        await createCard(card);
        message.success("Карта успешно создана");
      }
      await fetchCards();
      setModalOpen(false);
      setEditingCard(null);
    } catch (err) {
      console.error("Ошибка при создании/обновлении карты:", err);
      message.error("Не удалось сохранить карту");
    } finally {
      setSubmitting(false);
    }
  };

  const mappedData = cards.map((c) => ({
    ...c,
    cardTypeLabel: CardTypeDict[c.cardType] || c.cardType,
    currencyLabel: CurrencyTypeDict[c.currency] || c.currency,
  }));

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys, selectedRows) => {
      setSelectedRowKeys(newSelectedRowKeys);

      if (selectedRows.length > 0) {
        Modal.confirm({
          title: "Подтверждение удаления",
          content: "Вы действительно хотите удалить выбранные карты?",
          okText: "Удалить",
          okType: "danger",
          cancelText: "Отмена",
          onOk: async () => {
            try {
              await Promise.all(selectedRows.map((row) => deleteCard(row.id)));
              message.success("Карты успешно удалены");
              setSelectedRowKeys([]);
              fetchCards();
            } catch (error) {
              message.error("Ошибка при удалении");
            }
          },
          onCancel: () => {
            setSelectedRowKeys([]);
          },
        });
      }
    },
  };

  return (
    <>
      <Space
        style={{ width: "100%", justifyContent: "flex-end", marginBottom: 16 }}
      >
        <Button
          type="primary"
          style={{ backgroundColor: "#cf1322", borderColor: "#cf1322" }}
          onClick={handleCreate}
        >
          Новая карта
        </Button>
      </Space>

      <div className="custom-scroll">
        <Table
          rowSelection={rowSelection}
          className="red-pagination"
          dataSource={mappedData}
          rowKey={(r) => r.id}
          bordered
          style={{ width: "100%" }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content" }}
          onRow={(record) => ({
            onClick: (event) => {
              const isCheckbox = event.target.closest(
                ".ant-table-selection-column",
              );
              if (!isCheckbox) handleEdit(record);
            },
          })}
        >
          <Table.Column title="ID" dataIndex="id" key="id" />
          <Table.Column title="ID Банка" dataIndex="bankId" key="bankId" />
          <Table.Column title="Название карты" dataIndex="name" key="name" />
          <Table.Column
            title="Тип карты"
            dataIndex="cardTypeLabel"
            key="cardTypeLabel"
            render={(val) => <Tag color="blue">{val}</Tag>}
          />
          <Table.Column
            title="Платёжная система"
            dataIndex="paymentSystem"
            key="paymentSystem"
            render={(val) => <Tag color="yellow">{val}</Tag>}
          />
          <Table.Column
            title="Валюта"
            dataIndex="currencyLabel"
            key="currencyLabel"
            render={(val) => <Tag color="green">{val}</Tag>}
          />
          <Table.Column
            title="Стоимость выпуска"
            dataIndex="issuanceFee"
            key="issuanceFee"
          />
          <Table.Column
            title="Годовая комиссия"
            dataIndex="annualFee"
            key="annualFee"
          />
          <Table.Column
            title="Снятие (свой ATM)"
            dataIndex="withdrawalFeeOwnAtm"
            key="withdrawalFeeOwnAtm"
          />
          <Table.Column
            title="Снятие (другой банк)"
            dataIndex="withdrawalFeeOtherAtm"
            key="withdrawalFeeOtherAtm"
          />
          <Table.Column
            title="Снятие (за границей)"
            dataIndex="withdrawalFeeInterAtm"
            key="withdrawalFeeInterAtm"
          />
          <Table.Column
            title="Перевод"
            dataIndex="transferFee"
            key="transferFee"
          />
          <Table.Column
            title="SMS информирование"
            dataIndex="smsInformingFee"
            key="smsInformingFee"
          />
          <Table.Column
            title="Мин. кредитный лимит"
            dataIndex="creditLimitMin"
            key="creditLimitMin"
          />
          <Table.Column
            title="Макс. кредитный лимит"
            dataIndex="creditLimitMax"
            key="creditLimitMax"
          />
          <Table.Column
            title="Процент на остаток"
            dataIndex="interestOnBalance"
            key="interestOnBalance"
          />
          <Table.Column
            title="Льготный период (дни)"
            dataIndex="gracePeriodDays"
            key="gracePeriodDays"
          />
          <Table.Column
            title="Категории кешбэка"
            dataIndex="cashbackCategories"
            key="cashbackCategories"
          />

          <Table.Column
            title="Онлайн заявка"
            dataIndex="onlineApplication"
            key="onlineApplication"
            render={(val) =>
              val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
            }
          />
          <Table.Column
            title="Доставка доступна"
            dataIndex="deliveryAvailable"
            key="deliveryAvailable"
            render={(val) =>
              val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
            }
          />
          <Table.Column
            title="Настраиваемые лимиты"
            dataIndex="customizableLimits"
            key="customizableLimits"
            render={(val) =>
              val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
            }
          />
          <Table.Column
            title="Активна"
            dataIndex="isActive"
            key="isActive"
            render={(val) =>
              val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
            }
          />

          {/* Лимиты снятия */}
          <Table.Column
            title="Суточное снятие свой ATM"
            dataIndex="dailyCashWithdrawalOwnAtmLimit"
            key="dailyCashWithdrawalOwnAtmLimit"
          />
          <Table.Column
            title="Суточное снятие другой банк"
            dataIndex="dailyCashWithdrawalDomesticOtherAtmLimit"
            key="dailyCashWithdrawalDomesticOtherAtmLimit"
          />
          <Table.Column
            title="Суточное снятие за границей"
            dataIndex="dailyCashWithdrawalAbroadAtmLimit"
            key="dailyCashWithdrawalAbroadAtmLimit"
          />
          <Table.Column
            title="Месячное снятие свой ATM"
            dataIndex="monthlyCashWithdrawalOwnAtmLimit"
            key="monthlyCashWithdrawalOwnAtmLimit"
          />
          <Table.Column
            title="Месячное снятие другой банк"
            dataIndex="monthlyCashWithdrawalDomesticOtherAtmLimit"
            key="monthlyCashWithdrawalDomesticOtherAtmLimit"
          />
          <Table.Column
            title="Месячное снятие за границей"
            dataIndex="monthlyCashWithdrawalAbroadAtmLimit"
            key="monthlyCashWithdrawalAbroadAtmLimit"
          />

          {/* POS лимиты */}
          <Table.Column
            title="Суточные покупки (дом.)"
            dataIndex="dailyPosPurchaseDomesticLimit"
            key="dailyPosPurchaseDomesticLimit"
          />
          <Table.Column
            title="Суточные покупки (зар.)"
            dataIndex="dailyPosPurchaseAbroadLimit"
            key="dailyPosPurchaseAbroadLimit"
          />
          <Table.Column
            title="Месячные покупки (дом.)"
            dataIndex="monthlyPosPurchaseDomesticLimit"
            key="monthlyPosPurchaseDomesticLimit"
          />
          <Table.Column
            title="Месячные покупки (зар.)"
            dataIndex="monthlyPosPurchaseAbroadLimit"
            key="monthlyPosPurchaseAbroadLimit"
          />

          {/* Онлайн и общий */}
          <Table.Column
            title="Суточные покупки онлайн"
            dataIndex="dailyOnlinePurchaseLimit"
            key="dailyOnlinePurchaseLimit"
          />
          <Table.Column
            title="Месячные покупки онлайн"
            dataIndex="monthlyOnlinePurchaseLimit"
            key="monthlyOnlinePurchaseLimit"
          />
          <Table.Column
            title="Суточные траты"
            dataIndex="dailyTotalSpendingLimit"
            key="dailyTotalSpendingLimit"
          />
          <Table.Column
            title="Месячные траты"
            dataIndex="monthlyTotalSpendingLimit"
            key="monthlyTotalSpendingLimit"
          />

          <Table.Column
            title="Дата обновления"
            dataIndex="updateDate"
            key="updateDate"
            render={(val) => new Date(val).toLocaleString()}
          />
        </Table>
      </div>

      <CardForm
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCard(null);
        }}
        onSubmit={handleSubmit}
        initialValues={editingCard || undefined}
        loading={submitting}
      />
    </>
  );
};
