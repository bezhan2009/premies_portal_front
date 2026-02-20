import { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Modal } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useAccountStore } from "../../../store/product/useCurrentAccount.store";
import { CurrentAccountForm } from "./CurrentAccountForm";
import {
  AccountTypeDict,
  CurrencyTypeDict,
} from "../../../domain/product/dictionaries";

export const CurrentAccountTable = () => {
  const {
    accounts,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useAccountStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const successMessage = (text) => {
    message.open({
      content: text,
      type: "success",
      icon: <CheckCircleOutlined />,
      duration: 3,
    });
  };

  const errorMessage = (text) => {
    message.open({
      content: text,
      type: "error",
      icon: <CloseCircleOutlined />,
      duration: 3,
    });
  };

  const handleSubmit = async (account) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateAccount(editing.id, account);
        successMessage("Счет обновлен");
      } else {
        await createAccount(account);
        successMessage("Счет создан");
      }

      await fetchAccounts();
      setModalOpen(false);
      setEditing(null);
    } catch {
      errorMessage("Ошибка сохранения");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (account) => {
    setEditing(account);
    setModalOpen(true);
  };

  const mappedData = accounts.map((a) => ({
    ...a,
    accountTypeLabel: AccountTypeDict[a.accountType],
    currencyLabel: CurrencyTypeDict[a.currency],
  }));

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys, selectedRows) => {
      setSelectedRowKeys(newSelectedRowKeys);

      if (selectedRows.length > 0) {
        Modal.confirm({
          title: "Подтверждение удаления",
          content: "Вы действительно хотите удалить выбранные текущий счёт?",
          okText: "Удалить",
          okType: "danger",
          cancelText: "Отмена",
          onOk: async () => {
            try {
              await Promise.all(
                selectedRows.map((row) => deleteAccount(row.id)),
              );
              message.success("Текущий счёт успешно удалены");
              setSelectedRowKeys([]);
              fetchAccounts();
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
          onClick={() => setModalOpen(true)}
          style={{ backgroundColor: "#cf1322", borderColor: "#cf1322" }}
        >
          Новый счет
        </Button>
      </Space>

      <Table
        dataSource={mappedData}
        rowSelection={rowSelection}
        className="red-pagination"
        rowKey={(r) => r.id}
        bordered
        style={{ width: "100%" }}
        scroll={{ x: "max-content" }}
        onRow={(record) => ({
          onClick: (event) => {
            const isCheckbox = event.target.closest(
              ".ant-table-selection-column",
            );
            if (!isCheckbox) {
              handleEdit(record);
            }
          },
        })}
      >
        <Table.Column title="ID" dataIndex="id" />
        <Table.Column title="ID Банка" dataIndex="bankId" />
        <Table.Column title="Название счета" dataIndex="name" />
        <Table.Column
          title="Тип счета"
          dataIndex="accountTypeLabel"
          render={(val) => <Tag color="blue">{val}</Tag>}
        />
        <Table.Column
          title="Валюта"
          dataIndex="currencyLabel"
          render={(val) => <Tag color="green">{val}</Tag>}
        />
        <Table.Column title="Открытие" dataIndex="openingFee" />
        <Table.Column title="Ежемесячная" dataIndex="monthlyFee" />
        <Table.Column title="Процент" dataIndex="interestOnBalance" />
        <Table.Column
          title="Овердрафт"
          dataIndex="overdraftAllowed"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />
        <Table.Column title="Ставка овердрафта" dataIndex="overdraftRate" />
        <Table.Column
          title="Бесплатные переводы"
          dataIndex="freeTransfersCount"
        />
        <Table.Column
          title="Онлайн открытие"
          dataIndex="onlineOpening"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />
        <Table.Column
          title="Активен"
          dataIndex="isActive"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />
        <Table.Column
          title="Дата обновления"
          dataIndex="updateDate"
          render={(val) => (val ? new Date(val).toLocaleString() : "-")}
        />
      </Table>

      <CurrentAccountForm
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        initialValues={editing || undefined}
        loading={submitting}
      />
    </>
  );
};
