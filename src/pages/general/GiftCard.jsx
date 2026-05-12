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

export default function GiftCard({ edit = false }) {
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
            const filename = `offer_${applicationId}.zip`;
            downloadFile(blob, filename);

            showAlert("Оферта успешно скачана!", "success", 4000);
        } catch (error) {
            console.error("Ошибка скачивания оферты:", error);
            showAlert("Произошла ошибка при скачивании оферты", "error", 5000);
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
                } else if (!isForPoll && !isForOffer) {
                    showAlert("Данные успешно сохранены!", "success", 4000);
                }
                return true;
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
                        <div className="content-form">
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

                            <Input
                                id="receiving_office"
                                className="div9"
                                title="Офис получения"
                                placeholder="Выберите офис"
                                onChange={(val) => setData("receiving_office", val)}
                                value={data.receiving_office}
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

                            <CheckBox
                                id="is_resident"
                                className="div10"
                                title="Резидент"
                                value={data.is_resident}
                                onChange={(val) => setData("is_resident", val)}
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
                                    {downloadingOffer ? "Загрузка..." : "Загрузить оферту"}
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
        </>
    );
}
