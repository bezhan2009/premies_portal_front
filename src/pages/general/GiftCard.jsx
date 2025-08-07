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
import back_passport from "../../assets/back-passport.jpg";
import front_passport from "../../assets/front-passport.jpg";
import person from "../../assets/person.svg";
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

export default function GiftCard() {
  const { data, errors, setData, validate } = useFormStore();

  const ValidData = {
    front_passport: { required: true },
    back_passport: { required: true },
    person: { required: true },
  };

  const formatDateForBackend = (dateStr) => {
    if (!dateStr) return "";
    // Преобразует "2025-08-04" в ISO формат "2025-08-04T00:00:00Z"
    return new Date(dateStr).toISOString();
  };

  const onSend = async () => {
    const isValid = validate(ValidData);
    if (!isValid) return;

    try {
      const formData = new FormData();

      // Проверка файлов
      if (data.front_passport) {
        formData.append("front_side_of_the_passport_file", data.front_passport);
      }
      if (data.back_passport) {
        formData.append("back_side_of_the_passport_file", data.back_passport);
      }
      if (data.person) {
        formData.append("selfie_with_passport_file", data.person);
      }

      // Добавление остальных полей
      formData.append("name", data.name || "");
      formData.append("surname", data.sur_name || "");
      formData.append("patronymic", data.paternity || "");
      formData.append("gender", data.gender === true ? "Муж" : "Жен");
      formData.append("client_index", data.index || "");
      formData.append("issued_by", data.issued_by || "");
      formData.append("issued_at", formatDateForBackend(data.сard_issue_date));
      formData.append("birth_date", formatDateForBackend(data.birthday));
      formData.append("phone_number", data.phone || "");
      formData.append("secret_word", data.code || "");
      formData.append("card_name", data.name_on_the_card || "");
      formData.append("card_code", data.visa_card || data.mc_card || data.nc_card || "");
      formData.append("type_of_certificate", data.card_type || "");
      formData.append("documents_series", data.series || "");
      formData.append("document_number", data.number || "");
      formData.append("passport_issued_at", formatDateForBackend(data.сard_issue_date));
      formData.append("inn", data.tin || "");
      formData.append("country", data.country || "");
      formData.append("region", data.region || "");
      formData.append("population_type", data.US_type || "");
      formData.append("populated", data.UsPoint || "");
      formData.append("district", data.district || "");
      formData.append("street_type", data.street_type || "");
      formData.append("street", data.street || "");
      formData.append("house_number", data.house || "");
      formData.append("corpus", data.frame || "");
      formData.append("apartment_number", data.kv || "");

      // Убеждаемся, что булевые значения отправляются как строки "true"/"false"
      formData.append("is_resident", String(!!data.resident));
      formData.append("remote_application", String(!!data.remote_application));
      formData.append("identity_verified", String(!!data.identity_verified));

      formData.append(
          "delivery_address",
          `${data.country || ""}, ${data.region || ""}, ${data.UsPoint || ""}, ${data.street || ""} ${data.house || ""}`
      );

      const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;

      const response = await fetch(`${backendUrl}/applications`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      console.log("Успешно отправлено:", result);
      alert("Данные успешно сохранены!");
    } catch (error) {
      console.error("Ошибка отправки:", error);
      alert("Произошла ошибка при сохранении данных");
    }
  };

  return (
   <>
   <HeaderAgent activeLink="gift_card" />
    <div className="gift-card">
      <main>
        <h1>
          Выберите карту! Нажав на <img src={file} alt="file" width={16} /> вы
          можете посмотреть и распечатать тарифы.
        </h1>
        <div className="header-form">
          <div>
            <img src={visa} alt="visa" width={70} />
            <RadioSelect
              options={visaCards}
              selectedValue={data?.visa_card}
              onChange={(e) => setData("visa_card", e)}
            />
          </div>
          <div>
            <img src={mc} alt="mc" width={70} />
            <RadioSelect
              options={mcCards}
              selectedValue={data?.mc_card}
              onChange={(e) => setData("mc_card", e)}
            />
          </div>
          <div>
            <img src={nc} alt="nc" width={70} />
            <RadioSelect
              options={ncCards}
              selectedValue={data?.nc_card}
              onChange={(e) => setData("nc_card", e)}
            />
          </div>
        </div>
        <h1>Внимательно заполните данные клиента! Следуйте подсказкам</h1>
        <div className="header-passport">
          <File
            errors={errors}
            onChange={(e) => setData("front_passport", e)}
            placeholderImage={front_passport}
            id={"front_passport"}
            value={data?.front_passport}
            width={340}
          />
          <img src={file} alt="file" width={16} />
          <File
            errors={errors}
            onChange={(e) => setData("back_passport", e)}
            placeholderImage={back_passport}
            id={"back_passport"}
            value={data?.back_passport}
            width={340}
          />
          <img src={file} alt="file" width={16} />
          <File
            errors={errors}
            onChange={(e) => setData("person", e)}
            placeholderImage={person}
            id={"person"}
            value={data?.person}
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
            onChange={(e) => setData("sur_name", e)}
            value={data?.sur_name}
            error={errors}
            id={"sur_name"}
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
            onChange={(e) => setData("paternity", e)}
            value={data?.paternity}
            error={errors}
            id={"paternity"}
          />
          <Input
            type="date"
            className={"div4"}
            placeholder={"Дата рождения"}
            onChange={(e) => setData("birthday", e)}
            value={data?.birthday}
            error={errors}
            id={"birthday"}
          />
          <Input
            className={"div5"}
            placeholder={"Телефон"}
            onChange={(e) => setData("phone", e)}
            value={data?.phone}
            error={errors}
            id={"phone"}
          />
          <Input
            className={"div6"}
            placeholder={"Кодовое"}
            onChange={(e) => setData("code", e)}
            value={data?.code}
            error={errors}
            id={"code"}
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
            onChange={(e) => setData("name_on_the_card", e)}
            value={data?.name_on_the_card}
            error={errors}
            id={"name_on_the_card"}
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
            value={data.resident}
            onChange={(e) => setData("resident", e)}
          />
          <Select
            className={"div11"}
            id={"card_type"}
            value={data?.card_type}
            onChange={(e) => setData("card_type", e)}
            options={docTypes}
            error={errors}
          />
          <Input
            className={"div12"}
            placeholder={"Серия"}
            onChange={(e) => setData("series", e)}
            value={data?.series}
            error={errors}
            id={"series"}
          />
          <Input
            className={"div13"}
            placeholder={"Номер"}
            onChange={(e) => setData("number", e)}
            value={data?.number}
            error={errors}
            id={"number"}
          />

          <Input
            type="date"
            className={"div14"}
            placeholder={"Дата выдачи"}
            onChange={(e) => setData("сard_issue_date", e)}
            value={data?.сard_issue_date}
            error={errors}
            id={"сard_issue_date"}
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
            onChange={(e) => setData("tin", e)}
            value={data?.tin}
            error={errors}
            id={"tin"}
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
            id={"US_type"}
            value={data?.US_type}
            onChange={(e) => setData("US_type", e)}
            options={USTypes}
            error={errors}
          />
          <Input
            className={"div21"}
            placeholder={"Нас пункт"}
            onChange={(e) => setData("UsPoint", e)}
            value={data?.UsPoint}
            error={errors}
            id={"UsPoint"}
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
            onChange={(e) => setData("house", e)}
            value={data?.house}
            error={errors}
            id={"house"}
          />
          <Input
            className={"div27"}
            placeholder={"Корпус"}
            onChange={(e) => setData("frame", e)}
            value={data?.frame}
            error={errors}
            id={"frame"}
          />
          {/* <Input
            className={"div28"}
            placeholder={"Кв"}
            onChange={(e) => setData("kv", e)}
            value={data?.kv}
            error={errors}
            id={"kv"}
          /> */}
          <Input
            className={"div28"}
            placeholder={"Индекс"}
            onChange={(e) => setData("index", e)}
            value={data?.index}
            error={errors}
            id={"index"}
          />
        </div>
        <footer>
          <button onClick={() => onSend()}>
            <img src={save} alt="" />
            <span >Сохранить</span>
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
    </div>
     </>
  );
}
