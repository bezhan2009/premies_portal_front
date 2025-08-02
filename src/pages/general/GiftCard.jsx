import RadioSelect from "../../components/elements/RadioSelect";
import { mcCards, ncCards, visaCards } from "../../const/defConst";
import file from "../../assets/file.jpg";
import back_passport from "../../assets/back-passport.jpg";
import front_passport from "../../assets/front-passport.jpg";
import person from "../../assets/person.svg";
import visa from "../../assets/visa.jpg";
import nc from "../../assets/nc.jpg";
import mc from "../../assets/mc.jpg";
import { useFormStore } from "../../hooks/useFormState";
import File from "../../components/elements/File";

export default function GiftCard() {
  const { data, errors, setData, validate } = useFormStore();

  console.log("data", data);

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
            value={data?.front_passport}
            width={350}
          />
          <img src={file} alt="file" width={16} />
          <File
            errors={errors}
            onChange={(e) => setData("back_passport", e)}
            placeholderImage={back_passport}
            value={data?.back_passport}
            width={350}
          />
          <img src={file} alt="file" width={16} />
          <File
            errors={errors}
            onChange={(e) => setData("person", e)}
            placeholderImage={person}
            value={data?.person}
            width={230}
          />
          <div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
