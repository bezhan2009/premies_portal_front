import RadioSelect from "../../components/elements/RadioSelect";
import {
    districtTypes,
    docTypes, genders,
    mcCards,
    ncCards,
    reginTypes,
    streetTypes,
    USTypes,
    visaCards,
} from "../../const/defConst";
import search_user from "../../assets/search_user.png";
import file from "../../assets/file.jpg";
import back_side_of_the_passport_file from "../../assets/back-passport.jpg";
import front_side_of_the_passport_file from "../../assets/front-passport.jpg";
import personImg from "../../assets/person.svg";
import visa from "../../assets/visa.jpg";
import nc from "../../assets/nc.jpg";
import mc from "../../assets/mc.jpg";
import download from "../../assets/download.jpg";
import share from "../../assets/share.jpg";
import save from "../../assets/save.jpg";
import offer from "../../assets/offer.png";
import { useFormStore } from "../../hooks/useFormState";
import File from "../../components/elements/File";
import CheckBox from "../../components/elements/CheckBox";
import Input from "../../components/elements/Input";
import Select from "../../components/elements/Select";
import { useEffect, useState, useRef, useCallback } from "react";
import { getApplicationById } from "../../api/application/getApplicationById.js";
import { useNavigate, useParams } from "react-router-dom";
import Spinner from "../../components/Spinner.jsx";
import { formaterDate } from "../../api/utils/formateDate.js";
import AlertMessage from "../../components/general/AlertMessage.jsx";
import ClientSelectorModal from "../../components/dashboard/dashboard_agent/clientSelectorModal.jsx";

const complianceScores = {
  "Пенсионер": 0, "Обслуживание": 0, "Студент": 0, "Домохозяйка/безработный": 0, "Фермер": 0, "Работники государственных учреждений/предприятий": 0,
  "Первичная торговля автомобилями (новые автомашины)": 2, "Владелец магазина (розничная торговля)": 2, "Бизнес-агентство": 2, "Мелкая торговля (Годовой оборот менее 5 миллионов сомони)": 2, "Само-занятый профессионал/индивидуальный предприниматель": 2, "Корпоративный клиент": 2, "Торговля строительной техникой/материалами": 2, "Торговля компьютерным оборудованием/мобильными телефонами": 2, "Деятельность в области программного обеспечения": 2, "Производство (кроме оружия)": 2,
  "Транспортный оператор": 3, "Торговля автомашинами (Восстановленные машины/вторичный рынок)": 3, "Финансовая/Лизинговая компания": 3, "Агентство фрахтования/отправки/грузоперевозок": 3, "Страховое/брокерское агентство": 3, "Религиозное учреждение /Организация": 3, "Парк/Организация развлечений": 3, "Торговля запасными частями автомобилей": 3, "Табачный и сигаретный бизнес": 3, "Прочее: Работники частных компаний": 3, "Аудиторская деятельность": 3,
  "Торговля ювелирными изделиями/драгоценностями": 5, "Обмен валюты/Курьерская служба": 5, "Агентство недвижимости": 5, "Промоутер строительных проектов": 5, "Оффшорная корпорация": 5, "Влиятельные политические деятели (отечественные)": 5, "Влиятельные политические деятели (иностранные)": 5, "Торговля предметами искусства/антиквариата": 5, "Владелец ресторана/бара/ночного клуба/гостиницы": 5, "Агентство по экспорту/импорту": 5, "Инвестор денежных средств (Ежемесячные денежные инвестиции> 2 миллиона сомони)": 5, "Брокер акций/фондовый брокер": 5, "Бизнес по экспорту рабочей силы": 5, "Операции в нескольких местах": 5, "Продюсерское агентство/распространение кинофильмов": 5, "Торговля оружием": 5, "Оператор мобильной связи": 5, "Торговля (Годовой оборот более 10 миллионов сомони)": 5, "Туристическое агентство": 5, "Работники иностранных компаний": 5,
  "0-5 млн.": 0, "5-20 млн.": 1, "> 20 млн.": 5,
  "Со стороны менеджера по связям / руководителя филиала": 0, "Агентом по прямым продажам": 1, "Через интернет": 3, "Личное посещение / по собственной инициативе": 5,
  "0-10 млн.": 0, "10-50 млн.": 1, "> 50 млн.": 5,
  "0-100": 0, "0-20": 0, "101-250": 1, "21-50": 1, "> 250": 5, "> 50": 5,
  "0-2 млн.": 0, "10-25 млн.": 1, "2-7 млн.": 1, "> 25 млн.": 5, "> 7 млн.": 5,
  "0-15": 0, "0-5": 0, "16-30": 1, "6-10": 1, "> 30": 5, "> 10": 5
};

const occupationOptions = [
  { value: "Пенсионер", label: "Пенсионер (0)" },
  { value: "Обслуживание", label: "Обслуживание (0)" },
  { value: "Студент", label: "Студент (0)" },
  { value: "Домохозяйка/безработный", label: "Домохозяйка/безработный (0)" },
  { value: "Фермер", label: "Фермер (0)" },
  { value: "Работники государственных учреждений/предприятий", label: "Работники государственных учреждений/предприятий (0)" },
  { value: "Первичная торговля автомобилями (новые автомашины)", label: "Первичная торговля автомобилями (новые автомашины) (2)" },
  { value: "Владелец магазина (розничная торговля)", label: "Владелец магазина (розничная торговля) (2)" },
  { value: "Бизнес-агентство", label: "Бизнес-агентство (2)" },
  { value: "Мелкая торговля (Годовой оборот менее 5 миллионов сомони)", label: "Мелкая торговля (Годовой оборот менее 5 миллионов сомони) (2)" },
  { value: "Само-занятый профессионал/индивидуальный предприниматель", label: "Само-занятый профессионал/индивидуальный предприниматель (2)" },
  { value: "Корпоративный клиент", label: "Корпоративный клиент (2)" },
  { value: "Торговля строительной техникой/материалами", label: "Торговля строительной техникой/материалами (2)" },
  { value: "Торговля компьютерным оборудованием/мобильными телефонами", label: "Торговля компьютерным оборудованием/мобильными телефонами (2)" },
  { value: "Деятельность в области программного обеспечения", label: "Деятельность в области программного обеспечения (2)" },
  { value: "Производство (кроме оружия)", label: "Производство (кроме оружия) (2)" },
  { value: "Транспортный оператор", label: "Транспортный оператор (3)" },
  { value: "Торговля автомашинами (Восстановленные машины/вторичный рынок)", label: "Торговля автомашинами (Восстановленные машины/вторичный рынок) (3)" },
  { value: "Финансовая/Лизинговая компания", label: "Финансовая/Лизинговая компания (3)" },
  { value: "Агентство фрахтования/отправки/грузоперевозок", label: "Агентство фрахтования/отправки/грузоперевозок (3)" },
  { value: "Страховое/брокерское агентство", label: "Страховое/брокерское агентство (3)" },
  { value: "Религиозное учреждение /Организация", label: "Религиозное учреждение /Организация (3)" },
  { value: "Парк/Организация развлечений", label: "Парк/Организация развлечений (3)" },
  { value: "Торговля запасными частями автомобилей", label: "Торговля запасными частями автомобилей (3)" },
  { value: "Табачный и сигаретный бизнес", label: "Табачный и сигаретный бизнес (3)" },
  { value: "Прочее: Работники частных компаний", label: "Прочее: Работники частных компаний (3)" },
  { value: "Аудиторская деятельность", label: "Аудиторская деятельность (3)" },
  { value: "Торговля ювелирными изделиями/драгоценностями", label: "Торговля ювелирными изделиями/драгоценностями (5)" },
  { value: "Обмен валюты/Курьерская служба", label: "Обмен валюты/Курьерская служба (5)" },
  { value: "Агентство недвижимости", label: "Агентство недвижимости (5)" },
  { value: "Промоутер строительных проектов", label: "Промоутер строительных проектов (5)" },
  { value: "Оффшорная корпорация", label: "Оффшорная корпорация (5)" },
  { value: "Влиятельные политические деятели (отечественные)", label: "Влиятельные политические деятели (отечественные) (5)" },
  { value: "Влиятельные политические деятели (иностранные)", label: "Влиятельные политические деятели (иностранные) (5)" },
  { value: "Торговля предметами искусства/антиквариата", label: "Торговля предметами искусства/антиквариата (5)" },
  { value: "Владелец ресторана/бара/ночного клуба/гостиницы", label: "Владелец ресторана/бара/ночного клуба/гостиницы (5)" },
  { value: "Агентство по экспорту/импорту", label: "Агентство по экспорту/импорту (5)" },
  { value: "Инвестор денежных средств (Ежемесячные денежные инвестиции> 2 миллиона сомони)", label: "Инвестор денежных средств (Ежемесячные денежные инвестиции> 2 миллиона сомони) (5)" },
  { value: "Брокер акций/фондовый брокер", label: "Брокер акций/фондовый брокер (5)" },
  { value: "Бизнес по экспорту рабочей силы", label: "Бизнес по экспорту рабочей силы (5)" },
  { value: "Операции в нескольких местах", label: "Операции в нескольких местах (5)" },
  { value: "Продюсерское агентство/распространение кинофильмов", label: "Продюсерское агентство/распространение кинофильмов (5)" },
  { value: "Торговля оружием", label: "Торговля оружием (5)" },
  { value: "Оператор мобильной связи", label: "Оператор мобильной связи (5)" },
  { value: "Торговля (Годовой оборот более 10 миллионов сомони)", label: "Торговля (Годовой оборот более 10 миллионов сомони) (5)" },
  { value: "Туристическое агентство", label: "Туристическое агентство (5)" },
  { value: "Работники иностранных компаний", label: "Работники иностранных компаний (5)" }
];

const netWorthOptions = [
  { value: "0-5 млн.", label: "0-5 млн. (0)" },
  { value: "5-20 млн.", label: "5-20 млн. (1)" },
  { value: "> 20 млн.", label: "> 20 млн. (5)" }
];

const accountOpeningOptions = [
  { value: "Со стороны менеджера по связям / руководителя филиала", label: "Со стороны менеджера по связям / руководителя филиала (0)" },
  { value: "Агентом по прямым продажам", label: "Агентом по прямым продажам (1)" },
  { value: "Через интернет", label: "Через интернет (3)" },
  { value: "Личное посещение / по собственной инициативе", label: "Личное посещение / по собственной инициативе (5)" }
];

const expectedTransactionAmountOptions = [
  { value: "0-10 млн.", label: "0-10 млн. (0)" },
  { value: "0-5 млн.", label: "0-5 млн. (0)" },
  { value: "10-50 млн.", label: "10-50 млн. (1)" },
  { value: "5-20 млн.", label: "5-20 млн. (1)" },
  { value: "> 50 млн.", label: "> 50 млн. (5)" },
  { value: "> 20 млн.", label: "> 20 млн. (5)" }
];

const expectedTransactionCountOptions = [
  { value: "0-100", label: "0-100 (0)" },
  { value: "0-20", label: "0-20 (0)" },
  { value: "101-250", label: "101-250 (1)" },
  { value: "21-50", label: "21-50 (1)" },
  { value: "> 250", label: "> 250 (5)" },
  { value: "> 50", label: "> 50 (5)" }
];

const expectedCashAmountOptions = [
  { value: "0-10 млн.", label: "0-10 млн. (0)" },
  { value: "0-2 млн.", label: "0-2 млн. (0)" },
  { value: "10-25 млн.", label: "10-25 млн. (1)" },
  { value: "2-7 млн.", label: "2-7 млн. (1)" },
  { value: "> 25 млн.", label: "> 25 млн. (5)" },
  { value: "> 7 млн.", label: "> 7 млн. (5)" }
];

const expectedCashCountOptions = [
  { value: "0-15", label: "0-15 (0)" },
  { value: "0-5", label: "0-5 (0)" },
  { value: "16-30", label: "16-30 (1)" },
  { value: "6-10", label: "6-10 (1)" },
  { value: "> 30", label: "> 30 (5)" },
  { value: "> 10", label: "> 10 (5)" }
];

const complianceOptionFallbacks = {
    client_occupation: occupationOptions,
    net_worth: netWorthOptions,
    monthly_income: accountOpeningOptions,
    total_outgoing_transactions_amount: expectedTransactionAmountOptions,
    total_outgoing_transactions_count: expectedTransactionCountOptions,
    total_cash_transactions_amount: expectedCashAmountOptions,
    total_cash_transactions_count: expectedCashCountOptions,
};

const extractSection = (text, startKeywords, endKeywords) => {
    const lowerText = text.toLowerCase();
    let startIdx = -1;
    for (const kw of startKeywords) {
        const idx = lowerText.indexOf(kw.toLowerCase());
        if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
            startIdx = idx + kw.length;
        }
    }
    if (startIdx === -1) return "";

    let endIdx = -1;
    for (const kw of endKeywords) {
        const idx = lowerText.indexOf(kw.toLowerCase(), startIdx);
        if (idx !== -1 && (endIdx === -1 || idx < endIdx)) {
            endIdx = idx;
        }
    }
    
    return endIdx !== -1 ? text.substring(startIdx, endIdx) : text.substring(startIdx);
};

const findDateNearKeyword = (text, keywords) => {
    const dateRegex = /\b(\d{2})\.(\d{2})\.(\d{4})\b/g;
    let match;
    let bestMatch = null;
    let minDistance = Infinity;

    const keywordPositions = [];
    keywords.forEach(kw => {
        let index = -1;
        const lowerText = text.toLowerCase();
        const lowerKw = kw.toLowerCase();
        while ((index = lowerText.indexOf(lowerKw, index + 1)) !== -1) {
            keywordPositions.push(index);
        }
    });

    dateRegex.lastIndex = 0;
    while ((match = dateRegex.exec(text)) !== null) {
        const dateIndex = match.index;
        
        if (keywordPositions.length > 0) {
            keywordPositions.forEach(kwPos => {
                const distance = Math.abs(dateIndex - kwPos);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = `${match[3]}-${match[2]}-${match[1]}`;
                }
            });
        } else {
            if (minDistance === Infinity) {
                bestMatch = `${match[3]}-${match[2]}-${match[1]}`;
            }
        }
    }
    return bestMatch;
};

export default function GiftCard({ edit = false }) {
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadingOffer, setDownloadingOffer] = useState(false);
    const [downloadingCompliance, setDownloadingCompliance] = useState(false);
    const [searching, setSearching] = useState(false);
    const [alert, setAlert] = useState(null);
    const [terrorCheckResults, setTerrorCheckResults] = useState({
        fullName: null,
        cardName: null
    });
    const [checkingTerror, setCheckingTerror] = useState({
        fullName: false,
        cardName: false
    });
    const { data, errors, setData, validate, setDataMore } = useFormStore();
    const navigate = useNavigate();
    const { id } = useParams();

    const terrorCheckTimeoutRefs = {
        fullName: useRef(null),
        cardName: useRef(null)
    };

    // 🔐 Вспомогательная функция для получения заголовков с токеном
    const getAuthHeaders = () => {
        const token = localStorage.getItem("access_token");
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    };

    // ИСПРАВЛЕННАЯ функция для проверки в списке террористов
    const checkTerrorList = useCallback(async (name, birthDate, type) => {
        if (!name || name.trim().length < 2) {
            setTerrorCheckResults(prev => ({ ...prev, [type]: null }));
            setCheckingTerror(prev => ({ ...prev, [type]: false }));
            return;
        }

        if (data.application_status_id === 8) {
            setTerrorCheckResults(prev => ({ ...prev, [type]: false }));
            setCheckingTerror(prev => ({ ...prev, [type]: false }));
            return;
        }

        try {
            setCheckingTerror(prev => ({ ...prev, [type]: true }));
            const token = localStorage.getItem("access_token");

            if (!token) {
                console.error("Токен не найден");
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/terror-list/check`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name: name.trim(),
                    bday: birthDate?.trim() || "",
                }),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setTerrorCheckResults(prev => ({ ...prev, [type]: false }));
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } else {
                const result = await response.json();
                setTerrorCheckResults(prev => ({ ...prev, [type]: result.is_match }));
            }
        } catch (error) {
            console.error(`Ошибка при проверке списка террористов (${type}):`, error);
            setTerrorCheckResults(prev => ({ ...prev, [type]: null }));
        } finally {
            setCheckingTerror(prev => ({ ...prev, [type]: false }));
        }
    }, [data.application_status_id]);

    // Debounced проверка для полного имени (ФИО)
    const debouncedCheckFullName = useCallback((fullName, birthDate) => {
        if (terrorCheckTimeoutRefs.fullName.current) {
            clearTimeout(terrorCheckTimeoutRefs.fullName.current);
        }

        terrorCheckTimeoutRefs.fullName.current = setTimeout(async () => {
            await checkTerrorList(fullName, birthDate, "fullName");
        }, 800);
    }, [checkTerrorList]);

    // Debounced проверка для имени на карте
    const debouncedCheckCardName = useCallback((cardName) => {
        if (terrorCheckTimeoutRefs.cardName.current) {
            clearTimeout(terrorCheckTimeoutRefs.cardName.current);
        }

        terrorCheckTimeoutRefs.cardName.current = setTimeout(async () => {
            await checkTerrorList(cardName, data.birth_date, "cardName");
        }, 800);
    }, [checkTerrorList, data.birth_date]);

    // НОВЫЙ обработчик для изменения даты рождения
    const handleBirthDateChange = (value) => {
        setData("birth_date", value);

        if (data.application_status_id === 8) return;

        // Собираем полное ФИО
        const fullName = `${data.surname || ''} ${data.name || ''} ${data.patronymic || ''}`.trim();
        if (fullName.length >= 2) {
            debouncedCheckFullName(fullName, value);
        }

        if (data.card_name && data.card_name.trim().length >= 2) {
            debouncedCheckCardName(data.card_name.trim());
        }
    };

    // Состояния для работы с несколькими клиентами
    const [foundClients, setFoundClients] = useState([]);
    const [showClientSelector, setShowClientSelector] = useState(false);
    const [selectedClientIndex, setSelectedClientIndex] = useState(0);

    // Состояние для выбора типа SMS
    const [showSMSType, setShowSMSType] = useState(false);
    const [smsTypes] = useState([
        { value: "accepted", label: "Заявка принята" },
        { value: "rejected", label: "Заявка отклонена" },
        { value: "card_opened", label: "Карта успешно открыта" },
    ]);
    const [complianceOptions, setComplianceOptions] = useState(complianceOptionFallbacks);
    const [complianceScoreByValue, setComplianceScoreByValue] = useState(complianceScores);

    // PIN states
    const [pinModalClient, setPinModalClient] = useState(null);
    const [clientPin, setClientPin] = useState("");
    const [verifyingPin, setVerifyingPin] = useState(false);

    // --- NEW STATES FOR REFACTORING ---
    const [appOffices, setAppOffices] = useState([]);
    
    useEffect(() => {
        const fetchOffices = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/application-offices`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const officesData = await res.json();
                    setAppOffices(Array.isArray(officesData) ? officesData : []);
                }
            } catch (err) {
                console.error("Ошибка загрузки офисов:", err);
            }
        };
        fetchOffices();
    }, []);

    useEffect(() => {
        if (data.passport_issued_at) {
            const issued = new Date(data.passport_issued_at);
            if (!isNaN(issued)) {
                const deadline = new Date(issued);
                deadline.setFullYear(deadline.getFullYear() + 10);
                deadline.setDate(deadline.getDate() - 1);
                const formatted = deadline.toISOString().split("T")[0];
                if (data.passport_deadline !== formatted) {
                    setData("passport_deadline", formatted);
                }
            }
        }
    }, [data.passport_issued_at]);
    // ----------------------------------


    const ValidData = {
        surname: { required: true },
        name: { required: true },
        phone_number: { required: true },
    };

    const showAlert = (message, type = "error", duration = 5000) => {
        setAlert({ message, type, duration });
    };

    const closeAlert = () => {
        setAlert(null);
    };

    const handleSMSChange = (value) => {
        setData("is_new_client", value);
        setShowSMSType(value);
        if (!value) {
            setData("message_type", "nosms");
            setData("rejection_reason", "");
        } else {
            setData("message_type", "");
        }
    };

    const handleSMSTypeChange = (value) => {
        setData("message_type", value);
        if (value !== "rejected") {
            setData("rejection_reason", "");
        }
    };

    // ИСПРАВЛЕННЫЙ обработчик для изменения имени, фамилии и отчества с проверкой террористов
    const handleNameChange = (field, value) => {
        setData(field, value);

        if (data.application_status_id === 8) return;

        // Получаем текущие значения всех полей ФИО
        const surname = field === 'surname' ? value : data.surname || '';
        const name = field === 'name' ? value : data.name || '';
        const patronymic = field === 'patronymic' ? value : data.patronymic || '';

        // Собираем полное ФИО
        const fullName = `${surname} ${name} ${patronymic}`.trim();

        if (fullName.length >= 2) {
            debouncedCheckFullName(fullName, data.birth_date);
        } else {
            setTerrorCheckResults(prev => ({ ...prev, fullName: null }));
        }
    };

    const handleCardNameChange = (value) => {
        setData("card_name", value);

        if (data.application_status_id === 8) return;

        if (value && value.trim().length >= 2) {
            debouncedCheckCardName(value.trim());
        } else {
            setTerrorCheckResults(prev => ({ ...prev, cardName: null }));
        }
    };

    const loadClientDetails = async (clientCode) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;

            const response = await fetch(
                `${backendUrl}/addresses?clientIndex=${clientCode}`,
                {
                    method: "GET",
                    headers: getAuthHeaders(), // 🔐 Используем функцию с токеном
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const clientDetails = await response.json();
            return clientDetails;
        } catch (error) {
            console.error("Ошибка при загрузке деталей клиента:", error);
            throw error;
        }
    };

    const fillFormWithClientData = async (clientData) => {
        setData("surname", clientData.surname || "");
        setData("name", clientData.name || "");
        setData("patronymic", clientData.patronymic || "");
        setData("phone_number", clientData.phone || "");

        const cardName = `${clientData.ltn_name || ""} ${clientData.ltn_surname || ""
            }`.trim();
        setData("card_name", cardName);

        const docType = docTypes.find(
            (item) => item.label === clientData.identdoc_name
        );
        if (docType) {
            setData("type_of_certificate", docType.value);
        }

        setData("documents_series", clientData.identdoc_series || "");
        setData("document_number", clientData.identdoc_num || "");

        if (clientData.identdoc_date) {
            const dateParts = clientData.identdoc_date.split(".");
            if (dateParts.length === 3) {
                const formattedDate = `${dateParts[2]}-${dateParts[1].padStart(
                    2,
                    "0"
                )}-${dateParts[0].padStart(2, "0")}`;
                setData("passport_issued_at", formattedDate);
            }
        }

        setData("issued_by", clientData.identdoc_orgname || "");
        setData("inn", clientData.tax_code || "");
        setData("client_code", clientData.client_code || "");

        try {
            setSearching(true);
            const clientDetails = await loadClientDetails(clientData.client_code);

            if (clientDetails.birth_date) {
                const birthDate = new Date(clientDetails.birth_date);
                const formattedBirthDate = birthDate.toISOString().split("T")[0];
                setData("birth_date", formattedBirthDate);
            }

            if (clientDetails.is_resident !== undefined) {
                setData("is_resident", clientDetails.is_resident);
            }

            if (clientDetails.country && clientDetails.country.Name) {
                setData("country", clientDetails.country.Name);
            }

            if (clientDetails.sex === "M") {
                setData("gender", true);  // Муж
            } else if (clientDetails.sex === "F") {
                setData("gender", false); // Жен
            }

            if (
                clientDetails.detailed_addresses &&
                clientDetails.detailed_addresses.length > 0
            ) {
                const address = clientDetails.detailed_addresses[0];

                if (address.region) {
                    setData("region", address.region);
                }

                if (address.city) {
                    setData("populated", address.city);
                }

                if (address.district) {
                    setData("district", address.district);
                }

                if (address.street) {
                    setData("street", address.street);
                }

                if (address.house_number) {
                    setData("house_number", address.house_number);
                }

                if (address.flat && address.flat !== "0") {
                    setData("apartment_number", address.flat);
                }

                if (address.country) {
                    setData("country", address.country);
                }
            }

            if (clientDetails.tax_identification_number) {
                setData("inn", clientDetails.tax_identification_number);
            }

            if (clientDetails.name) {
                setData("surname", clientDetails.last_name || clientDetails.name || "");
            }

            if (clientDetails.first_name) {
                setData("name", clientDetails.first_name || "");
            }

            if (clientDetails.middle_name) {
                setData("patronymic", clientDetails.middle_name || "");
            }

            if (clientDetails.swift_name) {
                setData("card_name", clientDetails.swift_name);
            } else if (
                clientDetails.latin_first_name &&
                clientDetails.latin_last_name
            ) {
                setData(
                    "card_name",
                    `${clientDetails.latin_first_name} ${clientDetails.latin_last_name}`
                );
            }

            // ИСПРАВЛЕНО: Проверяем полное ФИО (с отчеством) в списке террористов
            const fullName = `${clientDetails.last_name || ""} ${clientDetails.first_name || ""} ${clientDetails.middle_name || ""}`.trim();
            const birthDate = clientDetails.birth_date ? new Date(clientDetails.birth_date).toISOString().split("T")[0] : null;

            if (data.application_status_id !== 8) {
                if (fullName.length >= 2) {
                    debouncedCheckFullName(fullName, birthDate);
                }

                const cardNameForCheck = clientDetails.swift_name ||
                    `${clientDetails.latin_first_name || ""} ${clientDetails.latin_last_name || ""}`.trim();
                if (cardNameForCheck.length >= 2) {
                    await checkTerrorList(cardNameForCheck, birthDate, "cardName");
                }
            } else {
                setTerrorCheckResults({ fullName: false, cardName: false });
            }

            showAlert("Данные клиента успешно загружены из АБС", "success", 5000);
        } catch (error) {
            console.error("Ошибка при загрузке деталей клиента:", error);
            showAlert("Основные данные загружены, но не удалось загрузить детали клиента", "warning", 5000);
        } finally {
            setSearching(false);
        }
    };
    
    const parsePassportText = (text) => {
        // ─── MRZ PARSING (most reliable source) ──────────────────────────────
        // Tajik ID card MRZ format:
        //   Line 1: IDTJK<series><docnum8><check><INN13><<
        //   Line 2: YYMMDD<check><sex><YYMMDD><check><nationality><<<<<<<<<
        //   Line 3: SURNAME<<FIRSTNAME<<<<<<<<<<<<<<<<<<

        let mrzSurname = "", mrzName = "";
        let mrzDocSeries = "", mrzDocNum = "", mrzINN = "";
        let mrzBirthDate = null, mrzExpiryDate = null, mrzGender = null;

        // MRZ line 3: SURNAME<<NAME<<<...
        const mrzLine3Match = text.match(/([A-Z]{2,})<<+([A-Z]{2,})/);
        if (mrzLine3Match) {
            mrzSurname = mrzLine3Match[1];
            mrzName    = mrzLine3Match[2];
        }

        // MRZ line 2: 7-digit DOB + sex + 7-digit expiry + country code
        const mrzLine2Match = text.match(/\b(\d{7})([MF])(\d{7})(TJK|UZB|KGZ|KAZ|RUS|UKR)\b/);
        if (mrzLine2Match) {
            const parseMrzDate = (yymmdd) => {
                const yy = parseInt(yymmdd.substring(0, 2), 10);
                const mm = yymmdd.substring(2, 4);
                const dd = yymmdd.substring(4, 6);
                const fullYear = yy > 30 ? 1900 + yy : 2000 + yy;
                return `${fullYear}-${mm}-${dd}`;
            };
            mrzBirthDate  = parseMrzDate(mrzLine2Match[1].substring(0, 6));
            mrzGender     = mrzLine2Match[2] === "F"; // true = female
            mrzExpiryDate = parseMrzDate(mrzLine2Match[3].substring(0, 6));
        }

        // MRZ line 1: IDTJK + series(1) + docnum(8) + INN(13)
        const mrzLine1Match = text.match(/IDTJK([A-Z])(\d{8})\d?(\d{13})/);
        if (mrzLine1Match) {
            mrzDocSeries = mrzLine1Match[1];
            mrzDocNum    = mrzLine1Match[2];
            mrzINN       = mrzLine1Match[3];
        }

        // ─── CYRILLIC NAMES from text sections ────────────────────────────────
        const getCyrillicWord = (secText) => {
            if (!secText) return "";
            const match = secText.match(/[А-ЯЁҶӢҲӮҚҒ]{2,}/);
            return match ? match[0] : "";
        };

        // Surname: section from "Насаб / Surname" up to "Ном /" or the Latin surname
        // Use long boundary keywords to avoid "Ном" matching inside "Шиноснома"
        const stopForSurname = ["Ном /", "/ Name", "\nKARIMOV", "\nBEZHAN"];
        if (mrzSurname) stopForSurname.push("\n" + mrzSurname);
        const surnameSec = extractSection(text,
            ["Насаб /", "Haca6 /", "Насаб/", "Surname\n"],
            stopForSurname
        );
        const surnameCyr = getCyrillicWord(surnameSec);

        // Name: section from "/ Name\n\n" to "Номи падар"
        // The Cyrillic name appears after the Latin surname on its own line
        const nameSec = extractSection(text,
            ["/ Name\n\n", "Name\n\n"],
            ["Номи падар", "Father's name", "Document No", "Раками шиноснома"]
        );
        let nameCyr = getCyrillicWord(nameSec);

        // Patronymic: between "Номи падар" and gender/nationality
        const patronymicSec = extractSection(text,
            ["Номи падар", "Father's name", "Father's naте"],
            ["Ҷинс", "Sex\n", "Nationality", "Шаҳрвандӣ"]
        );
        const patronymicCyr = getCyrillicWord(patronymicSec);

        // ─── DOCUMENT NUMBER ─────────────────────────────────────────────────
        let series = mrzDocSeries, docNum = mrzDocNum;
        if (!series || !docNum) {
            const passportMatch = text.match(/\b([A-Z]{1})(\d{7,8})\b/);
            if (passportMatch) { series = passportMatch[1]; docNum = passportMatch[2]; }
        }

        // ─── INN ──────────────────────────────────────────────────────────────
        let inn = mrzINN;
        if (!inn) {
            const taxMatch = text.match(/Tax Payer ID number\s+(\d{9,13})/i);
            if (taxMatch) inn = taxMatch[1];
            else { const m13 = text.match(/\b(\d{13})\b/); if (m13) inn = m13[1]; }
        }

        // ─── DATES ────────────────────────────────────────────────────────────
        // MRZ dates are unambiguous; use keyword proximity only as fallback
        const birthDate  = mrzBirthDate  || findDateNearKeyword(text, ['date of birth', 'санаи таваллуд']);
        const issuedAt   = findDateNearKeyword(text, ['date of issue', 'огози эътибор', 'оғози эътибор']);
        const expiryDate = mrzExpiryDate || findDateNearKeyword(text, ['date of expiry', 'анҷоми эътибор']);

        // ─── GENDER ───────────────────────────────────────────────────────────
        let gender = true; // default male
        if (mrzGender !== null) {
            gender = !mrzGender; // mrzGender true=female → gender false=female
        } else {
            const sexSec = extractSection(text, ["Sex\n", "Ҷинс /"], ["Date of issue", "Огози"]);
            if (sexSec) {
                const ls = sexSec.toLowerCase();
                gender = !(ls.includes('f') || ls.includes('з') || ls.includes('ж'));
            }
        }

        // ─── PLACE OF BIRTH ───────────────────────────────────────────────────
        let placeOfBirth = "";
        const birthPlaceSec = extractSection(text,
            ["Place of birth\n", "Ҷои таваллуд /\n", "Ҷои таваллуд\n"],
            ["Раками ягонаи", "National ID", "ИНН"]
        );
        if (birthPlaceSec) {
            placeOfBirth = birthPlaceSec.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
            placeOfBirth = placeOfBirth.replace(/[^А-ЯЁҶӢҲӮқғA-Z\s]/gi, '').trim();
        }

        // ─── CITY FROM ADDRESS (back side) ───────────────────────────────────
        const addrSec = extractSection(text,
            ["Address\n\n", "Нишони /\n\nAddress\n\n"],
            ["Вазъи оилавй", "Marital status"]
        );
        if (addrSec) {
            const cityMatch = addrSec.match(/ШАҲРИ\s+([А-ЯЁҶӢҲӮҚҒ]+)/i);
            if (cityMatch) setData("city", cityMatch[1]);
        }

        // ─── ISSUING AUTHORITY (back side) ───────────────────────────────────
        const issuingSec = extractSection(text,
            ["Issuing Authority\n\n", "Мақоми шиносномадиҳанда /\n\n"],
            ["Tax Payer", "ШВКД", "DMIA"]
        );
        if (issuingSec) {
            const issuingTrimmed = issuingSec.replace(/[\r\n]+/g, ' ').trim();
            if (issuingTrimmed) setData("issued_by", issuingTrimmed);
        }

        // ─── CARD NAME ────────────────────────────────────────────────────────
        let cardName = "";
        if (mrzName && mrzSurname) {
            cardName = `${mrzName} ${mrzSurname}`.toUpperCase();
        } else if (nameCyr && surnameCyr) {
            cardName = `${nameCyr} ${surnameCyr}`.toUpperCase();
        }

        // ─── APPLY TO FORM ────────────────────────────────────────────────────
        if (surnameCyr)     setData("surname",            surnameCyr);
        if (nameCyr)        setData("name",               nameCyr);
        if (patronymicCyr)  setData("patronymic",         patronymicCyr);
        if (cardName)       setData("card_name",          cardName);
        if (series)         setData("documents_series",   series);
        if (docNum)         setData("document_number",    docNum);
        if (inn)            setData("inn",                inn);
        if (birthDate)      setData("birth_date",         birthDate);
        if (issuedAt)       setData("passport_issued_at", issuedAt);
        if (expiryDate)     setData("passport_deadline",  expiryDate);
        if (placeOfBirth)   setData("place_of_birth",     placeOfBirth);
        setData("gender", gender);

        setData("type_of_certificate", 58);
        setData("is_resident",  true);
        setData("citizenship",  "Таджикистан");
        setData("nationality",  "Таджик");
        setData("country",      "Таджикистан");
    };

    const handleRecognizePassport = async () => {
        if (!data.front_side_of_the_passport_file && !data.back_side_of_the_passport_file) {
            showAlert("Пожалуйста, загрузите хотя бы одну сторону паспорта (лицевую или оборотную)", "warning");
            return;
        }

        setLoading(true);
        try {
            const loginResponse = await fetch("http://10.65.10.22:5220/api/Auth/login", {
                method: "POST",
                headers: {
                    "accept": "text/plain",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: "admin",
                    password: "Asdf112#"
                })
            });

            if (!loginResponse.ok) {
                throw new Error(`Ошибка авторизации в сервисе распознавания: ${loginResponse.status}`);
            }

            const loginResult = await loginResponse.json();
            const jwtToken = loginResult.data;
            if (!jwtToken) {
                throw new Error("Не удалось получить токен авторизации");
            }

            let combinedText = "";

            if (data.front_side_of_the_passport_file) {
                const frontFormData = new FormData();
                frontFormData.append("DepartmentId", "2");
                frontFormData.append("CreatedAt", new Date().toISOString());
                frontFormData.append("File", data.front_side_of_the_passport_file);

                const frontResponse = await fetch("http://10.65.10.22:5220/api/Passport", {
                    method: "POST",
                    headers: {
                        "accept": "text/plain",
                        "Authorization": `Bearer ${jwtToken}`
                    },
                    body: frontFormData
                });

                if (frontResponse.ok) {
                    const frontResult = await frontResponse.json();
                    if (frontResult.data && frontResult.data.data) {
                        combinedText += "\n--- FRONT SIDE ---\n" + frontResult.data.data;
                    }
                } else {
                    console.error("Ошибка распознавания лицевой стороны:", frontResponse.status);
                }
            }

            if (data.back_side_of_the_passport_file) {
                const backFormData = new FormData();
                backFormData.append("DepartmentId", "2");
                backFormData.append("CreatedAt", new Date().toISOString());
                backFormData.append("File", data.back_side_of_the_passport_file);

                const backResponse = await fetch("http://10.65.10.22:5220/api/Passport", {
                    method: "POST",
                    headers: {
                        "accept": "text/plain",
                        "Authorization": `Bearer ${jwtToken}`
                    },
                    body: backFormData
                });

                if (backResponse.ok) {
                    const backResult = await backResponse.json();
                    if (backResult.data && backResult.data.data) {
                        combinedText += "\n--- BACK SIDE ---\n" + backResult.data.data;
                    }
                } else {
                    console.error("Ошибка распознавания обратной стороны:", backResponse.status);
                }
            }

            if (!combinedText.trim()) {
                throw new Error("Не удалось получить текст распознавания ни с одной стороны");
            }

            parsePassportText(combinedText);
            showAlert("Данные паспорта успешно распознаны и заполнены", "success");
        } catch (error) {
            console.error("Ошибка при распознавании паспорта:", error);
            showAlert(`Ошибка распознавания: ${error.message || error}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const checkPinRequired = async (clientCode) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/agent-client-pin/check?clientCode=${clientCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                return result.requires_pin;
            }
        } catch (error) {
            console.error("Error checking PIN requirement", error);
        }
        return false;
    };

    const handleVerifyPin = async () => {
        if (!clientPin || clientPin.length !== 5) {
            showAlert("Введите 5-значный PIN", "error", 3000);
            return;
        }
        setVerifyingPin(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/agent-client-pin/verify`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ client_code: pinModalClient.client_code, pin: clientPin })
            });
            if (response.ok) {
                await fillFormWithClientData(pinModalClient);
                setPinModalClient(null);
                setClientPin("");
                showAlert("Данные клиента успешно загружены", "success", 5000);
            } else {
                showAlert("Неверный PIN-код", "error", 5000);
            }
        } catch (error) {
            showAlert("Ошибка проверки PIN", "error", 5000);
        } finally {
            setVerifyingPin(false);
        }
    };

    const handleSearchClient = async () => {
        if (!data.phone_number) {
            showAlert("Пожалуйста, заполните поле 'Телефон'", "error", 5000);
            return;
        }

        let phoneNumber = data.phone_number.trim();
        phoneNumber = phoneNumber.replace(/\D/g, "");

        try {
            setSearching(true);
            const backendUrl = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;

            const response = await fetch(
                `${backendUrl}/client/info?phoneNumber=${phoneNumber}`,
                {
                    method: "GET",
                    headers: getAuthHeaders(), // 🔐 Используем функцию с токеном
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    showAlert("Клиенты не найдены в АБС", "error", 5000);
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                setFoundClients([]);
                return;
            }

            const clientsData = await response.json();

            if (clientsData.length === 0) {
                showAlert("Клиенты не найдены в АБС", "error", 5000);
                setFoundClients([]);
                return;
            }

            setFoundClients(clientsData);

            if (clientsData.length === 1) {
                const client = clientsData[0];
                const needsPin = await checkPinRequired(client.client_code);
                if (needsPin) {
                    setPinModalClient(client);
                } else {
                    await fillFormWithClientData(client);
                    showAlert("Данные клиента успешно загружены из АБС", "success", 5000);
                }
            } else {
                setSelectedClientIndex(0);
                setShowClientSelector(true);
                showAlert(
                    `Найдено ${clientsData.length} клиентов. Выберите нужного.`,
                    "info",
                    5000
                );
            }
        } catch (error) {
            console.error("Ошибка при поиске клиента в АБС:", error);
            showAlert("Произошла ошибка при поиске клиента в АБС", "error", 5000);
            setFoundClients([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectClient = async (clientIndex) => {
        const client = foundClients[clientIndex];
        if (client) {
            setShowClientSelector(false);
            const needsPin = await checkPinRequired(client.client_code);
            if (needsPin) {
                setPinModalClient(client);
            } else {
                await fillFormWithClientData(client);
                showAlert(
                    `Данные клиента ${clientIndex + 1} успешно загружены`,
                    "success",
                    5000
                );
            }
        }
    };

    const formatDateForBackend = (dateStr) => {
        if (!dateStr) return "";
        try {
            const parsed = new Date(dateStr);
            if (isNaN(parsed.getTime())) {
                const match = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})/);
                if (match) {
                    const parsedMatch = new Date(`${match[3]}-${match[2]}-${match[1]}`);
                    if (!isNaN(parsedMatch.getTime())) {
                        return parsedMatch.toISOString();
                    }
                }
                return dateStr;
            }
            return parsed.toISOString();
        } catch (e) {
            return dateStr;
        }
    };

    const downloadFile = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const downloadPoll = async (applicationId) => {
        try {
            setDownloading(true);
            const automationUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${automationUrl}/automation/poll`, {
                method: "POST",
                headers: getAuthHeaders(), // 🔐 Используем функцию с токеном
                body: JSON.stringify({
                    application_ids: [applicationId],
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const filename = `poll_${applicationId}.zip`;
            downloadFile(blob, filename);

            showAlert("Анкета успешно скачана!", "success", 4000);
        } catch (error) {
            console.error("Ошибка скачивания анкеты:", error);
            showAlert("Произошла ошибка при скачивании анкеты", "error", 5000);
        } finally {
            setDownloading(false);
        }
    };

    const downloadOffer = async (applicationId) => {
        try {
            setDownloadingOffer(true);
            const automationUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${automationUrl}/automation/offer`, {
                method: "POST",
                headers: getAuthHeaders(), // 🔐 Используем функцию с токеном
                body: JSON.stringify({
                    application_ids: [applicationId],
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const filename = `offer_${applicationId}.docx`;
            downloadFile(blob, filename);

            showAlert("Оферта успешно скачана!", "success", 4000);
        } catch (error) {
            console.error("Ошибка скачивания оферты:", error);
            showAlert("Произошла ошибка при скачивании оферты", "error", 5000);
        } finally {
            setDownloadingOffer(false);
        }
    };

    const downloadCompliance = async (applicationId) => {
        try {
            setDownloadingCompliance(true);
            const automationUrl = import.meta.env.VITE_BACKEND_URL;

            const response = await fetch(`${automationUrl}/automation/compliance`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    application_ids: [applicationId],
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const filename = `compliance_${applicationId}.docx`;
            downloadFile(blob, filename);

            showAlert("Анкета комплаенс успешно скачана!", "success", 4000);
        } catch (error) {
            console.error("Ошибка скачивания анкеты комплаенс:", error);
            showAlert("Произошла ошибка при скачивании анкеты комплаенс", "error", 5000);
        } finally {
            setDownloadingCompliance(false);
        }
    };

    const handleSaveAndDownloadCompliance = async () => {
        const saved = await onSend(false, false, null, true, true);
        if (!saved) {
            return;
        }
    };

    const validateOfferFields = () => {
        const requiredFields = [
            { field: "product", label: "Продукт" },
            { field: "account_usd", label: "Счет USD" },
            { field: "account_eur", label: "Счет EUR" },
            { field: "account_tjs", label: "Счет TJS" },
            { field: "contract_number", label: "Номер договора" },
            { field: "contract_date", label: "Дата договора" },
        ];

        for (const { field, label } of requiredFields) {
            if (!data[field] || data[field].toString().trim() === "") {
                showAlert(`Заполните поле: ${label}`, "error", 5000);
                return false;
            }
        }

        if (!data.visa_card && !data.mc_card && !data.nc_card) {
            showAlert("Выберите тип карты", "error", 5000);
            return false;
        }

        return true;
    };

    const handleSaveAndDownload = async () => {
        const saved = await onSend(true, false);
        if (!saved) {
            return;
        }
    };

    const handleSaveAndDownloadOffer = async () => {
        if (!validateOfferFields()) {
            return;
        }

        const saved = await onSend(false, true);
        if (!saved) {
            return;
        }
    };

    const onSend = async (isForPoll = false, isForOffer = false, statusId = null, skipNavigate = false, isForCompliance = false) => {
        if (data.application_status_id === 7 && statusId !== 7) {
            showAlert("Нельзя изменять/сохранять заявку со статусом 'Не одобрено'. Дождитесь решения комплаенса.", "error", 5000);
            return false;
        }

        const isValid = validate(ValidData);
        if (!isValid) {
            showAlert("Пожалуйста, заполните все обязательные поля (Имя, Фамилия, Номер телефона) перед отправкой", "error", 5000);
            return false;
        }

        if (data.is_new_client) {
            if (!data.message_type) {
                showAlert("Выберите тип SMS для отправки", "error", 5000);
                return false;
            }
            if (data.message_type === "rejected" && !data.rejection_reason) {
                showAlert("Укажите причину отклонения заявки", "error", 5000);
                return false;
            }
        }

        try {
            const formData = new FormData();

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

            const safeTrim = (value) => {
                return value ? value.toString().trim() : "";
            };

            const fieldsToAppend = [
                { key: "name", value: safeTrim(data.name) },
                { key: "surname", value: safeTrim(data.surname) },
                { key: "patronymic", value: safeTrim(data.patronymic) },
                { key: "gender", value: data.gender === true ? "Муж" : "Жен" },
                { key: "client_index", value: safeTrim(data.client_index) },
                { key: "issued_by", value: safeTrim(data.issued_by) },
                {
                    key: "issued_at",
                    value: formatDateForBackend(data.passport_issued_at),
                },
                { key: "birth_date", value: formatDateForBackend(data.birth_date) },
                { key: "phone_number", value: safeTrim(data.phone_number) },
                { key: "secret_word", value: safeTrim(data.secret_word) },
                { key: "card_name", value: safeTrim(data.card_name) },
                {
                    key: "card_code",
                    value: data.visa_card || data.mc_card || data.nc_card || "",
                },
                {
                    key: "type_of_certificate",
                    value: data.type_of_certificate ? +data.type_of_certificate : "",
                },
                { key: "documents_series", value: safeTrim(data.documents_series) },
                { key: "document_number", value: safeTrim(data.document_number) },
                {
                    key: "passport_issued_at",
                    value: formatDateForBackend(data.passport_issued_at),
                },
                { key: "inn", value: safeTrim(data.inn) },
                { key: "country", value: safeTrim(data.country) },
                { key: "email", value: safeTrim(data.email) },
                { key: "region", value: safeTrim(data.region) },
                { key: "population_type", value: safeTrim(data.population_type) },
                { key: "populated", value: safeTrim(data.populated) },
                { key: "district", value: safeTrim(data.district) },
                { key: "street_type", value: safeTrim(data.street_type) },
                { key: "street", value: safeTrim(data.street) },
                { key: "house_number", value: safeTrim(data.house_number) },
                { key: "corpus", value: safeTrim(data.corpus) },
                { key: "apartment_number", value: safeTrim(data.apartment_number) },
                { key: "client_code", value: safeTrim(data.client_code) },
                { key: "is_resident", value: String(!!data.is_resident) },
                { key: "is_new_client", value: String(!!data.is_new_client) },
                { key: "identity_verified", value: String(!!data.identity_verified) },
                { key: "virtual", value: String(!!data.virtual) },
                { key: "receiving_office", value: safeTrim(data.receiving_office) },
                {
                    key: "delivery_address",
                    value: `${safeTrim(data.country)}, ${safeTrim(
                        data.region
                    )}, ${safeTrim(data.populated)}, ${safeTrim(data.street)} ${safeTrim(
                        data.house_number
                    )}`,
                },
                { key: "message_type", value: safeTrim(data.message_type) },
                { key: "product", value: safeTrim(data.product) },
                { key: "account_usd", value: safeTrim(data.account_usd) },
                { key: "account_eur", value: safeTrim(data.account_eur) },
                { key: "account_tjs", value: safeTrim(data.account_tjs) },
                { key: "contract_number", value: safeTrim(data.contract_number) },
                {
                    key: "contract_date",
                    value: formatDateForBackend(data.contract_date),
                },
                { key: "citizenship", value: safeTrim(data.citizenship) },
                { key: "nationality", value: safeTrim(data.nationality) },
                { key: "place_of_birth", value: safeTrim(data.place_of_birth) },
                { key: "passport_deadline", value: formatDateForBackend(data.passport_deadline) },
                { key: "client_occupation", value: safeTrim(data.client_occupation) },
                { key: "net_worth", value: safeTrim(data.net_worth) },
                { key: "monthly_income", value: safeTrim(data.monthly_income) },
                { key: "total_outgoing_transactions_amount", value: safeTrim(data.total_outgoing_transactions_amount) },
                { key: "total_outgoing_transactions_count", value: safeTrim(data.total_outgoing_transactions_count) },
                { key: "total_cash_transactions_amount", value: safeTrim(data.total_cash_transactions_amount) },
                { key: "total_cash_transactions_count", value: safeTrim(data.total_cash_transactions_count) },
                { key: "compliance_score", value: String(totalComplianceScore) },
                { key: "fatca", value: String(!!data.fatca) },
                { key: "apl_pzl", value: String(!!data.apl_pzl) },
            ];

            if (
                data.message_type === "rejected" &&
                data.rejection_reason &&
                !(isForPoll || isForOffer)
            ) {
                fieldsToAppend.push({
                    key: "comment",
                    value: safeTrim(data.rejection_reason),
                });
            }

            if (!data.is_new_client) {
                data.message_type = "nosms";
            }

            if (isForOffer === true || isForPoll === true) {
                data.message_type = "nosms";
            }

            if (statusId) {
                fieldsToAppend.push({ key: "application_status_id", value: String(statusId) });
            }

            fieldsToAppend.forEach(({ key, value }) => {
                formData.append(key, value);
            });

            const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
            let applicationId = data.ID;

            if (edit) {
                const response = await fetch(`${backendUrl}/applications/${data.ID}`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`, // 🔐 Добавлен токен
                    },
                    body: formData,
                });

                if (!response.ok)
                    throw new Error(`HTTP error! status: ${response.status}`);

                const result = await response.json();
                console.log("Успешно обновлено:", result);

                if (isForPoll && applicationId) {
                    downloadPoll(applicationId);
                } else if (isForOffer && applicationId) {
                    downloadOffer(applicationId);
                } else if (isForCompliance && applicationId) {
                    downloadCompliance(applicationId);
                } else if (!isForPoll && !isForOffer && !isForCompliance && !skipNavigate) {
                    showAlert("Данные успешно сохранены!", "success", 4000);
                }
                return applicationId;
            } else {
                const response = await fetch(`${backendUrl}/applications`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`, // 🔐 Добавлен токен
                    },
                    body: formData,
                });

                if (!response.ok)
                    throw new Error(`HTTP error! status: ${response.status}`);

                const result = await response.json();
                console.log("Успешно создано:", result);

                applicationId = result.ID || result.id;

                if (isForPoll && applicationId) {
                    downloadPoll(applicationId);
                } else if (isForOffer && applicationId) {
                    downloadOffer(applicationId);
                } else if (isForCompliance && applicationId) {
                    downloadCompliance(applicationId);
                } else {
                    if (!skipNavigate) {
                        navigate(0);
                        showAlert("Данные успешно сохранены!", "success", 4000);
                    }
                }
                return applicationId;
            }
        } catch (error) {
            console.error("Ошибка отправки:", error);
            showAlert("Произошла ошибка при сохранении данных", "error", 5000);
            return false;
        }
    };

    const withUploadsPrefix = (path) => {
        if (!path) return null;

        if (path.startsWith("http") || path.startsWith("uploads")) {
            return path;
        }

        return `uploads/${path}`;
    };

    const handleSendToCompliance = async () => {
        try {
            setLoading(true);
            
            // Сначала сохраняем/обновляем заявку со статусом 7 ("Не одобрено")
            const savedAppId = await onSend(false, false, 7, true);
            if (!savedAppId) {
                return;
            }

            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const fullName = `${data.surname || ''} ${data.name || ''} ${data.patronymic || ''}`.trim();
            
            const response = await fetch(`${backendUrl}/compliance/requests`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    application_id: savedAppId,
                    client_full_name: fullName,
                    client_phone: data.phone_number || "",
                    client_birth_date: data.birth_date || "",
                    match_similarity: 100.0,
                    client_occupation: data.client_occupation || "",
                    net_worth: data.net_worth || "",
                    monthly_income: data.monthly_income || "",
                    total_outgoing_transactions_amount: data.total_outgoing_transactions_amount || "",
                    total_outgoing_transactions_count: data.total_outgoing_transactions_count || "",
                    total_cash_transactions_amount: data.total_cash_transactions_amount || "",
                    total_cash_transactions_count: data.total_cash_transactions_count || "",
                    compliance_score: totalComplianceScore,
                    is_resident: data.is_resident !== false,
                    fatca: !!data.fatca,
                    apl_pzl: !!data.apl_pzl,
                }),
            });

            if (!response.ok) {
                const errResult = await response.json().catch(() => ({}));
                const errMsg = errResult.error || `HTTP error! status: ${response.status}`;
                throw new Error(errMsg);
            }

            showAlert("Заявка успешно отправлена в Комплаенс", "success", 5000);
            navigate(0);
        } catch (error) {
            console.error("Ошибка при отправке в комплаенс:", error);
            showAlert(`Ошибка при отправке в комплаенс: ${error.message || error}`, "error", 5000);
        } finally {
            setLoading(false);
        }
    };

    const getData = async () => {
        if (edit) {
            try {
                setLoading(true);
                console.log("edit id", id);

                const responseData = await getApplicationById(id);
                setDataMore({
                    ...responseData,
                    gender: responseData.gender === "Муж",
                    birth_date: formaterDate(responseData?.birth_date, "dateOnly"),
                    passport_issued_at: formaterDate(
                        responseData?.passport_issued_at,
                        "dateOnly"
                    ),
                    contract_date: formaterDate(responseData?.contract_date, "dateOnly"),
                    CreatedAt: formaterDate(responseData?.CreatedAt, "dateOnly"),
                    UpdatedAt: formaterDate(responseData?.UpdatedAt, "dateOnly"),
                });

                // ИСПРАВЛЕНО: Проверяем полное ФИО с датой рождения
                const birthDate = formaterDate(responseData?.birth_date, "dateOnly");

                if (responseData.is_new_client) {
                    setShowSMSType(true);
                }

                if (responseData.application_status_id !== 8) {
                    if (responseData.name && responseData.surname) {
                        const fullName = `${responseData.surname} ${responseData.name} ${responseData.patronymic || ''}`.trim();
                        if (fullName.length >= 2) {
                            debouncedCheckFullName(fullName, birthDate);
                        }
                    }

                    if (responseData.card_name) {
                        if (responseData.card_name.trim().length >= 2) {
                            await checkTerrorList(responseData.card_name.trim(), birthDate, "cardName");
                        }
                    }
                } else {
                    setTerrorCheckResults({ fullName: false, cardName: false });
                }
            } catch (e) {
                console.error(e);
                showAlert("Ошибка при загрузке данных", "error", 5000);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        getData();
    }, []);

    useEffect(() => {
        const fetchComplianceOptions = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/compliance/score-options`, {
                    headers: getAuthHeaders(),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const options = await response.json();
                if (!Array.isArray(options) || options.length === 0) {
                    return;
                }

                const grouped = Object.keys(complianceOptionFallbacks).reduce((acc, category) => {
                    acc[category] = [];
                    return acc;
                }, {});
                const scores = {};

                options.forEach((option) => {
                    const category = option.category;
                    if (!grouped[category]) {
                        grouped[category] = [];
                    }
                    grouped[category].push({
                        value: option.value,
                        label: option.label || `${option.value} (${option.score || 0})`,
                        sortOrder: option.sort_order || 0,
                    });
                    scores[option.value] = Number(option.score) || 0;
                });

                Object.keys(grouped).forEach((category) => {
                    grouped[category].sort((a, b) => a.sortOrder - b.sortOrder);
                    grouped[category] = grouped[category].map(({ sortOrder, ...option }) => option);
                    if (grouped[category].length === 0) {
                        grouped[category] = complianceOptionFallbacks[category] || [];
                    }
                });

                setComplianceOptions(grouped);
                setComplianceScoreByValue({ ...complianceScores, ...scores });
            } catch (error) {
                console.error("Ошибка загрузки справочников комплаенса:", error);
            }
        };

        fetchComplianceOptions();
    }, []);

    useEffect(() => {
        return () => {
            Object.values(terrorCheckTimeoutRefs).forEach(ref => {
                if (ref.current) {
                    clearTimeout(ref.current);
                }
            });
        };
    }, []);

    const hasTerrorMatch = terrorCheckResults.fullName === true || terrorCheckResults.cardName === true;
    const isNonResident = data.is_resident === false;
    const hasFatca = data.fatca === true;
    const hasAplPzl = data.apl_pzl === true;
    
    // Check if application is already approved by compliance to not block them
    const isComplianceApproved = data.compliance_status === 'approved' || data.is_compliance_approved === true;
    const isApprovedStatus = data.application_status_id === 8;
    
    const requiresCompliance = (hasTerrorMatch || isNonResident || hasFatca || hasAplPzl) && !isComplianceApproved && !isApprovedStatus;

    const getScore = (val) => {
        return complianceScoreByValue[val] || 0;
    };

    const getBooleanScore = (isTrue) => isTrue ? 5 : 0;
    const getResidentScore = (isResident) => isResident === false ? 5 : 0;

    const totalComplianceScoreSum = 
        getScore(data.client_occupation) +
        getScore(data.net_worth) +
        getScore(data.monthly_income) +
        getScore(data.total_outgoing_transactions_amount) +
        getScore(data.total_outgoing_transactions_count) +
        getScore(data.total_cash_transactions_amount) +
        getScore(data.total_cash_transactions_count) +
        getResidentScore(data.is_resident) +
        getBooleanScore(data.fatca) +
        getBooleanScore(data.apl_pzl);

    // Get average score from 1 to 5
    const totalComplianceScore = Math.max(1, Math.round(totalComplianceScoreSum / 9));


    return (
        <>
            <div className="gift-card content-page">
                {alert && (
                    <AlertMessage
                        message={alert.message}
                        type={alert.type}
                        duration={alert.duration}
                        onClose={closeAlert}
                    />
                )}

                {showClientSelector && foundClients.length > 1 && (
                    <ClientSelectorModal
                        clients={foundClients}
                        selectedIndex={selectedClientIndex}
                        onSelect={handleSelectClient}
                        onClose={() => setShowClientSelector(false)}
                        title="Выберите клиента"
                        description={`Найдено ${foundClients.length} клиентов с номером телефона ${data.phone_number}. Выберите нужного:`}
                    />
                )}

                {loading ? (
                    <Spinner />
                ) : (
                    <main>
                        <h1>
                            Выберите карту! Нажав на{" "}
                            <img src={file} alt="file" width={16} /> вы можете посмотреть и
                            распечатать тарифы.
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
                                        const selectedCard = visaCards.find((item) => item.value === e);
                                        setData("product", selectedCard?.label || "");
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
                                        const selectedCard = mcCards.find((item) => item.value === e);
                                        setData("product", selectedCard?.label || "");
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
                                        const selectedCard = ncCards.find((item) => item.value === e);
                                        setData("product", selectedCard?.label || "");
                                    }}
                                />
                            </div>
                        </div>

                        {requiresCompliance && (
                            <div className="terror-warning">
                                <div className="terror-warning-header">
                                    <span className="terror-warning-icon">⚠</span>
                                    <strong>Найдено совпадение в базе комплайнс</strong>
                                </div>
                                <div className="terror-warning-details">
                                    {terrorCheckResults.fullName === true && (
                                        <div className="terror-match-item">
                                            <span className="terror-match-label">По ФИО:</span>
                                            <span className="terror-match-value">
                                                {data.surname || ''} {data.name || ''} {data.patronymic || ''}
                                            </span>
                                        </div>
                                    )}
                                    {terrorCheckResults.cardName === true && (
                                        <div className="terror-match-item">
                                            <span className="terror-match-label">По имени на карте:</span>
                                            <span className="terror-match-value">{data.card_name || ''}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="terror-warning-note">
                                    Проверьте данные клиента перед продолжением оформления
                                </div>
                            </div>
                        )}

                        <h1>Внимательно заполните данные клиента! Следуйте подсказкам</h1>

                        <div className="header-passport">
                            <File
                                edit={edit}
                                errors={errors}
                                onChange={(e) =>
                                    setData("front_side_of_the_passport_file", e)
                                }
                                placeholderImage={front_side_of_the_passport_file}
                                id={"front_side_of_the_passport_file"}
                                value={
                                    edit
                                        ? withUploadsPrefix(data?.front_side_of_the_passport)
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
                                        ? withUploadsPrefix(data?.back_side_of_the_passport)
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
                                        ? withUploadsPrefix(data?.selfie_with_passport)
                                        : data?.selfie_with_passport_file
                                }
                                width={220}
                            />

                            <div className="verification-section">
                                <CheckBox
                                    title={"Личность подтверждена?"}
                                    value={data.identity_verified}
                                    onChange={(e) => setData("identity_verified", e)}
                                />
                                <CheckBox
                                    title={"Отправить СМС?"}
                                    value={data.is_new_client}
                                    onChange={handleSMSChange}
                                />
                                <CheckBox
                                    title={"Виртуальная карта"}
                                    value={data.virtual}
                                    onChange={(e) => setData("virtual", e)}
                                />
                            </div>

                            <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: "15px", gridColumn: "span 3" }}>
                                <button
                                    onClick={handleRecognizePassport}
                                    disabled={loading || (!data.front_side_of_the_passport_file && !data.back_side_of_the_passport_file)}
                                    type="button"
                                    style={{
                                        padding: "10px 24px",
                                        backgroundColor: (data.front_side_of_the_passport_file || data.back_side_of_the_passport_file) ? "#10b981" : "#cccccc",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: (data.front_side_of_the_passport_file || data.back_side_of_the_passport_file) ? "pointer" : "not-allowed",
                                        fontWeight: "600",
                                        fontSize: "14px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    🔍 <span>Распознать данные паспорта</span>
                                </button>
                            </div>
                        </div>

                        {showSMSType && (
                            <div className="sms-section">
                                <div className="sms-section-header">
                                    <h3>Настройки SMS</h3>
                                    <div className="sms-status-indicator">
                                        {data.message_type ? (
                                            <span className="sms-status-active">SMS будет отправлен</span>
                                        ) : (
                                            <span className="sms-status-inactive">Выберите тип SMS</span>
                                        )}
                                    </div>
                                </div>

                                <div className="sms-type-selector">
                                    <label className="sms-type-label">
                                        Выберите тип SMS для отправки клиенту:
                                    </label>
                                    <div className="sms-options">
                                        {smsTypes.map((type) => (
                                            <div
                                                key={type.value}
                                                className={`sms-option ${data.message_type === type.value ? 'sms-option-selected' : ''
                                                    }`}
                                                onClick={() => handleSMSTypeChange(type.value)}
                                            >
                                                <div className="sms-option-radio">
                                                    {data.message_type === type.value && (
                                                        <div className="sms-option-radio-selected"></div>
                                                    )}
                                                </div>
                                                <div className="sms-option-content">
                                                    <div className="sms-option-title">{type.label}</div>
                                                    <div className="sms-option-description">
                                                        {type.value === "accepted" && "Клиент получит SMS о принятии заявки"}
                                                        {type.value === "rejected" && "Клиент получит SMS об отклонении заявки"}
                                                        {type.value === "card_opened" && "Клиент получит SMS об открытии карты"}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {data.message_type === "rejected" && (
                                    <div className="rejection-reason-section">
                                        <label className="rejection-reason-label">
                                            Причина отклонения заявки:
                                            <span className="required-asterisk">*</span>
                                        </label>
                                        <textarea
                                            value={data.rejection_reason || ""}
                                            onChange={(e) =>
                                                setData("rejection_reason", e.target.value)
                                            }
                                            placeholder="Введите подробную причину отклонения заявки..."
                                            rows={3}
                                            className="rejection-reason-textarea"
                                        />
                                        <div className="rejection-reason-hint">
                                            Эта информация будет отправлена клиенту в SMS сообщении
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="compliance-section" style={{marginBottom: "24px"}}>
                            <div className="compliance-header">
                                <div className="compliance-title-group">
                                    <span className="compliance-icon">👤</span>
                                    <h3>Личные данные</h3>
                                </div>
                            </div>
                            <div className="content-form" style={{marginTop: 0}}>
                            <div className="div1 input-with-check">
                                <Input
                                    id="surname"
                                    title="Фамилия"
                                    placeholder="Введите фамилию"
                                    value={data.surname}
                                    onChange={(val) => handleNameChange('surname', val)}
                                    error={errors}
                                    required
                                />
                                {checkingTerror.fullName && <div className="terror-check-indicator checking"></div>}
                                {terrorCheckResults.fullName === true && <div className="terror-check-indicator match"></div>}
                                {terrorCheckResults.fullName === false && <div className="terror-check-indicator no-match"></div>}
                            </div>

                            <div className="div2 input-with-check">
                                <Input
                                    id="name"
                                    title="Имя"
                                    placeholder="Введите имя"
                                    value={data.name}
                                    onChange={(val) => handleNameChange('name', val)}
                                    error={errors}
                                    required
                                />
                                {checkingTerror.fullName && <div className="terror-check-indicator checking"></div>}
                                {terrorCheckResults.fullName === true && <div className="terror-check-indicator match"></div>}
                                {terrorCheckResults.fullName === false && <div className="terror-check-indicator no-match"></div>}
                            </div>

                            <div className="div3 input-with-check">
                                <Input
                                    id="patronymic"
                                    title="Отчество"
                                    placeholder="Введите отчество"
                                    value={data.patronymic}
                                    onChange={(val) => handleNameChange('patronymic', val)}
                                    error={errors}
                                />
                                {checkingTerror.fullName && <div className="terror-check-indicator checking"></div>}
                                {terrorCheckResults.fullName === true && <div className="terror-check-indicator match"></div>}
                                {terrorCheckResults.fullName === false && <div className="terror-check-indicator no-match"></div>}
                            </div>

                            <Input
                                id="birth_date"
                                className="div4"
                                title="Дата рождения"
                                type="date"
                                value={data.birth_date}
                                onChange={handleBirthDateChange}
                                error={errors}
                                required
                            />

                            <Input
                                id="phone_number"
                                className="div5"
                                title="Телефон"
                                placeholder="998XXXXXXXXX"
                                value={data.phone_number}
                                onChange={(val) => setData("phone_number", val)}
                                error={errors}
                                required
                            />

                            <Input
                                id="secret_word"
                                className="div6"
                                title="Кодовое слово"
                                placeholder="Слово-пароль"
                                onChange={(val) => setData("secret_word", val)}
                                value={data.secret_word}
                                error={errors}
                            />

                            <Select
                                id="receiving_office"
                                className="div9"
                                title="Офис получения"
                                placeholder="Выберите офис"
                                onChange={(val) => setData("receiving_office", val)}
                                value={data.receiving_office}
                                options={[
                                    { value: "", label: "Выберите офис" },
                                    ...appOffices.map((o) => ({ value: o.title, label: o.title }))
                                ]}
                                error={errors}
                            />

                            <Input
                                id="email"
                                className="div7"
                                title="Email"
                                placeholder="example@mail.com"
                                onChange={(val) => setData("email", val)}
                                value={data.email}
                                error={errors}
                            />

                            <div className="div8 input-with-check">
                                <Input
                                    id="card_name"
                                    title="Имя на карте"
                                    placeholder="LATIN LETTERS ONLY"
                                    value={data.card_name}
                                    onChange={handleCardNameChange}
                                    error={errors}
                                    required
                                />
                                {checkingTerror.cardName && <div className="terror-check-indicator checking"></div>}
                                {terrorCheckResults.cardName === true && <div className="terror-check-indicator match"></div>}
                                {terrorCheckResults.cardName === false && <div className="terror-check-indicator no-match"></div>}
                            </div>

                            <Input
                                id="client_code"
                                className="div30"
                                title="Код клиента (АБС)"
                                placeholder="000000"
                                onChange={(val) => setData("client_code", val)}
                                value={data.client_code}
                                error={errors}
                            />

                            <CheckBox
                                id="gender"
                                className="div61"
                                title="Пол"
                                value={data.gender}
                                onChange={(val) => setData("gender", val)}
                                yes="Мужской"
                                no="Женский"
                                error={errors}
                            />


                            <Select
                                id="type_of_certificate"
                                className="div11"
                                title="Тип документа"
                                value={data.type_of_certificate}
                                onChange={(val) => setData("type_of_certificate", val)}
                                options={docTypes}
                                error={errors}
                                required
                            />
                            <Input
                                id="documents_series"
                                className="div12"
                                title="Серия"
                                placeholder="Серия"
                                onChange={(val) => setData("documents_series", val)}
                                value={data.documents_series}
                                error={errors}
                            />
                            <Input
                                id="document_number"
                                className="div13"
                                title="Номер"
                                placeholder="Номер документа"
                                onChange={(val) => setData("document_number", val)}
                                value={data.document_number}
                                error={errors}
                                required
                            />
                            <Input
                                id="passport_issued_at"
                                className="div14"
                                title="Дата выдачи"
                                type="date"
                                onChange={(val) => setData("passport_issued_at", val)}
                                value={data.passport_issued_at}
                                error={errors}
                            />
                            <Input
                                id="passport_deadline"
                                className="div15"
                                title="Срок действия"
                                type="date"
                                onChange={(val) => setData("passport_deadline", val)}
                                value={data.passport_deadline}
                                error={errors}
                            />
                            <Input
                                id="issued_by"
                                className="div16"
                                title="Кем выдан"
                                placeholder="Орган выдачи"
                                onChange={(val) => setData("issued_by", val)}
                                value={data.issued_by}
                                error={errors}
                            />
                            <Input
                                id="inn"
                                className="div17"
                                title="ИНН"
                                placeholder="ИНН"
                                onChange={(val) => setData("inn", val)}
                                value={data.inn}
                                error={errors}
                            />
</div>
                        </div>

                        <div className="compliance-section" style={{marginBottom: "24px"}}>
                            <div className="compliance-header">
                                <div className="compliance-title-group">
                                    <span className="compliance-icon">📍</span>
                                    <h3>Адрес</h3>
                                </div>
                            </div>
                            <div className="content-form" style={{marginTop: 0}}>
                            <Input
                                id="citizenship"
                                className="div65"
                                title="Гражданство"
                                placeholder="Гражданство"
                                onChange={(val) => setData("citizenship", val)}
                                value={data.citizenship}
                                error={errors}
                            />
                            <Input
                                id="nationality"
                                className="div66"
                                title="Национальность"
                                placeholder="Национальность"
                                onChange={(val) => setData("nationality", val)}
                                value={data.nationality}
                                error={errors}
                            />
                            <Input
                                id="place_of_birth"
                                className="div67"
                                title="Место рождения"
                                placeholder="Место рождения"
                                onChange={(val) => setData("place_of_birth", val)}
                                value={data.place_of_birth}
                                error={errors}
                            />
                            <Input
                                id="country"
                                className="div57"
                                title="Страна"
                                placeholder="Страна"
                                onChange={(val) => setData("country", val)}
                                value={data.country}
                                error={errors}
                            />
                            <Select
                                id="regin_type"
                                className="div18"
                                title="Тип региона"
                                value={data.regin_type}
                                onChange={(val) => setData("regin_type", val)}
                                options={reginTypes}
                                error={errors}
                            />
                            <Input
                                id="region"
                                className="div19"
                                title="Регион"
                                placeholder="Название региона"
                                onChange={(val) => setData("region", val)}
                                value={data.region}
                                error={errors}
                            />
                            <Select
                                id="population_type"
                                className="div20"
                                title="Тип нас. пункта"
                                value={data.population_type}
                                onChange={(val) => setData("population_type", val)}
                                options={USTypes}
                                error={errors}
                            />
                            <Input
                                id="populated"
                                className="div21"
                                title="Населенный пункт"
                                placeholder="Город/Село"
                                onChange={(val) => setData("populated", val)}
                                value={data.populated}
                                error={errors}
                            />
                            <Select
                                id="district_type"
                                className="div22"
                                title="Тип района"
                                value={data.district_type}
                                onChange={(val) => setData("district_type", val)}
                                options={districtTypes}
                                error={errors}
                            />
                            <Input
                                id="district"
                                className="div23"
                                title="Район"
                                placeholder="Название района"
                                onChange={(val) => setData("district", val)}
                                value={data.district}
                                error={errors}
                            />
                            <Select
                                id="street_type"
                                className="div24"
                                title="Тип улицы"
                                value={data.street_type}
                                onChange={(val) => setData("street_type", val)}
                                options={streetTypes}
                                error={errors}
                            />
                            <Input
                                id="street"
                                className="div25"
                                title="Улица"
                                placeholder="Название улицы"
                                onChange={(val) => setData("street", val)}
                                value={data.street}
                                error={errors}
                            />
                            <Input
                                id="house_number"
                                className="div26"
                                title="Дом"
                                placeholder="№"
                                onChange={(val) => setData("house_number", val)}
                                value={data.house_number}
                                error={errors}
                            />
                            <Input
                                id="corpus"
                                className="div27"
                                title="Корпус"
                                placeholder="Корпус"
                                onChange={(val) => setData("corpus", val)}
                                value={data.corpus}
                                error={errors}
                            />
                            <Input
                                id="apartment_number"
                                className="div29"
                                title="Квартира"
                                placeholder="№"
                                onChange={(val) => setData("apartment_number", val)}
                                value={data.apartment_number}
                                error={errors}
                            />
                            <Input
                                id="client_index"
                                className="div28"
                                title="Индекс"
                                placeholder="000000"
                                onChange={(val) => setData("client_index", val)}
                                value={data.client_index}
                                error={errors}
                            />
</div>
                        </div>

                        <div className="compliance-section" style={{marginBottom: "24px"}}>
                            <div className="compliance-header">
                                <div className="compliance-title-group">
                                    <span className="compliance-icon">💳</span>
                                    <h3>Данные выпущенной карты</h3>
                                </div>
                            </div>
                            <div className="content-form" style={{marginTop: 0}}>
                            <Input
                                id="product"
                                className="div36"
                                title="Продукт"
                                placeholder="Название продукта"
                                onChange={(val) => setData("product", val)}
                                value={data.product}
                                error={errors}
                                required
                            />
                            <Input
                                id="account_usd"
                                className="div31"
                                title="Счет USD"
                                placeholder="Счет USD"
                                onChange={(val) => setData("account_usd", val)}
                                value={data.account_usd}
                                error={errors}
                                required
                            />
                            <Input
                                id="account_eur"
                                className="div32"
                                title="Счет EUR"
                                placeholder="Счет EUR"
                                onChange={(val) => setData("account_eur", val)}
                                value={data.account_eur}
                                error={errors}
                                required
                            />
                            <Input
                                id="account_tjs"
                                className="div33"
                                title="Счет TJS"
                                placeholder="Счет TJS"
                                onChange={(val) => setData("account_tjs", val)}
                                value={data.account_tjs}
                                error={errors}
                                required
                            />
                            <Input
                                id="contract_number"
                                className="div34"
                                title="Номер договора"
                                placeholder="Номер договора"
                                onChange={(val) => setData("contract_number", val)}
                                value={data.contract_number}
                                error={errors}
                                required
                            />
                            <Input
                                id="contract_date"
                                className="div35"
                                title="Дата договора"
                                type="date"
                                onChange={(val) => setData("contract_date", val)}
                                value={data.contract_date}
                                error={errors}
                                required
                            />
                            


                            {edit && (
                                <>
                                    <Input
                                        id="CreatedAt"
                                        className="div37"
                                        title="Дата создания"
                                        value={data.CreatedAt}
                                        disabled
                                    />

                                    <Input
                                        id="UpdatedAt"
                                        className="div51"
                                        title="Дата обновления"
                                        value={data.UpdatedAt}
                                        disabled
                                    />
                                </>
                            )}
                        </div>
                        </div>
                        {/* Compliance Section */}
                        <div className="compliance-section">
                            <div className="compliance-header">
                                <div className="compliance-title-group">
                                    <span className="compliance-icon">🛡️</span>
                                    <h3>Параметры комплаенса</h3>
                                </div>
                                <div className={`compliance-score-badge ${totalComplianceScore > 15 ? 'high-risk' : totalComplianceScore > 5 ? 'medium-risk' : 'low-risk'}`}>
                                    Балл комплаенса: <strong>{totalComplianceScore}</strong>
                                </div>
                            </div>
                            <div className="compliance-grid">
                                <Select
                                    id="client_occupation"
                                    title="Чем занимается клиент"
                                    placeholder="Выберите сферу деятельности"
                                    onChange={(val) => setData("client_occupation", val)}
                                    value={data.client_occupation}
                                    options={complianceOptions.client_occupation}
                                    searchable
                                    error={errors}
                                />
                                <Select
                                    id="monthly_income"
                                    title="Метод открытия счета"
                                    placeholder="Выберите метод"
                                    onChange={(val) => setData("monthly_income", val)}
                                    value={data.monthly_income}
                                    options={complianceOptions.monthly_income}
                                    searchable
                                    error={errors}
                                />
                                <Select
                                    id="total_outgoing_transactions_amount"
                                    title="Общая ожидаемая сумма ежемесячных транзакций"
                                    placeholder="Выберите сумму"
                                    onChange={(val) => setData("total_outgoing_transactions_amount", val)}
                                    value={data.total_outgoing_transactions_amount}
                                    options={complianceOptions.total_outgoing_transactions_amount}
                                    searchable
                                    error={errors}
                                />
                                <Select
                                    id="total_outgoing_transactions_count"
                                    title="Ожидаемое общее количество ежемесячных транзакций"
                                    placeholder="Выберите количество"
                                    onChange={(val) => setData("total_outgoing_transactions_count", val)}
                                    value={data.total_outgoing_transactions_count}
                                    options={complianceOptions.total_outgoing_transactions_count}
                                    searchable
                                    error={errors}
                                />
                                <Select
                                    id="total_cash_transactions_amount"
                                    title="Ожидаемая общая сумма кассовых сделок"
                                    placeholder="Выберите сумму"
                                    onChange={(val) => setData("total_cash_transactions_amount", val)}
                                    value={data.total_cash_transactions_amount}
                                    options={complianceOptions.total_cash_transactions_amount}
                                    searchable
                                    error={errors}
                                />
                                <Select
                                    id="total_cash_transactions_count"
                                    title="Ожидаемое общее количество кассовых сделок"
                                    placeholder="Выберите количество"
                                    onChange={(val) => setData("total_cash_transactions_count", val)}
                                    value={data.total_cash_transactions_count}
                                    options={complianceOptions.total_cash_transactions_count}
                                    searchable
                                    error={errors}
                                />
                                
                                <div className="compliance-checkbox-group">
                                    <CheckBox
                                        id="is_resident"
                                        title="Резидент"
                                        value={data.is_resident}
                                        onChange={(val) => setData("is_resident", val)}
                                        error={errors}
                                    />
                                    <CheckBox
                                        id="fatca"
                                        title="Признак FATCA"
                                        value={data.fatca}
                                        onChange={(val) => setData("fatca", val)}
                                        error={errors}
                                    />
                                    <CheckBox
                                        id="apl_pzl"
                                        title="Признак АПЛ/ПЗЛ"
                                        value={data.apl_pzl}
                                        onChange={(val) => setData("apl_pzl", val)}
                                        error={errors}
                                    />
                                </div>
                            </div>
                        </div>
                        <footer>
                            {requiresCompliance ? (
                                <button
                                    onClick={handleSendToCompliance}
                                    disabled={loading}
                                    style={{ background: "#dc3545", color: "white" }}
                                >
                                    <span>Отправить в Комплаенс</span>
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => onSend(false, false)}
                                        disabled={downloading || downloadingOffer || downloadingCompliance}
                                    >
                                        <img src={save} alt="" />
                                        <span>Сохранить</span>
                                    </button>
                            <button
                                onClick={handleSaveAndDownloadOffer}
                                disabled={downloading || downloadingOffer || downloadingCompliance}
                            >
                                <img src={offer} alt="" />
                                <span>
                                    {downloadingOffer ? "Загрузка..." : "Загрузить оферту"}
                                </span>
                            </button>
                            <button
                                onClick={handleSaveAndDownload}
                                disabled={downloading || downloadingOffer || downloadingCompliance}
                            >
                                <img src={download} alt="" />
                                <span>
                                    {downloading ? "Скачивание..." : "Скачать анкету"}
                                </span>
                            </button>
                            <button
                                onClick={handleSaveAndDownloadCompliance}
                                disabled={downloading || downloadingOffer || downloadingCompliance}
                            >
                                <img src={download} alt="" />
                                <span>
                                    {downloadingCompliance ? "Скачивание..." : "Скачать анкету комплайнс"}
                                </span>
                            </button>
                            <button disabled={downloading || downloadingOffer || downloadingCompliance}>
                                <img src={share} alt="" />
                                <span>Загрузить анкету</span>
                            </button>
                                </>
                            )}
                            <button onClick={handleSearchClient} disabled={searching}>
                                <img src={search_user} alt="" />
                                <span>{searching ? "Поиск..." : "Найти клиента в АБС"}</span>
                            </button>
                        </footer>
                    </main>
                )}

                {pinModalClient && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                            <h3>Требуется PIN-код</h3>
                            <p>Этот клиент привязан к агенту по клиентам. Введите 5-значный PIN-код для продолжения.</p>
                            <input
                                type="password"
                                maxLength="5"
                                value={clientPin}
                                onChange={(e) => setClientPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="*****"
                                style={{ fontSize: '24px', letterSpacing: '5px', textAlign: 'center', margin: '20px 0', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                <button onClick={() => { setPinModalClient(null); setClientPin(""); }} disabled={verifyingPin} style={{ padding: '10px 20px', cursor: 'pointer' }}>Отмена</button>
                                <button onClick={handleVerifyPin} disabled={verifyingPin} style={{ padding: '10px 20px', cursor: 'pointer', background: '#0056b3', color: 'white' }}>{verifyingPin ? 'Проверка...' : 'Подтвердить'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
