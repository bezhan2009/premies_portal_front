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
import CheckBox from "../../components/elements/checkBox";
import Input from "../../components/elements/Input";
import Select from "../../components/elements/Select";

export default function GiftCard() {
  const { data, errors, setData, validate } = useFormStore();

  const ValidData = {
    login: { required: true },
    password: { required: true, minLength: 4 },
  };
  console.log("data", data);
  const onSend = async () => {
    const isValid = validate(ValidData);
    if (isValid) {
      try {
        console.log("data", data);
        
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
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
          <button>
            <img src={save} alt="" />
            <span onClick={() => onSend()}>Сохранить</span>
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
  );
}
