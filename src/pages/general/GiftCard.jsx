import RadioSelect from "../../components/elements/RadioSelect";
import {
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
import { useParams } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";

export default function GiftCard({ edit = false }) {
  const [loading, setLoading] = useState(false);
  const { data, errors, setData, validate, setDataClear, setDataMore } =
    useFormStore();

  const { id } = useParams();

  const ValidData = {
    front_side_of_the_passport_file: { required: true },
    back_side_of_the_passport_file: { required: true },
    selfie_with_passport_file: { required: true },
  };

  const formatDateForBackend = (dateStr) => {
    if (!dateStr) return "";
    // Преобразует "2025-08-04" в ISO формат "2025-08-04T00:00:00Z"
    return new Date(dateStr).toISOString();
  };

  const onSend = async () => {
    // const isValid = validate(ValidData);
    // if (!isValid) return;
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

      // Добавление остальных полей
      formData.append("name", data.name || "");
      formData.append("surname", data.surname || "");
      formData.append("patronymic", data.patronymic || "");
      formData.append("gender", data.gender === true ? "Муж" : "Жен");
      formData.append("client_index", data.client_index || "");
      formData.append("issued_by", data.issued_by || "");
      formData.append(
        "issued_at",
        formatDateForBackend(data.passport_issued_at)
      );
      formData.append("birth_date", formatDateForBackend(data.birth_date));
      formData.append("phone_number", data.phone_number || "");
      formData.append("secret_word", data.secret_word || "");
      formData.append("card_name", data.card_name || "");
      formData.append(
        "card_code",
        data.visa_card || data.mc_card || data.nc_card || ""
      );
      formData.append("type_of_certificate", data.type_of_certificate || "");
      formData.append("documents_series", data.documents_series || "");
      formData.append("document_number", data.document_number || "");
      formData.append(
        "passport_issued_at",
        formatDateForBackend(data.passport_issued_at)
      );
      formData.append("inn", data.inn || "");
      formData.append("country", data.country || "");
      formData.append("email", data.email || "");
      formData.append("region", data.region || "");
      formData.append("population_type", data.population_type || "");
      formData.append("populated", data.populated || "");
      formData.append("district", data.district || "");
      formData.append("street_type", data.street_type || "");
      formData.append("street", data.street || "");
      formData.append("house_number", data.house_number || "");
      formData.append("corpus", data.corpus || "");
      formData.append("apartment_number", data.apartment_number || "");

      // Убеждаемся, что булевые значения отправляются как строки "true"/"false"
      formData.append("is_resident", String(!!data.is_resident));
      formData.append("remote_application", String(!!data.remote_application));
      formData.append("identity_verified", String(!!data.identity_verified));

      formData.append(
        "delivery_address",
        `${data.country || ""}, ${data.region || ""}, ${
          data.populated || ""
        }, ${data.street || ""} ${data.house_number || ""}`
      );

      const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;

      if (edit) {
        const response = await fetch(`${backendUrl}/applications/${data.ID}`, {
          method: "PATCH",
          body: formData,
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        console.log("Успешно отправлено:", result);
        setDataClear();
        alert("Данные успешно сохранены!");
      } else {
        const response = await fetch(`${backendUrl}/applications`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        console.log("Успешно отправлено:", result);
        setDataClear();
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
        setDataMore({ ...data, gemder: data.gender === "Муж" });
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
      <HeaderAgent activeLink="gift_card" />
      <div className="gift-card">
        {loading ? (
          <Spinner />
        ) : (
          <main>
            <h1>
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
            </div>
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
            <div className="content-form">
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
                onChange={(e) => setData("patronymic", e)}
                value={data?.patronymic}
                error={errors}
                id={"patronymic"}
              />
              <Input
                type="date"
                className={"div4"}
                placeholder={"Дата рождения"}
                onChange={(e) => setData("birth_date", e)}
                value={data?.birth_date}
                error={errors}
                id={"birth_date"}
              />
              <Input
                className={"div5"}
                placeholder={"Телефон"}
                onChange={(e) => setData("phone_number", e)}
                value={data?.phone_number}
                error={errors}
                id={"phone_number"}
              />
              <Input
                className={"div6"}
                placeholder={"Кодовое"}
                onChange={(e) => setData("secret_word", e)}
                value={data?.secret_word}
                error={errors}
                id={"secret_word"}
              />
              <Input
                className={"div7"}
                placeholder={"Почта"}
                onChange={(e) => setData("email", e)}
                value={data?.email}
                error={errors}
                id={"email"}
              />
              <Input
                className={"div8"}
                placeholder={"Имя на карте"}
                onChange={(e) => setData("card_name", e)}
                value={data?.card_name}
                error={errors}
                id={"card_name"}
              />
              <CheckBox
                yes={"Муж"}
                no={"Жен"}
                className={"div9 form-check-box"}
                title={"Пол"}
                value={data.gender}
                onChange={(e) => setData("gender", e)}
              />
              <CheckBox
                className={"div10 form-check-box"}
                title={"Резидент Тадж-на?"}
                value={data.is_resident}
                onChange={(e) => setData("is_resident", e)}
              />
              <Select
                className={"div11"}
                id={"type_of_certificate"}
                value={data?.type_of_certificate}
                onChange={(e) => setData("type_of_certificate", e)}
                options={docTypes}
                error={errors}
              />
              <Input
                className={"div12"}
                placeholder={"Серия"}
                onChange={(e) => setData("documents_series", e)}
                value={data?.documents_series}
                error={errors}
                id={"documents_series"}
              />
              <Input
                className={"div13"}
                placeholder={"Номер"}
                onChange={(e) => setData("document_number", e)}
                value={data?.document_number}
                error={errors}
                id={"document_number"}
              />

              <Input
                type="date"
                className={"div14"}
                placeholder={"Дата выдачи"}
                onChange={(e) => setData("passport_issued_at", e)}
                value={data?.passport_issued_at}
                error={errors}
                id={"passport_issued_at"}
              />
              <Input
                className={"div15"}
                placeholder={"Кем выдан"}
                onChange={(e) => setData("issued_by", e)}
                value={data?.issued_by}
                error={errors}
                id={"issued_by"}
              />
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
                placeholder={"Страна"}
                onChange={(e) => setData("country", e)}
                value={data?.country}
                error={errors}
                id={"country"}
              />
              <Select
                className={"div18"}
                id={"regin_type"}
                value={data?.regin_type}
                onChange={(e) => setData("regin_type", e)}
                options={reginTypes}
                error={errors}
              />
              <Input
                className={"div19"}
                placeholder={"Регион"}
                onChange={(e) => setData("region", e)}
                value={data?.region}
                error={errors}
                id={"region"}
              />
              <Select
                className={"div20"}
                id={"population_type"}
                value={data?.population_type}
                onChange={(e) => setData("population_type", e)}
                options={USTypes}
                error={errors}
              />
              <Input
                className={"div21"}
                placeholder={"Нас пункт"}
                onChange={(e) => setData("populated", e)}
                value={data?.populated}
                error={errors}
                id={"populated"}
              />
              <Select
                className={"div22"}
                id={"district_type"}
                value={data?.district_type}
                onChange={(e) => setData("district_type", e)}
                options={districtTypes}
                error={errors}
              />
              <Input
                className={"div23"}
                placeholder={"Района"}
                onChange={(e) => setData("district", e)}
                value={data?.district}
                error={errors}
                id={"district"}
              />
              <Select
                className={"div24"}
                id={"street_type"}
                value={data?.street_type}
                onChange={(e) => setData("street_type", e)}
                options={streetTypes}
                error={errors}
              />
              <Input
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
              />
              <Input
                className={"div28"}
                placeholder={"Индекс"}
                onChange={(e) => setData("client_index", e)}
                value={data?.client_index}
                error={errors}
                id={"client_index"}
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
