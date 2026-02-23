import RadioSelect from "../../components/elements/RadioSelect";
import { depositCurrency } from "../../const/defConst";
import card from "../../assets/card.jpg";
import download from "../../assets/download.jpg";
import share from "../../assets/share.jpg";
import save from "../../assets/save.jpg";
import { useFormStore } from "../../hooks/useFormState";
import File from "../../components/elements/File";
import CheckBox from "../../components/elements/CheckBox";
import Input from "../../components/elements/Input";
import Select from "../../components/elements/Select";
import HeaderAgent from "../../components/dashboard/dashboard_agent/MenuAgent.jsx";
import { useEffect, useState } from "react";
// import { getApplicationById } from "../../api/application/getApplicationById.js";
import { useNavigate, useParams } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
// import { formaterDate } from "../../api/utils/formateDate.js";
import HeaderDipozit from "../../components/dashboard/dashboard_dipozit/MenuDipozit.jsx";
import { apiClientApplicationDipozit } from "../../api/utils/apiClientApplicationDipozit.js";
import useSidebar from "../../hooks/useSideBar.js";
import Sidebar from "../../components/general/DynamicMenu.jsx";

export default function GiftCardDipozit({ edit = false }) {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [loading, setLoading] = useState(false);
  const { data, errors, setData, validate, setDataMore } = useFormStore();
  const navigate = useNavigate();
  const { id } = useParams();

  const ValidData = {
    client_code: { required: true },
    is_capitalize: { required: true },
    accrued_account: { required: true },
  };

  // const formatDateForBackend = (dateStr) => {
  //   if (!dateStr) return "";
  //   // Преобразует "2025-08-04" в ISO формат "2025-08-04T00:00:00Z"
  //   return new Date(dateStr).toISOString();
  // };

  const onSend = async () => {
    const isValid = validate(ValidData);
    if (!isValid) return;

    try {
      if (edit) {
        const response = apiClientApplicationDipozit.put(`deposits/${id}`, {
          ...data,
          deposit_term_month: +data?.deposit_term_month,
          sum_of_deposit: +data?.sum_of_deposit,
        });

        const result = await response;
        console.log("Успешно отправлено:", result);
        // setDataClear();
        alert("Данные успешно сохранены!");
        navigate(0);
      } else {
        const response = apiClientApplicationDipozit.post(`deposits`, {
          ...data,
          deposit_term_month: +data?.deposit_term_month,
          sum_of_deposit: +data?.sum_of_deposit,
        });

        const result = await response;
        console.log("Успешно отправлено:", result);
        // setDataClear();
        navigate(0);
        alert("Данные успешно сохранены!");
      }
    } catch (error) {
      console.error("Ошибка отправки:", error);
      alert("Произошла ошибка при сохранении данных");
    }
  };

  const getData = async () => {
    if (edit) {
      try {
        setLoading(true);
        console.log("edit id", id);

        const res = await apiClientApplicationDipozit(`/deposits/${id}`);
        const data = res.data;
        setDataMore({
          ...data,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  console.log("data", data);

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      <div
        className={`dashboard-container ${
          isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
        }`}
      >
        <Sidebar
          activeLink="gift_deposit"
          isOpen={isSidebarOpen}
          toggle={toggleSidebar}
        />
        <div className="gift-card content-page">
          {loading ? (
            <Spinner />
          ) : (
            <main>
              <div className="content-form">
                <Input
                  className={"div1"}
                  placeholder={"Код клиента"}
                  onChange={(e) => setData("client_code", e)}
                  value={data?.client_code}
                  error={errors}
                  id={"client_code"}
                />
                <CheckBox
                  yes={"Да"}
                  no={"Нет"}
                  className={"div2 form-check-box"}
                  title={"Капитал"}
                  value={data.is_capitalize}
                  onChange={(e) => setData("is_capitalize", e)}
                />
                <Input
                  className={"div3"}
                  placeholder={"Тип депозита"}
                  onChange={(e) => setData("type_of_deposit", e)}
                  value={data?.type_of_deposit}
                  error={errors}
                  id={"type_of_deposit"}
                />
                <Input
                  className={"div4"}
                  placeholder={"Выводный счет"}
                  onChange={(e) => setData("withdraw_account", e)}
                  value={data?.withdraw_account}
                  error={errors}
                  id={"withdraw_account"}
                />
                <Input
                  className={"div5"}
                  placeholder={"Начисленный счет"}
                  onChange={(e) => setData("accrued_account", e)}
                  value={data?.accrued_account}
                  error={errors}
                  id={"accrued_account"}
                />{" "}
                <Input
                  className={"div6"}
                  placeholder={"Месяцы"}
                  onChange={(e) => setData("deposit_term_month", e)}
                  value={data?.deposit_term_month}
                  error={errors}
                  id={"deposit_term_month"}
                />
                <Input
                  className={"div7"}
                  placeholder={"Сумма"}
                  onChange={(e) => setData("sum_of_deposit", e)}
                  value={data?.sum_of_deposit}
                  error={errors}
                  id={"sum_of_deposit"}
                />
                <Select
                  className={"div8"}
                  id={"deposit_currency"}
                  value={data?.deposit_currency}
                  onChange={(e) => setData("deposit_currency", e)}
                  options={depositCurrency}
                  error={errors}
                />
              </div>
              <footer>
                <button onClick={() => onSend()}>
                  <img src={save} alt="" />
                  <span>Сохранить</span>
                </button>
              </footer>
            </main>
          )}
        </div>
      </div>
    </>
  );
}
