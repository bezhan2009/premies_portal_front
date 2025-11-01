import RadioSelect from "../../components/elements/RadioSelect";
import {
  depositCurrency,
  districtTypes,
  docTypes,
  mcCards,
  ncCards,
  reginTypes,
  streetTypes,
  USTypes,
  visaCards,
} from "../../const/defConst";
import file from "../../assets/file.jpg";
import back_side_of_the_passport_file from "../../assets/back-passport.jpg";
import front_side_of_the_passport_file from "../../assets/front-passport.jpg";
import personImg from "../../assets/person.svg";
import visa from "../../assets/visa.jpg";
import nc from "../../assets/nc.jpg";
import mc from "../../assets/mc.jpg";
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
import { getApplicationById } from "../../api/application/getApplicationById.js";
import { useNavigate, useParams } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import { formaterDate } from "../../api/utils/formateDate.js";
import HeaderDipozit from "../../components/dashboard/dashboard_dipozit/MenuDipozit.jsx";
import { apiClientApplicationDipozit } from "../../api/utils/apiClientApplicationDipozit.js";

export default function GiftCardDipozit({ edit = false }) {
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
      const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_DIPOZIT_URL;

      if (edit) {
        const response = await fetch(`${backendUrl}/applications/${data.ID}`, {
          method: "PATCH",
          body: data,
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        console.log("Успешно отправлено:", result);
        // setDataClear();
        alert("Данные успешно сохранены!");
      } else {
        const response = apiClientApplicationDipozit.post(`deposits`, {
          ...data,
          deposit_term_month: +data?.deposit_term_month,
          sum_of_deposit: +data?.sum_of_deposit,
        });

        const result = await response
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

        const data = await getApplicationById(id);
        setDataMore({
          ...data,
          gemder: data.gender === "Муж",
          withdraw_account: formaterDate(data?.withdraw_account, "dateOnly"),
          passport_issued_at: formaterDate(
            data?.passport_issued_at,
            "dateOnly"
          ),
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
      <HeaderDipozit activeLink="gift_card" />
      <div className="gift-card">
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
              <button>
                <img src={card} alt="" />
                <span>Открыть карту</span>
              </button>
              <button>
                <img src={download} alt="" />
                <span>Скачать анкету</span>
              </button>
              <button>
                <img src={share} alt="" />
                <span>Загрузить анкету</span>
              </button>
            </footer>
          </main>
        )}
      </div>
    </>
  );
}
