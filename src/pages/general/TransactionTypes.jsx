import Input from "./components/elements/Input";
import { useState } from "react";
import Select from "./components/elements/Select";
import { useFormStore } from "./hooks/useFormState";
import { apiClientTransactions } from "./api/utils/apiClientTransactions";

const transactionTypes = [
  { value: "0", label: "Тип транзакции" },
  { value: "1", label: "Снятие" },
  { value: "2", label: "Пополнение" },
  { value: "3", label: "Параметры" },
  { value: "4", label: "Мусор" },
];

const ValidData = {
  type: { required: true },
  name: { required: true },
  number: { required: true },
};

export default function UpdatingTransactionType() {
  const [loading, setLoading] = useState(false);
  // const [data, setData] = useState({});
  const { data, errors, setData, validate } = useFormStore();

  const upDateUserWorkers = async () => {
    const isValid = validate(ValidData);
    if (!isValid) return;
    setLoading(true);
    try {
      const response = await apiClientTransactions.put(
        "/api/Transactions/transaction-type/update",
        { ...data, number: +data?.number, type: +data?.type }
      );
      console.log("response", response);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  console.log("errors", errors);
  console.log("data", data);

  return (
    <div className="updating-transaction-type">
      <main>
        <h2>Обновление типа транзакции</h2>
        <Select
          id={"type"}
          title="Тип транзакции"
          placeholder="Тип транзакции"
          value={data.type || ""}
          options={transactionTypes}
          onChange={(e) => setData("type", e)}
          error={errors}
        />
        <Input
          id={"name"}
          title="Название"
          placeholder="Название"
          type="text"
          defValue={data.name}
          onChange={(e) => setData("name", e)}
          value={data.name}
          onEnter={upDateUserWorkers}
          error={errors}
        />
        <Input
          id={"number"}
          title="Номер"
          placeholder="Номер"
          type="number"
          defValue={data.number}
          onChange={(e) => setData("number", e)}
          value={data.number}
          onEnter={upDateUserWorkers}
          error={errors}
        />
        <button
          onClick={upDateUserWorkers}
          disabled={loading}
          className={loading ? "button-loading" : ""}
        >
          {loading ? <span></span> : "Сохранить"}
        </button>
      </main>
    </div>
  );
}
