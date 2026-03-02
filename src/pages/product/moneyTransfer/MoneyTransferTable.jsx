import { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Modal } from "antd";
import { useMoneyTransferStore } from "../../../store/product/useMoneyTransfer.store";
import { MoneyTransferForm } from "./MoneyTransferForm";
import {
  TransferTypeDict,
  DirectionTypeDict,
  CurrencyTypeDict,
} from "../../../domain/product/dictionaries";

export const MoneyTransferTable = () => {
  const {
    transfers,
    fetchTransfers,
    createTransfer,
    updateTransfer,
    deleteTransfer,
  } = useMoneyTransferStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleSubmit = async (transfer) => {
    setSubmitting(true);
    try {
      if (editingTransfer) {
        await updateTransfer(editingTransfer.id, transfer);
        message.success("Перевод обновлён");
      } else {
        await createTransfer(transfer);
        message.success("Перевод создан");
      }
      await fetchTransfers();
      setModalOpen(false);
      setEditingTransfer(null);
    } catch {
      message.error("Ошибка сохранения");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (transfer) => {
    setEditingTransfer(transfer);
    setModalOpen(true);
  };

  const mappedData = transfers.map((t) => ({
    ...t,
    transferTypeLabel: TransferTypeDict[t.transferType] || t.transferType,
    directionLabel: DirectionTypeDict[t.direction] || t.direction,
    currencyLabel: CurrencyTypeDict[t.currency] || t.currency,
    currencyToLabel: CurrencyTypeDict[t.currencyTo] || t.currencyTo,
  }));

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys, selectedRows) => {
      setSelectedRowKeys(newSelectedRowKeys);

      if (selectedRows.length > 0) {
        Modal.confirm({
          title: "Подтверждение удаления",
          content:
            "Вы действительно хотите удалить выбранные денежные переводы?",
          okText: "Удалить",
          okType: "danger",
          cancelText: "Отмена",
          onOk: async () => {
            try {
              await Promise.all(
                selectedRows.map((row) => deleteTransfer(row.id)),
              );
              message.success("Денежные переводы успешно удалены");
              setSelectedRowKeys([]);
              fetchTransfers();
            } catch {
              message.error("Ошибка при удалении");
            }
          },
          onCancel: () => setSelectedRowKeys([]),
        });
      }
    },
  };

  return (
    <>
      <Space
        style={{
          width: "100%",
          justifyContent: "flex-start",
          marginBottom: 20,
        }}
      >
        <Button
          type="primary"
          style={{ backgroundColor: "#cf1322", borderColor: "#cf1322" }}
          onClick={() => setModalOpen(true)}
        >
          Новый перевод
        </Button>
      </Space>

      <Table
        dataSource={mappedData}
        rowSelection={rowSelection}
        className="red-pagination"
        rowKey={(r) => r.id}
        bordered
        scroll={{ x: "max-content" }}
        style={{ width: "100%" }}
        pagination={{ pageSize: 10 }}
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
        <Table.Column title="Название перевода" dataIndex="name" key="name" />
        <Table.Column
          title="Тип перевода"
          dataIndex="transferTypeLabel"
          key="transferTypeLabel"
          render={(val) => <Tag color="blue">{val}</Tag>}
        />
        <Table.Column
          title="Направление"
          dataIndex="directionLabel"
          key="directionLabel"
          render={(val) => <Tag color="purple">{val}</Tag>}
        />
        <Table.Column
          title="Валюта"
          dataIndex="currencyLabel"
          key="currencyLabel"
          render={(val) => <Tag color="green">{val}</Tag>}
        />
        <Table.Column
          title="Валюта (получатель)"
          dataIndex="currencyToLabel"
          key="currencyToLabel"
          render={(val) => <Tag color="green">{val}</Tag>}
        />
        <Table.Column
          title="Мин. сумма"
          dataIndex="minAmount"
          key="minAmount"
        />
        <Table.Column
          title="Макс. за транзакцию"
          dataIndex="maxAmountPerTransaction"
          key="maxAmountPerTransaction"
        />
        <Table.Column
          title="Макс. за день"
          dataIndex="maxAmountPerDay"
          key="maxAmountPerDay"
        />
        <Table.Column
          title="Комиссия %"
          dataIndex="feePercent"
          key="feePercent"
        />
        <Table.Column
          title="Фиксированная комиссия"
          dataIndex="feeFixed"
          key="feeFixed"
        />
        <Table.Column
          title="Бесплатные переводы"
          dataIndex="freeTransfersCount"
          key="freeTransfersCount"
        />
        <Table.Column
          title="Время выполнения"
          dataIndex="executionTime"
          key="executionTime"
        />
        <Table.Column
          title="Каналы"
          dataIndex="channels"
          key="channels"
          render={(val) =>
            val?.length
              ? val.map((ch, i) => (
                  <Tag color="cyan" key={i}>
                    {ch}
                  </Tag>
                ))
              : null
          }
        />
        <Table.Column
          title="Активен"
          dataIndex="isActive"
          key="isActive"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />
        <Table.Column
          title="Дата обновления"
          dataIndex="updateDate"
          key="updateDate"
          render={(val) => new Date(val).toLocaleString()}
        />
      </Table>

      <MoneyTransferForm
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTransfer(null);
        }}
        onSubmit={handleSubmit}
        initialValues={editingTransfer || undefined}
        loading={submitting}
      />
    </>
  );
};
