import { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Modal } from "antd";
import { useCreditStore } from "../../../store/product/useCredit.store";
import { CreditForm } from "./CreditForm";
import {
  CurrencyTypeDict,
  LoanTypeDict,
} from "../../../domain/product/dictionaries";

export const CreditTable = () => {
  const { credits, fetchCredits, createCredit, updateCredit, deleteCredit } =
    useCreditStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    fetchCredits().catch((err) => {
      console.error("Ошибка загрузки кредитов:", err);
      message.error("Не удалось загрузить кредиты");
    });
  }, [fetchCredits]);

  const handleCreate = () => {
    setEditingCredit(null);
    setModalOpen(true);
  };

  const handleEdit = (credit) => {
    setEditingCredit(credit);
    setModalOpen(true);
  };

  const handleSubmit = async (credit) => {
    setSubmitting(true);
    try {
      if (editingCredit) {
        await updateCredit(editingCredit.id, credit);
        message.success("Кредит обновлён");
      } else {
        await createCredit(credit);
        message.success("Кредит создан");
      }
      await fetchCredits();
      setModalOpen(false);
      setEditingCredit(null);
    } catch (err) {
      console.error("Ошибка сохранения кредита:", err);
      message.error("Не удалось сохранить кредит");
    } finally {
      setSubmitting(false);
    }
  };

  const mappedData = credits.map((c) => ({
    ...c,
    loanTypeLabel: LoanTypeDict[c.loanType],
    currencyLabel: CurrencyTypeDict[c.currency],
    documentsArray: c.documentsRequired || [],
  }));

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys, selectedRows) => {
      setSelectedRowKeys(newSelectedRowKeys);
      if (selectedRows.length > 0) {
        Modal.confirm({
          title: "Подтверждение удаления",
          content: "Вы действительно хотите удалить выбранные кредиты?",
          okText: "Удалить",
          okType: "danger",
          cancelText: "Отмена",
          onOk: async () => {
            try {
              await Promise.all(
                selectedRows.map((row) => deleteCredit(row.id)),
              );
              message.success("Кредиты успешно удалены");
              setSelectedRowKeys([]);
              fetchCredits();
            } catch {
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
          onClick={handleCreate}
          style={{ backgroundColor: "#cf1322", borderColor: "#cf1322" }}
        >
          Новый кредит
        </Button>
      </Space>

      <Table
        dataSource={mappedData}
        rowKey="id"
        rowSelection={rowSelection}
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
        <Table.Column title="Название кредита" dataIndex="name" key="name" />
        <Table.Column
          title="Тип кредита"
          dataIndex="loanTypeLabel"
          key="loanTypeLabel"
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
          title="Мин. срок"
          dataIndex="minTermInMonths"
          key="minTermInMonths"
        />
        <Table.Column
          title="Макс. срок"
          dataIndex="maxTermInMonths"
          key="maxTermInMonths"
        />
        <Table.Column
          title="Процент от"
          dataIndex="interestRateFrom"
          key="interestRateFrom"
        />
        <Table.Column
          title="Процент до"
          dataIndex="interestRateTo"
          key="interestRateTo"
        />
        <Table.Column
          title="Эфф. ставка от"
          dataIndex="effectiveRateFrom"
          key="effectiveRateFrom"
        />
        <Table.Column
          title="Эфф. ставка до"
          dataIndex="effectiveRateTo"
          key="effectiveRateTo"
        />
        <Table.Column
          title="Льготный период"
          dataIndex="gracePeriodMonths"
          key="gracePeriodMonths"
        />
        <Table.Column
          title="Комиссия за досрочное погашение"
          dataIndex="earlyRepaymentFee"
          key="earlyRepaymentFee"
        />
        <Table.Column
          title="Срок обработки заявки"
          dataIndex="applicationProcessingTime"
          key="applicationProcessingTime"
        />
        <Table.Column title="Мин. возраст" dataIndex="ageMin" key="ageMin" />
        <Table.Column title="Макс. возраст" dataIndex="ageMax" key="ageMax" />
        <Table.Column
          title="Доход"
          dataIndex="incomeRequirement"
          key="incomeRequirement"
        />
        <Table.Column
          title="Документы"
          dataIndex="documentsArray"
          key="documentsArray"
          render={(val) =>
            val.length
              ? val.map((d, i) => (
                  <Tag color="cyan" key={i}>
                    {d}
                  </Tag>
                ))
              : null
          }
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
          title="Активен"
          dataIndex="isActive"
          key="isActive"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />
        <Table.Column
          title="Требуется залог"
          dataIndex="collateralRequired"
          key="collateralRequired"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />
        <Table.Column
          title="Требуется страховка"
          dataIndex="insuranceRequired"
          key="insuranceRequired"
          render={(val) =>
            val ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>
          }
        />
        <Table.Column
          title="Дата обновления"
          dataIndex="updateDate"
          key="updateDate"
          render={(val) => (val ? new Date(val).toLocaleString() : "-")}
        />
      </Table>

      <CreditForm
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCredit(null);
        }}
        onSubmit={handleSubmit}
        initialValues={editingCredit || undefined}
        loading={submitting}
      />
    </>
  );
};
