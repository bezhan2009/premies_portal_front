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
import "../../styles/components/GiftCard.scss";
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
import useSidebar from "../../hooks/useSideBar.js";
import Sidebar from "../../components/general/DynamicMenu.jsx";
import ClientSelectorModal from "../../components/dashboard/dashboard_agent/clientSelectorModal.jsx";

export default function GiftCard({ edit = false }) {
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadingOffer, setDownloadingOffer] = useState(false);
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

    // ИСПРАВЛЕННАЯ функция для проверки в списке террористов
    const checkTerrorList = useCallback(async (name, birthDate, type) => {
        if (!name || name.trim().length < 2) {
            setTerrorCheckResults(prev => ({ ...prev, [type]: null }));
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

            let url = `${import.meta.env.VITE_BACKEND_URL}/terror-list/${encodeURIComponent(name.trim())}`;

            if (birthDate && birthDate.trim() !== '') {
                url += `&bday=${encodeURIComponent(birthDate.trim())}`;
            }

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
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
    }, []);

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

        if (value && value.trim().length >= 2) {
            debouncedCheckCardName(value.trim());
        } else {
            setTerrorCheckResults(prev => ({ ...prev, cardName: null }));
        }
    };

    const loadClientDetails = async (clientCode) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;
            const token = localStorage.getItem("access_token");

            const response = await fetch(
                `${backendUrl}/addresses?clientIndex=${clientCode}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
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

        const cardName = `${clientData.ltn_name || ""} ${
            clientData.ltn_surname || ""
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

            if (fullName.length >= 2) {
                debouncedCheckFullName(fullName, birthDate);
            }

            const cardNameForCheck = clientDetails.swift_name ||
                `${clientDetails.latin_first_name || ""} ${clientDetails.latin_last_name || ""}`.trim();
            if (cardNameForCheck.length >= 2) {
                await checkTerrorList(cardNameForCheck, birthDate, "cardName");
            }

            showAlert("Данные клиента успешно загружены из АБС", "success", 5000);
        } catch (error) {
            console.error("Ошибка при загрузке деталей клиента:", error);
            showAlert(
                "Основные данные загружены, но не удалось загрузить детали клиента",
                "warning",
                5000
            );
        } finally {
            setSearching(false);
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
            const token = localStorage.getItem("access_token");

            const response = await fetch(
                `${backendUrl}/client/info?phoneNumber=${phoneNumber}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
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
                await fillFormWithClientData(clientsData[0]);
                showAlert("Данные клиента успешно загружены из АБС", "success", 5000);
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
        if (foundClients[clientIndex]) {
            await fillFormWithClientData(foundClients[clientIndex]);
            setShowClientSelector(false);
            showAlert(
                `Данные клиента ${clientIndex + 1} успешно загружены`,
                "success",
                5000
            );
        }
    };

    const formatDateForBackend = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toISOString();
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
            const token = localStorage.getItem("access_token");

            const response = await fetch(`${automationUrl}/automation/poll`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
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
            const token = localStorage.getItem("access_token");

            const response = await fetch(`${automationUrl}/automation/offer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    application_ids: [applicationId],
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const filename = `offer_${applicationId}.zip`;
            downloadFile(blob, filename);

            showAlert("Оферт успешно скачан!", "success", 4000);
        } catch (error) {
            console.error("Ошибка скачивания оферта:", error);
            showAlert("Произошла ошибка при скачивании оферта", "error", 5000);
        } finally {
            setDownloadingOffer(false);
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

    const onSend = async (isForPoll = false, isForOffer = false) => {
        const isValid = validate(ValidData);
        if (!isValid) return false;

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

            fieldsToAppend.forEach(({ key, value }) => {
                formData.append(key, value);
            });

            const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
            let applicationId = data.ID;

            if (edit) {
                const response = await fetch(`${backendUrl}/applications/${data.ID}`, {
                    method: "PATCH",
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
                } else if (!isForPoll && !isForOffer) {
                    showAlert("Данные успешно сохранены!", "success", 4000);
                }
                return true;
            } else {
                const response = await fetch(`${backendUrl}/applications`, {
                    method: "POST",
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
                } else {
                    navigate(0);
                    showAlert("Данные успешно сохранены!", "success", 4000);
                }
                return true;
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

    const getData = async () => {
        if (edit) {
            try {
                setLoading(true);
                console.log("edit id", id);

                const responseData = await getApplicationById(id);
                setDataMore({
                    ...responseData,
                    gemder: responseData.gender === "Муж",
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
            } catch (e) {
                console.error(e);
                showAlert("Ошибка при загрузке данных", "error", 5000);
            } finally {
                setLoading(false);
            }
        }
    };

    console.log("data", data);

    useEffect(() => {
        getData();
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

    return (
        <>
            <div
                className={`dashboard-container ${
                    isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"
                }`}
            >
                <Sidebar
                    activeLink="gift_card"
                    isOpen={isSidebarOpen}
                    toggle={toggleSidebar}
                />
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

                            {hasTerrorMatch && (
                                <div className="terror-warning">
                                    <div className="terror-warning-header">
                                        <span className="terror-warning-icon">⚠</span>
                                        <strong>ВНИМАНИЕ: Совпадение в базе Excon найдено!</strong>
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
                                    placeholderImage={withUploadsPrefix(
                                        front_side_of_the_passport_file
                                    )}
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
                                    placeholderImage={withUploadsPrefix(
                                        back_side_of_the_passport_file
                                    )}
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
                                    placeholderImage={withUploadsPrefix(personImg)}
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
                                                    className={`sms-option ${
                                                        data.message_type === type.value ? 'sms-option-selected' : ''
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
                            <div className="content-form">
                                <div className="div1 input-with-check">
                                    <Input
                                        placeholder={"Фамилия"}
                                        onChange={(e) => handleNameChange("surname", e)}
                                        value={data?.surname}
                                        error={errors}
                                        id={"surname"}
                                    />
                                    {checkingTerror.fullName && (
                                        <div className="terror-check-indicator checking"></div>
                                    )}
                                    {terrorCheckResults.fullName === true && (
                                        <div className="terror-check-indicator match"></div>
                                    )}
                                    {terrorCheckResults.fullName === false && (
                                        <div className="terror-check-indicator no-match"></div>
                                    )}
                                </div>

                                <div className="div2 input-with-check">
                                    <Input
                                        placeholder={"Имя"}
                                        onChange={(e) => handleNameChange("name", e)}
                                        value={data?.name}
                                        error={errors}
                                        id={"name"}
                                    />
                                    {checkingTerror.fullName && (
                                        <div className="terror-check-indicator checking"></div>
                                    )}
                                    {terrorCheckResults.fullName === true && (
                                        <div className="terror-check-indicator match"></div>
                                    )}
                                    {terrorCheckResults.fullName === false && (
                                        <div className="terror-check-indicator no-match"></div>
                                    )}
                                </div>

                                <div className="div3 input-with-check">
                                    <Input
                                        placeholder={"Отчество"}
                                        onChange={(e) => handleNameChange("patronymic", e)}
                                        value={data?.patronymic}
                                        error={errors}
                                        id={"patronymic"}
                                    />
                                    {checkingTerror.fullName && (
                                        <div className="terror-check-indicator checking"></div>
                                    )}
                                    {terrorCheckResults.fullName === true && (
                                        <div className="terror-check-indicator match"></div>
                                    )}
                                    {terrorCheckResults.fullName === false && (
                                        <div className="terror-check-indicator no-match"></div>
                                    )}
                                </div>

                                <label className={`input div4`}>
                                    <input
                                        id="birth_date"
                                        type="date"
                                        value={data?.birth_date || ""}
                                        placeholder="Дата рождения"
                                        onChange={(e) => setData("birth_date", e.target.value)}
                                    />
                                    {errors && <p className={errors?.birth_date && "error-input"}>{errors?.birth_date}</p>}
                                </label>

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
                                    className={"div9"}
                                    placeholder={"Получаемый оффис"}
                                    onChange={(e) => setData("receiving_office", e)}
                                    value={data?.receiving_office}
                                    error={errors}
                                    id={"receiving_office"}
                                />
                                <Input
                                    className={"div7"}
                                    placeholder={"Почта"}
                                    onChange={(e) => setData("email", e)}
                                    value={data?.email}
                                    error={errors}
                                    id={"email"}
                                />

                                <div className="div8 input-with-check">
                                    <Input
                                        placeholder={"Имя на карте"}
                                        onChange={handleCardNameChange}
                                        value={data?.card_name}
                                        error={errors}
                                        id={"card_name"}
                                    />
                                    {checkingTerror.cardName && (
                                        <div className="terror-check-indicator checking"></div>
                                    )}
                                    {terrorCheckResults.cardName === true && (
                                        <div className="terror-check-indicator match"></div>
                                    )}
                                    {terrorCheckResults.cardName === false && (
                                        <div className="terror-check-indicator no-match"></div>
                                    )}
                                </div>

                                <Input
                                    className={"div30"}
                                    placeholder={"Код клиента в АБС"}
                                    onChange={(e) => setData("client_code", e)}
                                    value={data?.client_code}
                                    error={errors}
                                    id={"client_code"}
                                />
                                <CheckBox
                                    yes={"Муж"}
                                    no={"Жен"}
                                    className={"div61 form-check-box"}
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
                                    type="date"
                                    className={"div15"}
                                    placeholder={"Срок действия"}
                                    onChange={(e) => setData("passport_deadline", e)}
                                    value={data?.passport_deadline}
                                    error={errors}
                                    id={"passport_deadline"}
                                />
                                <Input
                                    className={"div16"}
                                    placeholder={"Кем выдан"}
                                    onChange={(e) => setData("issued_by", e)}
                                    value={data?.issued_by}
                                    error={errors}
                                    id={"issued_by"}
                                />
                                <Input
                                    className={"div17"}
                                    placeholder={"ИНН"}
                                    onChange={(e) => setData("inn", e)}
                                    value={data?.inn}
                                    error={errors}
                                    id={"inn"}
                                />
                                <Input
                                    className={"div57"}
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
                                <Input
                                    className={"div65"}
                                    placeholder={"Гражданство"}
                                    onChange={(e) => setData("citizenship", e)}
                                    value={data?.citizenship}
                                    error={errors}
                                    id={"citizenship"}
                                />
                                <Input
                                    className={"div66"}
                                    placeholder={"Национальность"}
                                    onChange={(e) => setData("nationality", e)}
                                    value={data?.nationality}
                                    error={errors}
                                    id={"nationality"}
                                />
                                <Input
                                    className={"div67"}
                                    placeholder={"Место рождения"}
                                    onChange={(e) => setData("place_of_birth", e)}
                                    value={data?.place_of_birth}
                                    error={errors}
                                    id={"place_of_birth"}
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
                                <Input
                                    className={"div36"}
                                    placeholder={"Продукт"}
                                    onChange={(e) => setData("product", e)}
                                    value={data?.product}
                                    error={errors}
                                    id={"product"}
                                    required={true}
                                />
                                <Input
                                    className={"div31"}
                                    placeholder={"Счет USD*"}
                                    onChange={(e) => setData("account_usd", e)}
                                    value={data?.account_usd}
                                    error={errors}
                                    id={"account_usd"}
                                    required={true}
                                />
                                <Input
                                    className={"div32"}
                                    placeholder={"Счет EUR*"}
                                    onChange={(e) => setData("account_eur", e)}
                                    value={data?.account_eur}
                                    error={errors}
                                    id={"account_eur"}
                                    required={true}
                                />
                                <Input
                                    className={"div33"}
                                    placeholder={"Счет TJS*"}
                                    onChange={(e) => setData("account_tjs", e)}
                                    value={data?.account_tjs}
                                    error={errors}
                                    id={"account_tjs"}
                                    required={true}
                                />
                                <Input
                                    className={"div34"}
                                    placeholder={"Номер договора*"}
                                    onChange={(e) => setData("contract_number", e)}
                                    value={data?.contract_number}
                                    error={errors}
                                    id={"contract_number"}
                                    required={true}
                                />
                                <Input
                                    type="date"
                                    className={"div35"}
                                    placeholder={"Дата договора*"}
                                    onChange={(e) => setData("contract_date", e)}
                                    value={data?.contract_date}
                                    error={errors}
                                    id={"contract_date"}
                                    required={true}
                                />
                                {edit && (
                                    <>
                                        <Input
                                            type="text"
                                            className="div37"
                                            placeholder="Создан в"
                                            value={
                                                data?.CreatedAt ? `Создано: ${data.CreatedAt}` : ""
                                            }
                                            disabled
                                            id="CreatedAt"
                                            style={{ width: "100%" }}
                                        />

                                        <Input
                                            type="text"
                                            className="div51"
                                            placeholder="Обновлен в"
                                            value={
                                                data?.UpdatedAt ? `Обновлено: ${data.UpdatedAt}` : ""
                                            }
                                            disabled
                                            id="UpdatedAt"
                                        />
                                    </>
                                )}
                            </div>
                            <footer>
                                <button
                                    onClick={() => onSend(false, false)}
                                    disabled={downloading || downloadingOffer}
                                >
                                    <img src={save} alt="" />
                                    <span>Сохранить</span>
                                </button>
                                <button
                                    onClick={handleSaveAndDownloadOffer}
                                    disabled={downloading || downloadingOffer}
                                >
                                    <img src={offer} alt="" />
                                    <span>
                    {downloadingOffer ? "Загрузка..." : "Загрузить оферт"}
                  </span>
                                </button>
                                <button
                                    onClick={handleSaveAndDownload}
                                    disabled={downloading || downloadingOffer}
                                >
                                    <img src={download} alt="" />
                                    <span>
                    {downloading ? "Скачивание..." : "Скачать анкету"}
                  </span>
                                </button>
                                <button>
                                    <img src={share} alt="" />
                                    <span>Загрузить анкету</span>
                                </button>
                                <button onClick={handleSearchClient} disabled={searching}>
                                    <img src={search_user} alt="" />
                                    <span>{searching ? "Поиск..." : "Найти клиента в АБС"}</span>
                                </button>
                            </footer>
                        </main>
                    )}
                </div>
            </div>
        </>
    );
}
