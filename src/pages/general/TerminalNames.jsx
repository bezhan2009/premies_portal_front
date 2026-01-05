import Input from "../../components/elements/Input.jsx";
import "../../styles/components/BlockInfo.scss";
import "../../styles/components/TransactionTypes.scss";
import { useEffect, useState } from "react";
import Select from "../../components/elements/Select.jsx";
import { useFormStore } from "../../hooks/useFormState.js";
import Sidebar from "./DynamicMenu.jsx";
import useSidebar from "../../hooks/useSideBar.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    deleteTerminalNames,
    getTerminalNames,
    postTerminalNames,
    putTerminalNames,
    putTransactions,
    putTransactionsNumber,
} from "../../api/transactions/api.js";

const ValidData = {
    transactionType: { required: true },
    description: { required: true },
    atmId: { required: true },
};

import { tableDataDef, transactionTypes } from "../../const/defConst";

/**
 * Коды валют по ISO 4217
 * Числовые коды (3-значные) и их буквенные обозначения (3-символьные)
 * Источник: https://www.iso.org/iso-4217-currency-codes.html
 */

const CURRENCIES = {
    '008': 'ALL', // Албанский лек
    '012': 'DZD', // Алжирский динар
    '032': 'ARS', // Аргентинское песо
    '036': 'AUD', // Австралийский доллар
    '044': 'BSD', // Багамский доллар
    '048': 'BHD', // Бахрейнский динар
    '050': 'BDT', // Бангладешская така
    '051': 'AMD', // Армянский драм
    '052': 'BBD', // Барбадосский доллар
    '060': 'BMD', // Бермудский доллар
    '064': 'BTN', // Нгултрум
    '068': 'BOB', // Боливийский боливиано
    '072': 'BWP', // Ботсванская пула
    '084': 'BZD', // Белизский доллар
    '090': 'SBD', // Доллар Соломоновых Островов
    '096': 'BND', // Брунейский доллар
    '104': 'MMK', // Мьянманский кьят
    '108': 'BIF', // Бурундийский франк
    '116': 'KHR', // Камбоджийский риель
    '124': 'CAD', // Канадский доллар
    '132': 'CVE', // Эскудо Кабо-Верде
    '136': 'KYD', // Доллар Островов Кайман
    '144': 'LKR', // Шри-Ланкийская рупия
    '152': 'CLP', // Чилийское песо
    '156': 'CNY', // Китайский юань
    '170': 'COP', // Колумбийское песо
    '174': 'KMF', // Коморский франк
    '188': 'CRC', // Коста-риканский колон
    '191': 'HRK', // Хорватская куна
    '192': 'CUP', // Кубинское песо
    '203': 'CZK', // Чешская крона
    '208': 'DKK', // Датская крона
    '214': 'DOP', // Доминиканское песо
    '222': 'SVC', // Сальвадорский колон
    '230': 'ETB', // Эфиопский быр
    '232': 'ERN', // Эритрейская накфа
    '238': 'FKP', // Фунт Фолклендских островов
    '242': 'FJD', // Доллар Фиджи
    '262': 'DJF', // Франк Джибути
    '270': 'GMD', // Гамбийский даласи
    '292': 'GIP', // Гибралтарский фунт
    '320': 'GTQ', // Гватемальский кетсаль
    '324': 'GNF', // Гвинейский франк
    '328': 'GYD', // Гайанский доллар
    '332': 'HTG', // Гаитянский гурд
    '340': 'HNL', // Гондурасская лемпира
    '344': 'HKD', // Гонконгский доллар
    '348': 'HUF', // Венгерский форинт
    '352': 'ISK', // Исландская крона
    '356': 'INR', // Индийская рупия
    '360': 'IDR', // Индонезийская рупия
    '364': 'IRR', // Иранский риал
    '368': 'IQD', // Иракский динар
    '376': 'ILS', // Израильский новый шекель
    '388': 'JMD', // Ямайский доллар
    '392': 'JPY', // Японская иена
    '398': 'KZT', // Казахстанский тенге
    '400': 'JOD', // Иорданский динар
    '404': 'KES', // Кенийский шиллинг
    '408': 'KPW', // Северокорейская вона
    '410': 'KRW', // Южнокорейская вона
    '414': 'KWD', // Кувейтский динар
    '417': 'KGS', // Киргизский сом
    '418': 'LAK', // Лаосский кип
    '422': 'LBP', // Ливанский фунт
    '426': 'LSL', // Лоти
    '430': 'LRD', // Либерийский доллар
    '434': 'LYD', // Ливийский динар
    '446': 'MOP', // Патака Макао
    '454': 'MWK', // Малавийская квача
    '458': 'MYR', // Малайзийский ринггит
    '462': 'MVR', // Мальдивская руфия
    '480': 'MUR', // Маврикийская рупия
    '484': 'MXN', // Мексиканское песо
    '496': 'MNT', // Монгольский тугрик
    '498': 'MDL', // Молдавский лей
    '504': 'MAD', // Марокканский дирхам
    '512': 'OMR', // Оманский риал
    '516': 'NAD', // Намибийский доллар
    '524': 'NPR', // Непальская рупия
    '532': 'ANG', // Нидерландский антильский гульден
    '533': 'AWG', // Арубанский флорин
    '548': 'VUV', // Вануатский вату
    '554': 'NZD', // Новозеландский доллар
    '558': 'NIO', // Никарагуанская кордоба
    '566': 'NGN', // Нигерийская найра
    '578': 'NOK', // Норвежская крона
    '586': 'PKR', // Пакистанская рупия
    '590': 'PAB', // Панамский бальбоа
    '598': 'PGK', // Кина Папуа-Новой Гвинеи
    '600': 'PYG', // Парагвайский гуарани
    '604': 'PEN', // Перуанский соль
    '608': 'PHP', // Филиппинское песо
    '634': 'QAR', // Катарский риал
    '643': 'RUB', // Российский рубль
    '646': 'RWF', // Франк Руанды
    '654': 'SHP', // Фунт Святой Елены
    '682': 'SAR', // Саудовский риял
    '690': 'SCR', // Сейшельская рупия
    '694': 'SLL', // Сьерра-леонский леоне
    '702': 'SGD', // Сингапурский доллар
    '704': 'VND', // Вьетнамский донг
    '706': 'SOS', // Сомалийский шиллинг
    '710': 'ZAR', // Южноафриканский рэнд
    '728': 'SSP', // Южносуданский фунт
    '748': 'SZL', // Свазилендский лилангени
    '752': 'SEK', // Шведская крона
    '756': 'CHF', // Швейцарский франк
    '760': 'SYP', // Сирийский фунт
    '764': 'THB', // Таиландский бат
    '776': 'TOP', // Тонганская паанга
    '780': 'TTD', // Доллар Тринидада и Тобаго
    '784': 'AED', // Дирхам ОАЭ
    '788': 'TND', // Тунисский динар
    '800': 'UGX', // Угандийский шиллинг
    '807': 'MKD', // Македонский денар
    '818': 'EGP', // Египетский фунт
    '826': 'GBP', // Фунт стерлингов
    '834': 'TZS', // Танзанийский шиллинг
    '840': 'USD', // Доллар США
    '858': 'UYU', // Уругвайское песо
    '860': 'UZS', // Узбекский сум
    '882': 'WST', // Самоанская тала
    '886': 'YER', // Йеменский риал
    '901': 'TWD', // Новый тайваньский доллар
    '927': 'UYW', // Уругвайский номинальный индекс заработной платы
    '928': 'VES', // Венесуэльский боливар
    '929': 'MRU', // Мавританская угия
    '930': 'STN', // Добра Сан-Томе и Принсипи
    '931': 'CUC', // Конвертируемое песо Кубы
    '932': 'ZWL', // Зимбабвийский доллар (2009)
    '933': 'BYN', // Белорусский рубль
    '934': 'TMT', // Туркменский манат
    '936': 'GHS', // Ганский седи
    '937': 'VEF', // Венесуэльский боливар (2008–2018)
    '938': 'SDG', // Суданский фунт
    '940': 'UYI', // Уругвайский песо в индексированных единицах
    '941': 'RSD', // Сербский динар
    '943': 'MZN', // Мозамбикский метикал
    '944': 'AZN', // Азербайджанский манат
    '946': 'RON', // Румынский лей
    '947': 'CHE', // WIR евро (дополнительная валюта)
    '948': 'CHW', // WIR франк (дополнительная валюта)
    '949': 'TRY', // Турецкая лира
    '950': 'XAF', // Франк КФА BEAC
    '951': 'XCD', // Восточно-карибский доллар
    '952': 'XOF', // Франк КФА BCEAO
    '953': 'XPF', // Франк КФП
    '955': 'XBA', // Европейская составная единица EURCO
    '956': 'XBB', // Европейская валютная единица E.M.U.-6
    '957': 'XBC', // Европейская расчетная единица EUA-9
    '958': 'XBD', // Европейская расчетная единица EUA-17
    '959': 'XAU', // Золото
    '960': 'XDR', // Специальные права заимствования
    '961': 'XAG', // Серебро
    '962': 'XPT', // Платина
    '963': 'XTS', // Код, зарезервированный для целей тестирования
    '964': 'XPD', // Палладий
    '965': 'XUA', // Расчетная единица АФБР
    '967': 'ZMW', // Замбийская квача
    '968': 'SRD', // Суринамский доллар
    '969': 'MGA', // Малагасийский ариари
    '970': 'COU', // Единица реальной стоимости Колумбии
    '971': 'AFN', // Афганский афгани
    '972': 'TJS', // Таджикский сомони
    '973': 'AOA', // Ангольская кванза
    '974': 'BYR', // Белорусский рубль (2000–2016)
    '975': 'BGN', // Болгарский лев
    '976': 'CDF', // Конголезский франк
    '977': 'BAM', // Конвертируемая марка Боснии и Герцеговины
    '978': 'EUR', // Евро
    '979': 'MXV', // Мексиканская единица реальной стоимости (UDI)
    '980': 'UAH', // Украинская гривна
    '981': 'GEL', // Грузинский лари
    '984': 'BOV', // Боливийский мвдол
    '985': 'PLN', // Польский злотый
    '986': 'BRL', // Бразильский реал
    '990': 'CLF', // Учетная единица Чили (UF)
    '994': 'XSU', // Сукре
    '997': 'USN', // Доллар США (следующий день)
    '999': 'XXX', // Нет валюты
};

// Функция для получения буквенного кода валюты по числовому
export const getCurrencyCode = (currencyNumber) => {
    return CURRENCIES[currencyNumber] || currencyNumber;
};

// Функция для получения числового кода по буквенному
export const getCurrencyNumber = (currencyCode) => {
    const entry = Object.entries(CURRENCIES).find(([number, code]) => code === currencyCode);
    return entry ? entry[0] : currencyCode;
};

// Функция для получения полной информации о валюте
export const getCurrencyInfo = (currencyIdentifier) => {
    // Если передан числовой код (строка или число)
    if (typeof currencyIdentifier === 'string' && CURRENCIES[currencyIdentifier]) {
        return {
            numericCode: currencyIdentifier,
            alphabeticCode: CURRENCIES[currencyIdentifier]
        };
    }

    // Если передан буквенный код
    if (typeof currencyIdentifier === 'string' && currencyIdentifier.length === 3) {
        const entry = Object.entries(CURRENCIES).find(([number, code]) => code === currencyIdentifier);
        if (entry) {
            return {
                numericCode: entry[0],
                alphabeticCode: entry[1]
            };
        }
    }

    return null;
};

// Создаем массив опций для Select компонента
const currencyOptions = Object.entries(CURRENCIES).map(([numericCode, alphabeticCode]) => ({
    value: numericCode,
    label: `${alphabeticCode} (${numericCode})`
}));

// Добавляем опцию для null/пустого значения
currencyOptions.unshift({
    value: '',
    label: 'Не указана'
});

export default function TerminalNames() {
    const { data, setData, validate } = useFormStore();
    const [loading, setLoading] = useState(false);
    const [tableData, setTableData] = useState(tableDataDef);
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const [edit, setEdit] = useState(null);
    const [filters, setFilters] = useState({
        transactionType: "",
        description: "",
        atmId: "",
        id: "",
        currency: "", // Добавляем фильтр по валюте
    });

    const upDateItem = async () => {
        const isValid = validate(ValidData);
        if (!isValid) {
            toast.error("Пожалуйста, заполните все обязательные поля корректно!");
            return;
        }

        setLoading(true);
        try {
            // Подготавливаем данные для отправки
            const requestData = {
                ...data,
                // Отправляем числовой код валюты (если есть)
                currency: data.currency || null
            };

            const response = await putTerminalNames(requestData);
            if (response.status === 200 || response.status === 201) {
                toast.success("Успешно обновлён!");
                setEdit(null);
                getItems();
            }
        } catch (e) {
            const errorMessage =
                e?.response?.data?.message ||
                e?.message ||
                "Произошла ошибка при обновлении";
            toast.error(`Ошибка: ${errorMessage}`);
            console.error("Ошибка при обновлении:", e);
        } finally {
            setLoading(false);
        }
    };

    const createItem = async () => {
        setLoading(true);
        try {
            // Подготавливаем данные для создания
            const requestData = {
                ...filters,
                // Отправляем числовой код валюты (если есть)
                currency: filters.currency || null
            };

            const response = await postTerminalNames(requestData);
            if (response.status === 200 || response.status === 201) {
                toast.success("Успешно создан!");
                setEdit(null);
                setFilters({
                    transactionType: "",
                    description: "",
                    atmId: "",
                    id: "",
                    currency: "",
                });
                getItems();
            }
        } catch (e) {
            const errorMessage =
                e?.response?.data?.message ||
                e?.message ||
                "Произошла ошибка при создании";
            toast.error(`Ошибка: ${errorMessage}`);
            console.error("Ошибка при создании:", e);
        } finally {
            setLoading(false);
        }
    };

    const deleteItem = async (id) => {
        setLoading(true);
        try {
            const response = await deleteTerminalNames(id);
            if (response.status === 200 || response.status === 201) {
                toast.success("Успешно удалён!");
                setEdit(null);
                getItems();
            }
        } catch (e) {
            const errorMessage =
                e?.response?.data?.message ||
                e?.message ||
                "Произошла ошибка при удалении";
            toast.error(`Ошибка: ${errorMessage}`);
            console.error("Ошибка при удалении:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const getItems = async () => {
        try {
            const response = await getTerminalNames();

            setTableData(
                response.data.map((item) => ({
                    transactionType: String(item.transactionType),
                    description: item.description,
                    atmId: String(item.atmId),
                    id: String(item.id),
                    currency: item.currency ? String(item.currency) : null, // Добавляем валюту
                }))
            );
        } catch (e) {
            console.error("Ошибка при загрузке данных:", e);
        }
    };

    const applyFilters = (data, currentFilters) => {
        if (!Array.isArray(data)) return [];

        return data.filter((row) => {
            // Для валюты делаем отдельную проверку, так как она может быть null
            const currencyFilter = currentFilters.currency;
            let currencyMatch = true;

            if (currencyFilter) {
                if (row.currency) {
                    currencyMatch = row.currency.includes(currencyFilter) ||
                        getCurrencyCode(row.currency).includes(currencyFilter);
                } else {
                    currencyMatch = false; // Если фильтр задан, а валюта null - не показываем
                }
            }

            return (
                row?.transactionType?.includes(currentFilters?.transactionType || "") &&
                row?.description?.includes(currentFilters?.description || "") &&
                row?.atmId?.includes(currentFilters?.atmId || "") &&
                row?.id?.includes(currentFilters?.id || "") &&
                currencyMatch
            );
        });
    };

    const filteredData = applyFilters(tableData, filters);

    useEffect(() => {
        getItems();
    }, []);

    // Функция для форматированного отображения валюты
    const formatCurrencyDisplay = (currencyCode) => {
        if (!currencyCode) return "Не указана";

        const alphabeticCode = getCurrencyCode(currencyCode);
        return `${alphabeticCode} (${currencyCode})`;
    };

    return (
        <>
            <div
                className={`dashboard-container ${
                    isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
                }`}
                style={{ paddingBottom: 0, paddingTop: 0 }}
            >
                <Sidebar
                    activeLink="terminal_names"
                    isOpen={isSidebarOpen}
                    toggle={toggleSidebar}
                />

                <div className="my-applications" style={{ marginTop: 10 }}>
                    <main style={{ overflow: "auto", height: "100%" }}>
                        <div className="filters animate-slideIn">
                            <input
                                style={{
                                    backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                                }}
                                placeholder="Тип транзакции"
                                value={filters.transactionType}
                                onChange={(e) =>
                                    handleFilterChange("transactionType", e.target.value)
                                }
                            />
                            <input
                                style={{
                                    backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                                }}
                                placeholder="Описание"
                                value={filters.description}
                                onChange={(e) =>
                                    handleFilterChange("description", e.target.value)
                                }
                            />
                            <input
                                style={{
                                    backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                                }}
                                placeholder="ATM ID"
                                value={filters.atmId}
                                onChange={(e) => handleFilterChange("atmId", e.target.value)}
                            />

                            {/* Фильтр по валюте */}
                            <input
                                style={{
                                    backgroundColor: edit?.type === "create" ? "#ffbebf" : "",
                                }}
                                placeholder="Валюта (код или номер)"
                                value={filters.currency}
                                onChange={(e) => handleFilterChange("currency", e.target.value)}
                            />

                            {edit?.type !== "create" && (
                                <input
                                    placeholder="id"
                                    value={filters.id}
                                    onChange={(e) => handleFilterChange("id", e.target.value)}
                                />
                            )}

                            <button
                                className="button-edit-roles"
                                onClick={() => {
                                    if (edit?.type === "create") {
                                        createItem();
                                    } else {
                                        setEdit({
                                            type: "create",
                                            id: null,
                                        });
                                    }
                                }}
                            >
                                {edit?.type === "create" ? "Сохранить" : "Создать"}
                            </button>
                        </div>

                        <div className="my-applications-content">
                            <table>
                                <thead>
                                <tr>
                                    <th>Тип транзакции</th>
                                    <th>Описание</th>
                                    <th>ATM ID</th>
                                    <th>Валюта</th>
                                    <th>id</th>
                                    <th>Действия</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredData.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        style={{
                                            backgroundColor:
                                                rowIndex % 2 === 0 ? "#fff" : "#f9f9f9",
                                        }}
                                    >
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                            {edit?.type === "update" && edit?.id === row.id ? (
                                                <Input
                                                    transactionType="text"
                                                    defValue={
                                                        data?.transactionType || row.transactionType
                                                    }
                                                    onChange={(e) => setData("transactionType", e)}
                                                    value={edit?.transactionType}
                                                    onEnter={upDateItem}
                                                />
                                            ) : (
                                                row.transactionType
                                            )}
                                        </td>
                                        <td
                                            style={{ border: "1px solid #ddd", padding: "8px" }}
                                            onClick={() => {
                                                setEdit({
                                                    type: "update",
                                                    id: row.id,
                                                });

                                                setData("transactionType", row.transactionType);
                                                setData("description", row.description);
                                                setData("atmId", row.atmId);
                                                setData("id", row.id);
                                                setData("currency", row.currency || "");
                                            }}
                                        >
                                            {edit?.type === "update" && edit?.id === row.id ? (
                                                <Input
                                                    transactionType="text"
                                                    defValue={data?.description || row.description}
                                                    onChange={(e) => setData("description", e)}
                                                    value={edit?.description}
                                                    onEnter={upDateItem}
                                                />
                                            ) : (
                                                row.description
                                            )}
                                        </td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                            {edit?.type === "update" && edit?.id === row.id ? (
                                                <Input
                                                    transactionType="text"
                                                    defValue={data?.atmId || row.atmId}
                                                    onChange={(e) => setData("atmId", e)}
                                                    value={edit?.atmId}
                                                    onEnter={upDateItem}
                                                />
                                            ) : (
                                                row.atmId
                                            )}
                                        </td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                            {edit?.type === "update" && edit?.id === row.id ? (
                                                <Select
                                                    options={currencyOptions}
                                                    value={data?.currency || ""}
                                                    onChange={(value) => setData("currency", value)}
                                                    placeholder="Выберите валюту"
                                                />
                                            ) : (
                                                formatCurrencyDisplay(row.currency)
                                            )}
                                        </td>
                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                            {row.id}
                                        </td>
                                        {edit?.type === "update" && edit?.id === row.id ? (
                                            <td>
                                                <button
                                                    className="button-edit-roles small-size"
                                                    onClick={() => {
                                                        upDateItem();
                                                    }}
                                                >
                                                    Сохранить
                                                </button>
                                                <button
                                                    className="button-edit-roles small-size"
                                                    onClick={() => setEdit(null)}
                                                    style={{ marginLeft: "5px", backgroundColor: "#6c757d" }}
                                                >
                                                    Отмена
                                                </button>
                                            </td>
                                        ) : (
                                            <td>
                                                <button
                                                    className="button-edit-roles small-size"
                                                    onClick={() => {
                                                        setEdit({
                                                            type: "update",
                                                            id: row.id,
                                                        });
                                                        setData("transactionType", row.transactionType);
                                                        setData("description", row.description);
                                                        setData("atmId", row.atmId);
                                                        setData("id", row.id);
                                                        setData("currency", row.currency || "");
                                                    }}
                                                >
                                                    Редактировать
                                                </button>
                                                <button
                                                    className="button-edit-roles small-size"
                                                    onClick={() => deleteItem(row.id)}
                                                    style={{ marginLeft: "5px", backgroundColor: "#dc3545" }}
                                                >
                                                    Удалить
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
