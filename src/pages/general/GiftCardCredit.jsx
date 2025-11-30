import RadioSelect from "../../components/elements/RadioSelect";
import { loanTypes, offis, statusCredit } from "../../const/defConst";
import file from "../../assets/file.jpg";
import back_side_of_the_passport_file from "../../assets/back-passport.jpg";
import front_side_of_the_passport_file from "../../assets/front-passport.jpg";
import personImg from "../../assets/person.svg";
import fileIcon from "../../assets/fileIcon.png";
// fileIcon.png
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
import { useNavigate, useParams } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import { formaterDate } from "../../api/utils/formateDate.js";
import HeaderCredit from "../../components/dashboard/dashboard_credit/MenuCredit.jsx";
import { getCreditById } from "../../api/application/getCredit.js";
import useSidebar from "../../hooks/useSideBar.js";
import Sidebar from "./DynamicMenu.jsx";

export default function GiftCardCredit({ edit = false }) {
  const { isSidebarOpen, toggleSidebar } = useSidebar();  
  const [loading, setLoading] = useState(false);
  const { data, errors, setData, validate, setDataMore } = useFormStore();

  const navigate = useNavigate();

  const { id } = useParams();

  const ValidData = {
    name: { required: true },
    surname: { required: true },
    phone: { required: true },
    inn: { required: true },
    client_code: { required: true },
    loan_type: { required: true },
    address: { required: true },
    branch_office: { required: true },
    // front_side_of_the_passport: { required: true },
    // back_side_of_the_passport: { required: true },
    // selfie_with_passport: { required: true },
    workplace: { required: true },
    employment_date: { required: true },
    salary: { required: true },
    // income_proof_document: { required: true },
    loan_purpose: { required: true },
    // loan_term: { required: true },
    loan_amount: { required: true },
    credit_status_id: { required: true },
  };

  const formatDateForBackend = (dateStr) => {
    if (!dateStr) return "";
    // Преобразует "2025-08-04" в ISO формат "2025-08-04T00:00:00Z"
    return new Date(dateStr).toISOString();
  };

  const onSend = async () => {
    const isValid = validate(ValidData);

    console.log("isValid", isValid);
    

    if (!isValid) return;
    try {
      const formData = new FormData();

      // Проверка файлов
      if (data.front_side_of_the_passport_file) {
        formData.append(
          "front_side_of_the_passport_file",
          data.front_side_of_the_passport_file
        );
      }
      if (data.back_side_of_the_passport_file) {
        formData.append(
          "back_side_of_the_passport_file",
          data.back_side_of_the_passport_file
        );
      }
      if (data.selfie_with_passport_file) {
        formData.append(
          "selfie_with_passport_file",
          data.selfie_with_passport_file
        );
      }
      if (data.income_proof_document_file) {
        formData.append(
          "income_proof_document_file",
          data.income_proof_document_file
        );
      }

      // Добавление остальных полей
      formData.append("name", data.name.trim() || "");
      formData.append("surname", data.surname.trim() || "");
      formData.append("patronymic", data.middle_name.trim() || "");
      // formData.append("gender", data.gender === true ? "Муж" : "Жен");
      formData.append("client_code", String(data.client_code) || "");
      // formData.append("issued_by", data.issued_by || "");
      // formData.append(
      //   "issued_at",
      //   formatDateForBackend(data.passport_issued_at)
      // );
      formData.append(
        "employment_date",
        formatDateForBackend(data.employment_date + "T00:00:00Z")
      );
      formData.append("phone", String(data.phone) || "");
      // formData.append("secret_word", data.secret_word || "");
      formData.append("workplace", data.workplace || "");
      // formData.append(
      //   "card_code",
      //   data.visa_card || data.mc_card || data.nc_card || ""
      // );
      formData.append("loan_type", data.loan_type || "");
      // branch_office
      formData.append("branch_office", data.branch_office || "");
      formData.append(
        "additional_income_source",
        data.additional_income_source || ""
      );
      formData.append(
        "additional_income_amount",
        data.additional_income_amount || ""
      );
      formData.append("credit_status_id", data.credit_status_id);
      formData.append(
        "credit_status",
        statusCredit.find((e) => +e.value === +data.credit_status_id)
      );
      formData.append("inn", String(data.inn) || "");
      formData.append("loan_purpose", data.loan_purpose || "");
      formData.append("salary", data.salary || "");
      formData.append("loan_term", data.loan_term || "");
      // formData.append("population_type", data.population_type || "");
      formData.append("loan_amount", data.loan_amount || "");
      // formData.append("district", data.district || "");
      // formData.append("credit_status_id", data.credit_status_id || "");
      // formData.append("street", data.street || "");
      // formData.append("house_number", data.house_number || "");
      // formData.append("corpus", data.corpus || "");
      // formData.append("apartment_number", data.apartment_number || "");

      // Убеждаемся, что булевые значения отправляются как строки "true"/"false"
      // formData.append("is_resident", String(!!data.is_resident));
      // formData.append("remote_application", String(!!data.remote_application));
      // formData.append("identity_verified", String(!!data.identity_verified));

      formData.append("address", data.address);

      const backendUrl = import.meta.env.VITE_BACKEND_CREDIT_URL;

      if (edit) {
        const response = await fetch(`${backendUrl}/credits/${data.ID}`, {
          method: "PATCH",
          body: formData,
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        console.log("Успешно отправлено:", result);
        // setDataClear();
        alert("Данные успешно сохранены!");
      } else {
        const response = await fetch(`${backendUrl}/credits`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
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

        const data = await getCreditById(id);
        setDataMore({
          ...data,
          // gemder: data.gender === "Муж",
          employment_date: formaterDate(data?.employment_date, "dateOnly"),
          // passport_issued_at: formaterDate(
          //   data?.passport_issued_at,
          //   "dateOnly"
          // ),
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  console.log("data", data);
  console.log("errors", errors);

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <Sidebar activeLink="gift_credit" isOpen={isSidebarOpen} toggle={toggleSidebar} />
        <div className="gift-card-credit">
          {loading ? (
            <Spinner />
          ) : (
            <main>
              {/* <h1>
                Выберите карту! Нажав на <img src={file} alt="file" width={16} />{" "}
                вы можете посмотреть и распечатать тарифы.
              </h1>
              <div className="header-form">
                <div>
                  <img src={visa} alt="visa" width={70} />
                  <RadioSelect
                    options={visaCards}
                    selectedValue={data?.visa_card}
                    onChange={(e) => {
                      setData("visa_card", e);
                      setData("mc_card", 0);
                      setData("nc_card", 0);
                    }}
                  />
                </div>
                <div>
                  <img src={mc} alt="mc" width={70} />
                  <RadioSelect
                    options={mcCards}
                    selectedValue={data?.mc_card}
                    onChange={(e) => {
                      setData("mc_card", e);
                      setData("visa_card", 0);
                      setData("nc_card", 0);
                    }}
                  />
                </div>
                <div>
                  <img src={nc} alt="nc" width={70} />
                  <RadioSelect
                    options={ncCards}
                    selectedValue={data?.nc_card}
                    onChange={(e) => {
                      setData("nc_card", e);
                      setData("visa_card", 0);
                      setData("mc_card", 0);
                    }}
                  />
                </div>
              </div> */}
              <h1>Внимательно заполните данные клиента! Следуйте подсказкам</h1>

              <div className="header-passport">
                <File
                  edit={edit}
                  errors={errors}
                  onChange={(e) => setData("front_side_of_the_passport_file", e)}
                  placeholderImage={front_side_of_the_passport_file}
                  id={"front_side_of_the_passport_file"}
                  value={
                    edit
                      ? data?.front_side_of_the_passport
                      : data?.front_side_of_the_passport_file
                  }
                  width={340}
                />
                <img src={file} alt="file" width={16} />
                <File
                  edit={edit}
                  errors={errors}
                  onChange={(e) => setData("back_side_of_the_passport_file", e)}
                  placeholderImage={back_side_of_the_passport_file}
                  id={"back_side_of_the_passport_file"}
                  value={
                    edit
                      ? data?.back_side_of_the_passport
                      : data?.back_side_of_the_passport_file
                  }
                  width={340}
                />
                <img src={file} alt="file" width={16} />

                <File
                  edit={edit}
                  errors={errors}
                  onChange={(e) => setData("selfie_with_passport_file", e)}
                  placeholderImage={personImg}
                  id={"selfie_with_passport_file"}
                  value={
                    edit
                      ? data?.selfie_with_passport
                      : data?.selfie_with_passport_file
                  }
                  width={220}
                />
                {/* income_proof_document_file */}

                <img src={file} alt="file" width={16} />

                <File
                  edit={edit}
                  errors={errors}
                  onChange={(e) => setData("income_proof_document_file", e)}
                  placeholderImage={fileIcon}
                  id={"income_proof_document_file"}
                  value={
                    edit
                      ? data?.income_proof_document
                      : data?.income_proof_document_file
                  }
                  width={220}
                />

                <div>
                  <CheckBox
                    title={"Личность подтверждена?"}
                    value={data.identity_verified}
                    onChange={(e) => setData("identity_verified", e)}
                  />
                  <CheckBox
                    title={"Заявка дистанционная?"}
                    value={data.remote_application}
                    onChange={(e) => setData("remote_application", e)}
                  />
                </div>
              </div>
              <div className="content-form-credit">
                <Input
                  className={"div1"}
                  placeholder={"Фамилия"}
                  onChange={(e) => setData("surname", e)}
                  value={data?.surname}
                  error={errors}
                  id={"surname"}
                />
                <Input
                  className={"div2"}
                  placeholder={"Имя"}
                  onChange={(e) => setData("name", e)}
                  value={data?.name}
                  error={errors}
                  id={"name"}
                />
                <Input
                  className={"div3"}
                  placeholder={"Отчество"}
                  onChange={(e) => setData("middle_name", e)}
                  value={data?.middle_name}
                  error={errors}
                  id={"middle_name"}
                />
                <Input
                  type="date"
                  className={"div4"}
                  placeholder={"Дата трудоустройства"}
                  onChange={(e) => setData("employment_date", e)}
                  value={data?.employment_date}
                  error={errors}
                  id={"employment_date"}
                />
                <Input
                  className={"div5"}
                  placeholder={"Телефон"}
                  onChange={(e) => setData("phone", e)}
                  value={data?.phone}
                  error={errors}
                  id={"phone"}
                />
                {/* <Input
                  className={"div6"}
                  placeholder={"Кодовое"}
                  onChange={(e) => setData("secret_word", e)}
                  value={data?.secret_word}
                  error={errors}
                  id={"secret_word"}
                /> */}
                <Input
                  className={"div7"}
                  placeholder={"Заработная плата"}
                  onChange={(e) => setData("salary", e)}
                  value={data?.salary}
                  error={errors}
                  id={"salary"}
                />
                <Input
                  className={"div8"}
                  placeholder={"Место работы"}
                  onChange={(e) => setData("workplace", e)}
                  value={data?.workplace}
                  error={errors}
                  id={"workplace"}
                />
                {/* <CheckBox
                  yes={"Муж"}
                  no={"Жен"}
                  className={"div9 form-check-box"}
                  title={"Пол"}
                  value={data.gender}
                  onChange={(e) => setData("gender", e)}
                /> */}
                {/* <CheckBox
                  className={"div10 form-check-box"}
                  title={"Резидент Тадж-на?"}
                  value={data.is_resident}
                  onChange={(e) => setData("is_resident", e)}
                /> */}
                <Select
                  className={"div11"}
                  id={"loan_type"}
                  value={data?.loan_type}
                  onChange={(e) => setData("loan_type", e)}
                  options={loanTypes}
                  error={errors}
                />
                <Select
                  className={"div10"}
                  id={"branch_office"}
                  value={data?.branch_office}
                  onChange={(e) => setData("branch_office", e)}
                  options={offis}
                  error={errors}
                />
                <Input
                  className={"div12"}
                  placeholder={"Доп. источник дохода"}
                  onChange={(e) => setData("additional_income_source", e)}
                  value={data?.additional_income_source}
                  error={errors}
                  id={"additional_income_source"}
                />
                <Input
                  className={"div13"}
                  placeholder={"Сумма доп. дохода"}
                  onChange={(e) => setData("additional_income_amount", e)}
                  value={data?.additional_income_amount}
                  error={errors}
                  id={"additional_income_amount"}
                />

                {/* <Input
                  type="date"
                  className={"div14"}
                  placeholder={"Дата выдачи"}
                  onChange={(e) => setData("passport_issued_at", e)}
                  value={data?.passport_issued_at}
                  error={errors}
                  id={"passport_issued_at"}
                /> */}
                {/* <Input
                  className={"div15"}
                  placeholder={"Кем выдан"}
                  onChange={(e) => setData("issued_by", e)}
                  value={data?.issued_by}
                  error={errors}
                  id={"issued_by"}
                /> */}
                <Input
                  className={"div16"}
                  placeholder={"ИНН"}
                  onChange={(e) => setData("inn", e)}
                  value={data?.inn}
                  error={errors}
                  id={"inn"}
                />
                <Input
                  className={"div17"}
                  placeholder={"Цель кредита"}
                  onChange={(e) => setData("loan_purpose", e)}
                  value={data?.loan_purpose}
                  error={errors}
                  id={"loan_purpose"}
                />
                {/* <Select
                  className={"div18"}
                  id={"regin_type"}
                  value={data?.regin_type}
                  onChange={(e) => setData("regin_type", e)}
                  options={reginTypes}
                  error={errors}
                /> */}
                <Input
                  className={"div19"}
                  placeholder={"Срок кредита (мес.)"}
                  onChange={(e) => setData("loan_term", e)}
                  value={data?.loan_term}
                  error={errors}
                  id={"loan_term"}
                />
                {/* <Select
                  className={"div20"}
                  id={"population_type"}
                  value={data?.population_type}
                  onChange={(e) => setData("population_type", e)}
                  options={USTypes}
                  error={errors}
                /> */}
                <Input
                  className={"div21"}
                  placeholder={"Сумма кредита"}
                  onChange={(e) => setData("loan_amount", e)}
                  value={data?.loan_amount}
                  error={errors}
                  id={"loan_amount"}
                />
                {/* <Select
                  className={"div22"}
                  id={"district_type"}
                  value={data?.district_type}
                  onChange={(e) => setData("district_type", e)}
                  options={districtTypes}
                  error={errors}
                /> */}
                <Input
                  className={"div23"}
                  placeholder={"Адрес"}
                  onChange={(e) => setData("address", e)}
                  value={data?.address}
                  error={errors}
                  id={"address"}
                />
                <Select
                  className={"div24"}
                  id={"credit_status_id"}
                  value={data?.credit_status_id}
                  onChange={(e) => setData("credit_status_id", e)}
                  options={statusCredit}
                  error={errors}
                />
                {/* <Input
                  className={"div25"}
                  placeholder={"Улица"}
                  onChange={(e) => setData("street", e)}
                  value={data?.street}
                  error={errors}
                  id={"street"}
                />
                <Input
                  className={"div26"}
                  placeholder={"Дом"}
                  onChange={(e) => setData("house_number", e)}
                  value={data?.house_number}
                  error={errors}
                  id={"house_number"}
                />
                <Input
                  className={"div27"}
                  placeholder={"Корпус"}
                  onChange={(e) => setData("corpus", e)}
                  value={data?.corpus}
                  error={errors}
                  id={"corpus"}
                />
                <Input
                  className={"div29"}
                  placeholder={"Кв"}
                  onChange={(e) => setData("apartment_number", e)}
                  value={data?.apartment_number}
                  error={errors}
                  id={"apartment_number"}
                />*/}
                <Input
                  className={"div28"}
                  placeholder={"Индекс"}
                  onChange={(e) => setData("client_code", e)}
                  value={data?.client_code}
                  error={errors}
                  id={"client_code"}
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
      </div>
    </>
  );
}
