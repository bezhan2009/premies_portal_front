import { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Modal } from "antd";
import { useDepositStore } from "../../../store/product/useDeposit.store";
import { DepositForm } from "./DepositForm";
import {
  DepositTypeDict,
  CurrencyTypeDict,
  CapitalizationTypeDict,
} from "../../../domain/product/dictionaries";

export const DepositTable = () => {
  const {
    deposits,
    fetchDeposits,
    createDeposit,
    updateDeposit,
    deleteDeposit,
  } = useDepositStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const handleEdit = (deposit) => {
    setEditingDeposit(deposit);
    setModalOpen(true);
  };

  const handleSubmit = async (deposit) => {
    setSubmitting(true);
    try {
      if (editingDeposit) {
        await updateDeposit(editingDeposit.id, deposit);
        message.success("Депозит обновлён");
      } else {
        await createDeposit(deposit);
        message.success("Депозит создан");
      }
      await fetchDeposits();
      setModalOpen(false);
      setEditingDeposit(null);
    } catch {
      message.error("Ошибка сохранения");
    } finally {
      setSubmitting(false);
    }
  };

  const mappedData = deposits.map((d) => ({
    ...d,
    depositTypeLabel: DepositTypeDict[d.depositType] || d.depositType,
    currencyLabel: CurrencyTypeDict[d.currency] || d.currency,
    capitalizationLabel:
      CapitalizationTypeDict[d.capitalization] || d.capitalization,
  }));

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys, selectedRows) => {
      setSelectedRowKeys(newSelectedRowKeys);

      if (selectedRows.length > 0) {
        Modal.confirm({
          title: "Подтверждение удаления",
          content: "Вы действительно хотите удалить выбранные депозиты?",
          okText: "Удалить",
          okType: "danger",
          cancelText: "Отмена",
          onOk: async () => {
            try {
              await Promise.all(
                selectedRows.map((row) => deleteDeposit(row.id)),
              );
              message.success("Депозит успешно удалены");
              setSelectedRowKeys([]);
              fetchDeposits();
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
        style={{ width: "100%", justifyContent: "flex-end", marginBottom: 16 }}
      >
        <Button
          type="primary"
          onClick={() => setModalOpen(true)}
          style={{ backgroundColor: "#cf1322", borderColor: "#cf1322" }}
        >
          Новый депозит
        </Button>
      </Space>

      <Table
        dataSource={mappedData}
        rowSelection={rowSelection}
        rowKey={(r) => r.id}
        bordered
        scroll={{ x: "max-content" }}
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
        <Table.Column title="Название депозита" dataIndex="name" key="name" />

        <Table.Column
          title="Тип депозита"
          dataIndex="depositTypeLabel"
          key="depositTypeLabel"
          render={(val) => <Tag color="blue">{val}</Tag>}
        />

        <Table.Column
          title="Валюта"
          dataIndex="currencyLabel"
          key="currencyLabel"
          render={(val) => <Tag color="green">{val}</Tag>}
        />

        <Table.Column
          title="Мин. сумма"
          dataIndex="minAmount"
          key="minAmount"
        />
        <Table.Column
          title="Макс. сумма"
          dataIndex="maxAmount"
          key="maxAmount"
        />
        <Table.Column
          title="Срок (мес)"
          dataIndex="termInMonths"
          key="termInMonths"
        />
        <Table.Column
          title="Ставка %"
          dataIndex="interestRate"
          key="interestRate"
        />

        <Table.Column
          title="Плавающая ставка"
          dataIndex="interestRateVariable"
          key="interestRateVariable"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />

        <Table.Column
          title="Капитализация"
          dataIndex="capitalizationLabel"
          key="capitalizationLabel"
          render={(val) => <Tag color="purple">{val}</Tag>}
        />

        <Table.Column
          title="Пополнение"
          dataIndex="replenishmentAllowed"
          key="replenishmentAllowed"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />

        <Table.Column
          title="Частичное снятие"
          dataIndex="partialWithdrawalAllowed"
          key="partialWithdrawalAllowed"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />

        <Table.Column
          title="Автопролонгация"
          dataIndex="autoProlongation"
          key="autoProlongation"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />

        <Table.Column
          title="Штраф досрочного снятия"
          dataIndex="earlyWithdrawalPenalty"
          key="earlyWithdrawalPenalty"
        />

        <Table.Column
          title="Страхование"
          dataIndex="insurance"
          key="insurance"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />

        <Table.Column
          title="Онлайн открытие"
          dataIndex="onlineOpening"
          key="onlineOpening"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
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

      <DepositForm
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDeposit(null);
        }}
        onSubmit={handleSubmit}
        initialValues={editingDeposit || undefined}
        loading={submitting}
      />
    </>
  );
};
