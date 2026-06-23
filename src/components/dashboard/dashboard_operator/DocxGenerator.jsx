import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Database,
  Download,
  Edit2,
  FileJson,
  FileText,
  Info,
  Layers,
  Loader2,
  MapPin,
  MousePointerClick,
  Play,
  Plus,
  PlusCircle,
  Save,
  Search,
  Settings2,
  Shield,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import CustomSelect from "../../elements/CustomSelect";
import { docxDictionary } from "../../../utils/docxDictionary";
import {
  buildDocxPayload,
  normalizeDocxKeyMapping,
  normalizeDocxRoles,
  normalizeDocxVariant,
  normalizeDocxVariants,
  sanitizeDocxFileName,
  parseDocxJsonField,
} from "../../../utils/docxTemplateHelpers";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7575";

const SYSTEM_ROLES = [
  { id: 1, name: "Новый пользователь" },
  { id: 3, name: "Оператор" },
  { id: 5, name: "Директор" },
  { id: 6, name: "Карточник" },
  { id: 8, name: "Кредитник" },
  { id: 9, name: "Председатель" },
  { id: 10, name: "Агент по картам" },
  { id: 11, name: "Агент по кредитам" },
  { id: 12, name: "Агент по депозитам" },
  { id: 13, name: "Агент по QR-ам" },
  { id: 14, name: "Агент по SMS" },
  { id: 15, name: "Агент транзакций" },
  { id: 16, name: "Агент по таможне" },
  { id: 17, name: "Фронтовик" },
  { id: 18, name: "Процессинг" },
  { id: 19, name: "Банкоматы" },
  { id: 20, name: "Выписки счетов" },
  { id: 21, name: "Поиск по процессингу" },
  { id: 22, name: "Продукты банка" },
  { id: 23, name: "Кэшбэк по картам" },
  { id: 24, name: "Доместик payments" },
  { id: 25, name: "Управления ПВН" },
  { id: 27, name: "База документов клиентов" },
  { id: 28, name: "Остатки по картам" },
  { id: 31, name: "Логгер" },
  { id: 32, name: "Агент фоновых задач" },
  { id: 33, name: "Комплайнс" },
  { id: 34, name: "Почтовый агент" },
  { id: 35, name: "Аудитор логов" },
  { id: 36, name: "Агент по клиентам" },
  { id: 37, name: "Изменение лимитов" },
  { id: 38, name: "Менеджер по VSM" },
];

const BUTTON_PLACEMENTS = [
  {
    id: "frontovik-credit-documents",
    group: "Фронтовик",
    title: "Детали кредита",
    page: "CreditDetails",
    section: "Документы и график платежей",
    route: "/frontovik/abs-search -> клиент -> кредиты -> подробнее",
    hint: "Кнопка появится рядом с экспортом графика платежей.",
    dataScope: ["system.*", "credit.*"],
  },
  {
    id: "frontovik-client-documents",
    group: "Фронтовик",
    title: "Документы клиента",
    page: "ClientDetails",
    section: "Документы клиента",
    route: "/frontovik/abs-search -> карточка клиента",
    hint: "Используйте для общих клиентских справок и заявлений.",
    dataScope: ["system.*", "client.*"],
  },
  {
    id: "frontovik-card-list",
    group: "Фронтовик",
    title: "Карты клиента",
    page: "CardDetails",
    section: "Карты клиента",
    route: "/frontovik/abs-search -> вкладка Карты",
    hint: "Подходит для карточных заявлений и реквизитов.",
    dataScope: ["system.*", "client.*", "card.*", "account.*"],
  },
  {
    id: "frontovik-account-list",
    group: "Фронтовик",
    title: "Счета клиента",
    page: "AccountDetails",
    section: "Счета клиента в АБС",
    route: "/frontovik/abs-search -> вкладка Счета",
    hint: "Для выписок, справок по счету и реквизитов.",
    dataScope: ["system.*", "client.*", "account.*"],
  },
  {
    id: "frontovik-deposit-list",
    group: "Фронтовик",
    title: "Депозиты клиента",
    page: "DepositDetails",
    section: "Договоры депозитов",
    route: "/frontovik/abs-search -> вкладка Депозиты",
    hint: "Для депозитных договоров, справок и уведомлений.",
    dataScope: ["system.*", "client.*", "deposit.*"],
  },
  {
    id: "frontovik-vsm",
    group: "Фронтовик",
    title: "Подписки VSM",
    page: "VsmSearch",
    section: "Подписки VSM",
    route: "/frontovik/abs-search -> VSM",
    hint: "Для заявлений по подпискам и остановке инструкций.",
    dataScope: ["system.*", "client.*", "vsm.*"],
  },
  {
    id: "operator-dashboard",
    group: "Оператор",
    title: "Заявки",
    page: "OperatorDashboard",
    section: "Панель заявок",
    route: "/operator/dashboard",
    hint: "Для кредитных или карточных заявлений в панели оператора.",
    dataScope: ["system.*", "application.*"],
  },
  {
    id: "compliance-dashboard",
    group: "Комплайнс",
    title: "Проверка ПОД/ФТ",
    page: "ComplianceDashboard",
    section: "Анкета комплаенс",
    route: "/compliance/dashboard",
    hint: "Для опросных листов и заключений по проверке клиентов.",
    dataScope: ["system.*", "client.*"],
  },
  {
    id: "credit-agent",
    group: "Кредитник",
    title: "Анкета кредита",
    page: "CreditAgentDashboard",
    section: "Заявки на кредит",
    route: "/credit/dashboard",
    hint: "Для кредитных договоров и согласий на этапе рассмотрения.",
    dataScope: ["system.*", "client.*", "credit.*"],
  },
  {
    id: "deposit-agent",
    group: "Депозитник",
    title: "Новый депозит",
    page: "DepositAgentDashboard",
    section: "Открытие депозита",
    route: "/deposit/dashboard",
    hint: "Для договоров банковского вклада и заявлений на открытие.",
    dataScope: ["system.*", "client.*", "deposit.*"],
  },
  {
    id: "custom",
    group: "Своя точка",
    title: "Указать вручную",
    page: "",
    section: "",
    route: "Любая страница, где подключен DynamicDocxButtons",
    hint: "Введите page и section вручную, если кнопку уже добавили в коде.",
    dataScope: ["system.*"],
  },
];

const dictionaryItems = docxDictionary.flatMap((section) =>
  section.keys.map((item) => ({
    ...item,
    category: section.category,
  })),
);

const getInitialVariant = () => ({
  name: "Основной вариант",
  description: "",
  outputFileName: "",
  templatePath: "",
  keys: [],
});

const getInitialFormState = () => ({
  name: "",
  description: "",
  uniqueIdFormat: "",
  page: BUTTON_PLACEMENTS[0].page,
  section: BUTTON_PLACEMENTS[0].section,
  roles: [3, 17],
  variants: [getInitialVariant()],
  conditions: [],
});

const getRoleName = (id) => SYSTEM_ROLES.find((role) => role.id === Number(id))?.name || `Роль ${id}`;

const getPlacement = (page, section) =>
  BUTTON_PLACEMENTS.find((place) => place.page === page && place.section === section) ||
  BUTTON_PLACEMENTS.find((place) => place.id === "custom");

const getDictionaryItem = (key) => dictionaryItems.find((item) => item.key === key);

const createTestInputs = (variant) =>
  (variant.keys || []).reduce((acc, mapping) => {
    const normalized = normalizeDocxKeyMapping(mapping);
    if (normalized.docxKey) {
      acc[normalized.docxKey] = normalized.defaultValue || "";
    }
    return acc;
  }, {});

const DocxGenerator = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorMode, setEditorMode] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageFilter, setPageFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState(null);
  const [dictionarySearch, setDictionarySearch] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);
  const [testTemplate, setTestTemplate] = useState(null);
  const [testVariantIdx, setTestVariantIdx] = useState(0);
  const [testInputs, setTestInputs] = useState({});
  const [isTestGenerating, setIsTestGenerating] = useState(false);
  const [collapsedVariants, setCollapsedVariants] = useState({});

  const inheritVariant = (srcIndex) => {
    const sourceVariant = activeTemplate?.variants?.[srcIndex];
    if (!sourceVariant) return;

    const inheritedKeys = (sourceVariant.keys || []).map((k) => ({
      ...k,
    }));

    setActiveTemplate((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          name: `${sourceVariant.name} (копия)`,
          description: sourceVariant.description || "",
          outputFileName: sourceVariant.outputFileName ? `${sourceVariant.outputFileName}_copy` : "",
          templatePath: sourceVariant.templatePath || "",
          keys: inheritedKeys,
        },
      ],
    }));
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await axios.get(`${API_URL}/api/docx/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Не удалось загрузить шаблоны");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const hydratedTemplates = useMemo(
    () =>
      templates.map((template) => ({
        ...template,
        parsedRoles: normalizeDocxRoles(template.roles),
        parsedVariants: normalizeDocxVariants(template.variants),
      })),
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return hydratedTemplates.filter((template) => {
      const matchesQuery =
        !query ||
        [template.name, template.description, template.page, template.section]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesPage = pageFilter === "all" || template.page === pageFilter;
      const matchesRole =
        roleFilter === "all" ||
        template.parsedRoles.length === 0 ||
        template.parsedRoles.includes(Number(roleFilter));

      return matchesQuery && matchesPage && matchesRole;
    });
  }, [hydratedTemplates, pageFilter, roleFilter, searchQuery]);

  const totalVariants = hydratedTemplates.reduce(
    (sum, template) => sum + template.parsedVariants.length,
    0,
  );
  const totalMappings = hydratedTemplates.reduce(
    (sum, template) =>
      sum +
      template.parsedVariants.reduce(
        (variantSum, variant) => variantSum + (variant.keys?.length || 0),
        0,
      ),
    0,
  );

  const filteredDictionary = useMemo(() => {
    const query = dictionarySearch.trim().toLowerCase();
    if (!query) {
      return docxDictionary;
    }

    return docxDictionary
      .map((section) => ({
        ...section,
        keys: section.keys.filter((item) =>
          [item.key, item.description, section.category]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query)),
        ),
      }))
      .filter((section) => section.keys.length > 0);
  }, [dictionarySearch]);

  const handleStartAdd = () => {
    setActiveTemplate(getInitialFormState());
    setCollapsedVariants({});
    setEditorMode("add");
  };

  const handleStartEdit = (template) => {
    const parsedVariants = normalizeDocxVariants(template.variants);
    const parsedConditions = parseDocxJsonField(template.conditions || template.Conditions, []);
    setActiveTemplate({
      ...template,
      uniqueIdFormat: template.uniqueIdFormat || template.UniqueIdFormat || "",
      roles: normalizeDocxRoles(template.roles),
      variants: parsedVariants.length > 0 ? parsedVariants : [getInitialVariant()],
      conditions: Array.isArray(parsedConditions) ? parsedConditions : [],
    });
    setCollapsedVariants({});
    setEditorMode("edit");
  };

  const updateVariant = (variantIndex, patch) => {
    setActiveTemplate((current) => {
      const variants = [...current.variants];
      variants[variantIndex] = {
        ...variants[variantIndex],
        ...patch,
      };
      return { ...current, variants };
    });
  };

  const updateKeyMapping = (variantIndex, keyIndex, patch) => {
    setActiveTemplate((current) => {
      const variants = [...current.variants];
      const keys = [...(variants[variantIndex].keys || [])];
      keys[keyIndex] = {
        ...keys[keyIndex],
        ...patch,
      };
      variants[variantIndex] = {
        ...variants[variantIndex],
        keys,
      };
      return { ...current, variants };
    });
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот шаблон?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      await axios.delete(`${API_URL}/api/docx/templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadTemplates();
    } catch (err) {
      console.error(err);
      alert("Ошибка при удалении шаблона");
    }
  };

  const handleUploadFile = async (variantIndex, file) => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("template", file);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await axios.post(`${API_URL}/api/docx/templates/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      updateVariant(variantIndex, { templatePath: res.data.url });
    } catch (err) {
      console.error(err);
      alert("Ошибка при загрузке файла");
    }
  };

  const addVariant = () => {
    setActiveTemplate((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          ...getInitialVariant(),
          name: `Вариант ${current.variants.length + 1}`,
        },
      ],
    }));
  };

  const removeVariant = (variantIndex) => {
    if (activeTemplate.variants.length <= 1) {
      alert("Шаблон должен содержать как минимум один вариант генерации");
      return;
    }

    setActiveTemplate((current) => ({
      ...current,
      variants: current.variants.filter((_, index) => index !== variantIndex),
    }));
  };

  const addEmptyMapping = (variantIndex) => {
    setActiveTemplate((current) => {
      const variants = [...current.variants];
      variants[variantIndex] = {
        ...variants[variantIndex],
        keys: [
          ...(variants[variantIndex].keys || []),
          {
            docxKey: "",
            systemKey: "",
            defaultValue: "",
            required: false,
          },
        ],
      };
      return { ...current, variants };
    });
  };

  const removeKey = (variantIndex, keyIndex) => {
    setActiveTemplate((current) => {
      const variants = [...current.variants];
      variants[variantIndex] = {
        ...variants[variantIndex],
        keys: variants[variantIndex].keys.filter((_, index) => index !== keyIndex),
      };
      return { ...current, variants };
    });
  };

  const openKeyDrawer = (variantIndex) => {
    setActiveVariantIndex(variantIndex);
    setDictionarySearch("");
    setShowDrawer(true);
  };

  const selectKeyFromDrawer = (item) => {
    if (activeVariantIndex === null) {
      return;
    }

    setActiveTemplate((current) => {
      const variants = [...current.variants];
      const variant = variants[activeVariantIndex];
      const keys = variant.keys || [];

      if (keys.some((mapping) => normalizeDocxKeyMapping(mapping).docxKey === item.key)) {
        alert("Этот DOCX-ключ уже добавлен в данный вариант");
        return current;
      }

      variants[activeVariantIndex] = {
        ...variant,
        keys: [
          ...keys,
          {
            docxKey: item.key,
            systemKey: item.key,
            defaultValue: "",
            required: false,
          },
        ],
      };

      return { ...current, variants };
    });
  };

  const handleSaveTemplate = async () => {
    if (!activeTemplate.name.trim()) {
      alert("Укажите название кнопки/шаблона");
      return;
    }

    if (!activeTemplate.page.trim() || !activeTemplate.section.trim()) {
      alert("Укажите страницу и раздел, где должна появиться кнопка");
      return;
    }

    const cleanedVariants = [];

    for (let variantIndex = 0; variantIndex < activeTemplate.variants.length; variantIndex += 1) {
      const variant = activeTemplate.variants[variantIndex];
      if (!variant.name.trim()) {
        alert(`Заполните название варианта #${variantIndex + 1}`);
        return;
      }

      if (!variant.templatePath) {
        alert(`Загрузите DOCX-файл для варианта "${variant.name}"`);
        return;
      }

      const rawKeys = Array.isArray(variant.keys) ? variant.keys : [];
      const keys = [];

      for (let keyIndex = 0; keyIndex < rawKeys.length; keyIndex += 1) {
        const mapping = normalizeDocxKeyMapping(rawKeys[keyIndex]);
        const hasAnyValue =
          mapping.docxKey || mapping.systemKey || mapping.defaultValue || rawKeys[keyIndex].required;

        if (!hasAnyValue) {
          continue;
        }

        if (!mapping.docxKey || !mapping.systemKey) {
          alert(
            `В варианте "${variant.name}" заполните и DOCX-ключ, и системный ключ в строке #${keyIndex + 1}`,
          );
          return;
        }

        keys.push(mapping);
      }

      cleanedVariants.push({
        ...normalizeDocxVariant(
          {
            ...variant,
            keys,
          },
          variantIndex,
        ),
      });
    }

    const rawConditions = Array.isArray(activeTemplate.conditions)
      ? activeTemplate.conditions
      : parseDocxJsonField(activeTemplate.conditions, []);
    const conditions = rawConditions
      .map((c) => ({
        key: String(c.key || "").trim(),
        operator: String(c.operator || "=").trim(),
        value: String(c.value || "").trim(),
      }))
      .filter((c) => c.key);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const payload = {
        ...activeTemplate,
        roles: activeTemplate.roles,
        variants: cleanedVariants,
        conditions,
      };

      if (editorMode === "add") {
        await axios.post(`${API_URL}/api/docx/templates`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.put(`${API_URL}/api/docx/templates/${activeTemplate.ID || activeTemplate.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setEditorMode(null);
      setActiveTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error(err);
      alert("Ошибка сохранения шаблона");
    }
  };

  const handleOpenTest = (template) => {
    const variants = template.parsedVariants || normalizeDocxVariants(template.variants);

    if (variants.length === 0) {
      alert("У шаблона нет настроенных вариантов для генерации");
      return;
    }

    setTestTemplate({
      ...template,
      parsedVariants: variants,
    });
    setTestVariantIdx(0);
    setTestInputs(createTestInputs(variants[0]));
    setShowTestModal(true);
  };

  const handleTestVariantChange = (variantIndex) => {
    const variants = testTemplate.parsedVariants || normalizeDocxVariants(testTemplate.variants);
    setTestVariantIdx(variantIndex);
    setTestInputs(createTestInputs(variants[variantIndex]));
  };

  const handleRunTestGenerate = async () => {
    const variants = testTemplate.parsedVariants || normalizeDocxVariants(testTemplate.variants);
    const variant = variants[testVariantIdx];

    if (!variant) {
      return;
    }

    setIsTestGenerating(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/api/docx/generate`,
        {
          templatePath: variant.templatePath,
          data: buildDocxPayload(variant, {}, testInputs, testTemplate.uniqueIdFormat || testTemplate.UniqueIdFormat),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      const downloadName = sanitizeDocxFileName(
        variant.outputFileName || `${testTemplate.name}_${variant.name}`,
        "generated",
      );

      link.href = url;
      link.setAttribute("download", `${downloadName}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Ошибка генерации тестового файла");
    } finally {
      setIsTestGenerating(false);
    }
  };

  const renderRoleChips = (roles) => {
    if (!roles || roles.length === 0) {
      return <span className="docx-chip docx-chip--muted">Все роли</span>;
    }

    return roles.map((roleId) => (
      <span key={roleId} className="docx-chip">
        {getRoleName(roleId)}
      </span>
    ));
  };

  return (
    <div className="docx-page">
      <datalist id="docx-system-keys">
        {dictionaryItems.map((item) => (
          <option key={item.key} value={item.key}>
            {item.description}
          </option>
        ))}
      </datalist>

      {editorMode === null && (
        <div className="docx-page__container">
          <section className="docx-toolbar">
            <div className="docx-toolbar__copy">
              <span className="docx-eyebrow">DOCX generator</span>
              <h1>Шаблоны генерации файлов</h1>
              <p>
                Управляйте кнопками генерации, ролями, местом появления, DOCX-файлами и ключами
                подстановки из системы.
              </p>
            </div>
            <button type="button" className="docx-btn docx-btn--primary" onClick={handleStartAdd}>
              <Plus size={18} />
              <span>Добавить шаблон</span>
            </button>
          </section>

          <section className="docx-stats-grid">
            <div className="docx-stat-card">
              <FileText size={22} />
              <span>Шаблоны</span>
              <strong>{hydratedTemplates.length}</strong>
            </div>
            <div className="docx-stat-card">
              <Layers size={22} />
              <span>Варианты генерации</span>
              <strong>{totalVariants}</strong>
            </div>
            <div className="docx-stat-card">
              <MousePointerClick size={22} />
              <span>Места показа</span>
              <strong>{BUTTON_PLACEMENTS.length - 1}</strong>
            </div>
            <div className="docx-stat-card">
              <FileJson size={22} />
              <span>JSON ключи</span>
              <strong>{dictionaryItems.length}</strong>
            </div>
            <div className="docx-stat-card">
              <Database size={22} />
              <span>Маппинги</span>
              <strong>{totalMappings}</strong>
            </div>
          </section>

          <section className="docx-controls-card">
            <div className="docx-search-field">
              <Search size={18} />
              <input
                type="text"
                placeholder="Поиск по названию, странице, разделу или описанию"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <CustomSelect
              value={pageFilter}
              onChange={(val) => setPageFilter(val)}
              options={[
                { value: "all", label: "Все страницы" },
                ...[...new Set(BUTTON_PLACEMENTS.filter((item) => item.page).map((item) => item.page))].map(
                  (page) => ({ value: page, label: page })
                )
              ]}
            />
            <CustomSelect
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              options={[
                { value: "all", label: "Все роли" },
                ...SYSTEM_ROLES.map((role) => ({ value: String(role.id), label: role.name }))
              ]}
            />
          </section>

          {loading ? (
            <div className="docx-empty-state">
              <Loader2 className="docx-spin" size={34} />
              <strong>Загрузка шаблонов</strong>
              <span>Получаем ранее добавленные настройки генерации.</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="docx-empty-state">
              <FileText size={42} />
              <strong>Шаблоны не найдены</strong>
              <span>Добавьте новый шаблон или измените фильтры поиска.</span>
              <button type="button" className="docx-btn docx-btn--primary" onClick={handleStartAdd}>
                <Plus size={18} />
                <span>Добавить шаблон</span>
              </button>
            </div>
          ) : (
            <section className="docx-template-grid">
              {filteredTemplates.map((template) => {
                const placement = getPlacement(template.page, template.section);

                return (
                  <motion.article
                    key={template.ID || template.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="docx-template-card"
                  >
                    <div className="docx-template-card__head">
                      <div>
                        <span className="docx-card-kicker">{placement.group}</span>
                        <h2>{template.name}</h2>
                      </div>
                      <span className="docx-count-badge">
                        {template.parsedVariants.length}{" "}
                        {template.parsedVariants.length === 1 ? "вариант" : "варианта"}
                      </span>
                    </div>

                    <p className="docx-template-description">
                      {template.description || "Описание пока не добавлено"}
                    </p>

                    <div className="docx-placement-preview">
                      <MapPin size={16} />
                      <div>
                        <strong>{placement.title}</strong>
                        <span>{placement.hint}</span>
                        <code>
                          {template.page} / {template.section}
                        </code>
                      </div>
                    </div>

                    <div className="docx-card-meta">
                      <div>
                        <span className="docx-meta-label">Роли</span>
                        <div className="docx-chip-list">{renderRoleChips(template.parsedRoles)}</div>
                      </div>
                      <div>
                        <span className="docx-meta-label">Варианты</span>
                        <div className="docx-variant-mini-list">
                          {template.parsedVariants.slice(0, 3).map((variant, index) => (
                            <span key={`${variant.name}-${index}`}>
                              {variant.name} · {variant.keys?.length || 0} ключ.
                            </span>
                          ))}
                          {template.parsedVariants.length > 3 && (
                            <span>+{template.parsedVariants.length - 3} еще</span>
                          )}
                        </div>
                      </div>
                      {template.conditions && parseDocxJsonField(template.conditions, []).length > 0 && (
                        <div>
                          <span className="docx-meta-label">Условия ({parseDocxJsonField(template.conditions, []).length})</span>
                          <div className="docx-variant-mini-list">
                            {parseDocxJsonField(template.conditions, []).map((cond, idx) => (
                              <span key={idx}>
                                <code>{cond.key}</code> {cond.operator} <code>{cond.value}</code>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="docx-card-actions">
                      <button type="button" className="docx-btn docx-btn--secondary" onClick={() => handleStartEdit(template)}>
                        <Edit2 size={16} />
                        <span>Изменить</span>
                      </button>
                      <button type="button" className="docx-btn docx-btn--accent" onClick={() => handleOpenTest(template)}>
                        <Play size={16} />
                        <span>Сгенерировать</span>
                      </button>
                      <button
                        type="button"
                        className="docx-icon-btn docx-icon-btn--danger"
                        onClick={() => handleDeleteTemplate(template.ID || template.id)}
                        title="Удалить шаблон"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </section>
          )}
        </div>
      )}

      {editorMode !== null && activeTemplate && (
        <div className="docx-builder-shell">
          <button type="button" className="docx-back-btn" onClick={() => setEditorMode(null)}>
            <ArrowLeft size={18} />
            <span>Вернуться к шаблонам</span>
          </button>

          <div className="docx-builder-header">
            <div>
              <span className="docx-eyebrow">{editorMode === "add" ? "Новый шаблон" : "Редактирование"}</span>
              <h1>{editorMode === "add" ? "Добавление генерации DOCX" : activeTemplate.name}</h1>
              <p>
                Настройте кнопку, роли, место появления и несколько вариантов генерации. Для каждого
                варианта можно загрузить свой DOCX и задать отдельные ключи.
              </p>
            </div>
            <button type="button" className="docx-btn docx-btn--primary" onClick={handleSaveTemplate}>
              <Save size={18} />
              <span>Сохранить</span>
            </button>
          </div>

          <div className="docx-builder-layout">
            <main className="docx-builder-main">
              <section className="docx-editor-card">
                <div className="docx-section-title">
                  <Info size={18} />
                  <div>
                    <h2>Кнопка генерации</h2>
                    <p>Название будет видно пользователю на странице фронтовика.</p>
                  </div>
                </div>

                <div className="docx-form-grid">
                  <label className="docx-field">
                    <span>Название кнопки *</span>
                    <input
                      type="text"
                      value={activeTemplate.name}
                      onChange={(event) =>
                        setActiveTemplate({ ...activeTemplate, name: event.target.value })
                      }
                      placeholder="Например: Справка о кредите"
                    />
                  </label>
                  <label className="docx-field">
                    <span>Описание / подсказка</span>
                    <input
                      type="text"
                      value={activeTemplate.description}
                      onChange={(event) =>
                        setActiveTemplate({ ...activeTemplate, description: event.target.value })
                      }
                      placeholder="Пояснение для оператора"
                    />
                  </label>
                  <label className="docx-field">
                    <span>Формат уникального номера (uniqueId)</span>
                    <input
                      type="text"
                      value={activeTemplate.uniqueIdFormat || ""}
                      onChange={(event) =>
                        setActiveTemplate({ ...activeTemplate, uniqueIdFormat: event.target.value })
                      }
                      placeholder="Например: YYYYMMDD-RAND-SEQ"
                    />
                    <small style={{ color: "#6b7280", marginTop: "4px", fontSize: "11px" }}>
                      Формат для system.uniqueId. Токены: <strong>YYYY</strong> (год), <strong>YY</strong> (год 2 знака), <strong>MM</strong> (месяц), <strong>DD</strong> (день), <strong>HH</strong> (часы), <strong>mm</strong> (минуты), <strong>ss</strong> (секунды), <strong>RAND</strong> (случайные 4 цифры), <strong>SEQ</strong> (хвост таймстампа 6 цифр).
                    </small>
                  </label>
                </div>
              </section>

              <section className="docx-editor-card">
                <div className="docx-section-title">
                  <MousePointerClick size={18} />
                  <div>
                    <h2>Где показывать кнопку</h2>
                    <p>Выберите страницу и раздел. Эти значения должны совпасть с DynamicDocxButtons.</p>
                  </div>
                </div>

                <div className="docx-placement-grid">
                  {BUTTON_PLACEMENTS.map((place) => {
                    const active =
                      place.id === "custom"
                        ? !BUTTON_PLACEMENTS.some(
                            (item) =>
                              item.id !== "custom" &&
                              item.page === activeTemplate.page &&
                              item.section === activeTemplate.section,
                          )
                        : place.page === activeTemplate.page && place.section === activeTemplate.section;

                    return (
                      <button
                        key={place.id}
                        type="button"
                        className={`docx-placement-option ${active ? "is-active" : ""}`}
                        onClick={() =>
                          setActiveTemplate({
                            ...activeTemplate,
                            page: place.page || activeTemplate.page,
                            section: place.section || activeTemplate.section,
                          })
                        }
                      >
                        <span>{place.group}</span>
                        <strong>{place.title}</strong>
                        <small>{place.hint}</small>
                      </button>
                    );
                  })}
                </div>

                <div className="docx-form-grid docx-form-grid--compact">
                  <label className="docx-field">
                    <span>Page *</span>
                    <input
                      type="text"
                      value={activeTemplate.page}
                      onChange={(event) =>
                        setActiveTemplate({ ...activeTemplate, page: event.target.value })
                      }
                      placeholder="CreditDetails"
                    />
                  </label>
                  <label className="docx-field">
                    <span>Section *</span>
                    <input
                      type="text"
                      value={activeTemplate.section}
                      onChange={(event) =>
                        setActiveTemplate({ ...activeTemplate, section: event.target.value })
                      }
                      placeholder="Документы и график платежей"
                    />
                  </label>
                </div>
              </section>

              <section className="docx-editor-card">
                <div className="docx-section-title docx-section-title--with-action" style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "stretch" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="docx-section-title__copy">
                      <Settings2 size={18} />
                      <div>
                        <h2>Условия для показа кнопки</h2>
                        <p>Кнопка появится только если все условия выполняются (на основе данных страницы и системы).</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="docx-btn docx-btn--secondary"
                      onClick={() => {
                        const conditions = Array.isArray(activeTemplate.conditions)
                          ? activeTemplate.conditions
                          : parseDocxJsonField(activeTemplate.conditions, []);
                        setActiveTemplate({
                          ...activeTemplate,
                          conditions: [
                            ...conditions,
                            { key: "", operator: "=", value: "" }
                          ]
                        });
                      }}
                    >
                      <Plus size={16} />
                      <span>Добавить условие</span>
                    </button>
                  </div>
                </div>

                {(() => {
                  const conditions = Array.isArray(activeTemplate.conditions)
                    ? activeTemplate.conditions
                    : parseDocxJsonField(activeTemplate.conditions, []);

                  if (conditions.length === 0) {
                    return (
                      <div className="docx-mapping-empty" style={{ padding: "20px 0" }}>
                        <Info size={20} />
                        <span>Нет настроенных условий. Кнопка будет показываться всегда.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="docx-mapping-table" style={{ marginTop: "12px" }}>
                      <div className="docx-mapping-row docx-mapping-row--head" style={{ gridTemplateColumns: "1fr 120px 1fr 50px" }}>
                        <span>Системный/JSON ключ</span>
                        <span>Сравнение</span>
                        <span>Значение</span>
                        <span></span>
                      </div>
                      {conditions.map((cond, condIdx) => {
                        const dictionaryItem = getDictionaryItem(cond.key);

                        return (
                          <div key={condIdx} className="docx-mapping-row" style={{ gridTemplateColumns: "1fr 120px 1fr 50px" }}>
                            <label className="docx-field docx-field--small">
                              <input
                                type="text"
                                list="docx-system-keys"
                                value={cond.key || ""}
                                onChange={(event) => {
                                  const updated = [...conditions];
                                  updated[condIdx] = { ...updated[condIdx], key: event.target.value };
                                  setActiveTemplate({ ...activeTemplate, conditions: updated });
                                }}
                                placeholder="client.fullName или system.currentYear"
                              />
                              {dictionaryItem && <small>{dictionaryItem.description}</small>}
                            </label>
                            
                            <div className="docx-field docx-field--small">
                              <CustomSelect
                                value={cond.operator || "="}
                                onChange={(val) => {
                                  const updated = [...conditions];
                                  updated[condIdx] = { ...updated[condIdx], operator: val };
                                  setActiveTemplate({ ...activeTemplate, conditions: updated });
                                }}
                                options={[
                                  { value: "=", label: "=" },
                                  { value: "!=", label: "!=" },
                                  { value: ">", label: ">" },
                                  { value: "<", label: "<" },
                                  { value: ">=", label: ">=" },
                                  { value: "<=", label: "<=" },
                                ]}
                                style={{ width: "100%" }}
                              />
                            </div>

                            <label className="docx-field docx-field--small">
                              <input
                                type="text"
                                value={cond.value || ""}
                                onChange={(event) => {
                                  const updated = [...conditions];
                                  updated[condIdx] = { ...updated[condIdx], value: event.target.value };
                                  setActiveTemplate({ ...activeTemplate, conditions: updated });
                                }}
                                placeholder="Например: 2026"
                              />
                            </label>

                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                              <button
                                type="button"
                                className="docx-icon-btn docx-icon-btn--danger"
                                onClick={() => {
                                  const updated = conditions.filter((_, idx) => idx !== condIdx);
                                  setActiveTemplate({ ...activeTemplate, conditions: updated });
                                }}
                                title="Удалить условие"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>

              <section className="docx-editor-card">
                <div className="docx-section-title">
                  <Shield size={18} />
                  <div>
                    <h2>Кто видит кнопку</h2>
                    <p>Если роли не выбрать, кнопка будет считаться доступной всем авторизованным.</p>
                  </div>
                </div>

                <div className="docx-roles-grid">
                  {SYSTEM_ROLES.map((role) => {
                    const checked = activeTemplate.roles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={`docx-role-toggle ${checked ? "is-active" : ""}`}
                        onClick={() => {
                          const roles = checked
                            ? activeTemplate.roles.filter((id) => id !== role.id)
                            : [...activeTemplate.roles, role.id];
                          setActiveTemplate({ ...activeTemplate, roles });
                        }}
                      >
                        {checked && <Check size={14} />}
                        <span>{role.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="docx-editor-card">
                <div className="docx-section-title docx-section-title--with-action" style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "stretch" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="docx-section-title__copy">
                      <Layers size={18} />
                      <div>
                        <h2>Варианты генерации</h2>
                        <p>Один шаблон-кнопка может открывать несколько DOCX-файлов на выбор.</p>
                      </div>
                    </div>
                  </div>
                  <div className="docx-mapping-actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #f3f4f6", paddingTop: "12px" }}>
                    <button
                      type="button"
                      className="docx-btn docx-btn--secondary"
                      onClick={() => {
                        const allCollapsed = {};
                        activeTemplate.variants.forEach((_, idx) => {
                          allCollapsed[idx] = true;
                        });
                        setCollapsedVariants(allCollapsed);
                      }}
                    >
                      Свернуть все
                    </button>
                    <button
                      type="button"
                      className="docx-btn docx-btn--secondary"
                      onClick={() => setCollapsedVariants({})}
                    >
                      Развернуть все
                    </button>
                    <button type="button" className="docx-btn docx-btn--secondary" onClick={addVariant}>
                      <PlusCircle size={16} />
                      <span>Добавить вариант</span>
                    </button>
                    {activeTemplate.variants.length > 0 && (
                      <div className="docx-inherit-selector" style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                        <span style={{ fontSize: "13px", color: "#6b7280" }}>Наследовать из:</span>
                        <CustomSelect
                          value=""
                          placeholder="Выберите вариант..."
                          onChange={(val) => {
                            if (val !== "") {
                              inheritVariant(Number(val));
                            }
                          }}
                          options={[
                            { value: "", label: "Выберите вариант..." },
                            ...activeTemplate.variants.map((v, idx) => ({
                              value: String(idx),
                              label: `${idx + 1}. ${v.name || `Вариант ${idx + 1}`}`
                            }))
                          ]}
                          style={{ minWidth: "200px" }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="docx-variant-list">
                  {activeTemplate.variants.map((variant, variantIndex) => (
                    <article key={variantIndex} className="docx-variant-card">
                      <div className="docx-variant-card__header" style={{ marginBottom: collapsedVariants[variantIndex] ? "0px" : "16px" }}>
                        <div className="docx-variant-number">{variantIndex + 1}</div>
                        {collapsedVariants[variantIndex] ? (
                          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: "12px", marginLeft: "12px" }}>
                            <strong style={{ fontSize: "16px" }}>{variant.name || `Вариант ${variantIndex + 1}`}</strong>
                            <span style={{ color: "#6b7280", fontSize: "13px" }}>
                              {variant.templatePath ? variant.templatePath.split("/").pop() : "Файл не прикреплен"} · {variant.keys?.length || 0} ключей
                            </span>
                          </div>
                        ) : (
                          <div className="docx-variant-title-fields">
                            <label className="docx-field">
                              <span>Название варианта *</span>
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(event) =>
                                  updateVariant(variantIndex, { name: event.target.value })
                                }
                                placeholder="Например: Для физического лица"
                              />
                            </label>
                            <label className="docx-field">
                              <span>Имя файла при скачивании</span>
                              <input
                                type="text"
                                value={variant.outputFileName || ""}
                                onChange={(event) =>
                                  updateVariant(variantIndex, { outputFileName: event.target.value })
                                }
                                placeholder="Например: credit_certificate"
                              />
                            </label>
                          </div>
                        )}
                        <button
                          type="button"
                          className="docx-btn docx-btn--secondary"
                          onClick={() => setCollapsedVariants(prev => ({
                            ...prev,
                            [variantIndex]: !prev[variantIndex]
                          }))}
                          style={{ marginLeft: "auto", marginRight: "8px", padding: "6px 12px", minWidth: "100px" }}
                        >
                          {collapsedVariants[variantIndex] ? "Развернуть" : "Свернуть"}
                        </button>
                        {activeTemplate.variants.length > 1 && (
                          <button
                            type="button"
                            className="docx-icon-btn docx-icon-btn--danger"
                            onClick={() => removeVariant(variantIndex)}
                            title="Удалить вариант"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {!collapsedVariants[variantIndex] && (
                        <>
                          <label className="docx-field">
                            <span>Описание варианта</span>
                            <input
                              type="text"
                              value={variant.description || ""}
                              onChange={(event) =>
                                updateVariant(variantIndex, { description: event.target.value })
                              }
                              placeholder="Например: Печатная форма с подписью филиала"
                            />
                          </label>

                          <div className="docx-upload-box">
                            <div className="docx-upload-box__file">
                              <FileText size={26} />
                              <div>
                                <strong>DOCX-файл варианта</strong>
                                <span>
                                  {variant.templatePath
                                    ? variant.templatePath.split("/").pop()
                                    : "Файл пока не прикреплен"}
                                </span>
                              </div>
                            </div>
                            <div className="docx-upload-actions">
                              {variant.templatePath && (
                                <a
                                  href={`${API_URL}${variant.templatePath}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="docx-btn docx-btn--secondary"
                                >
                                  <Download size={16} />
                                  <span>Скачать</span>
                                </a>
                              )}
                              <label className="docx-btn docx-btn--dark">
                                <Upload size={16} />
                                <span>{variant.templatePath ? "Заменить файл" : "Загрузить DOCX"}</span>
                                <input
                                  type="file"
                                  accept=".docx"
                                  onChange={(event) =>
                                    handleUploadFile(variantIndex, event.target.files?.[0])
                                  }
                                />
                              </label>
                            </div>
                          </div>

                          <div className="docx-mapping-head">
                            <div>
                              <strong>Ключи подстановки</strong>
                              <span>DOCX-ключ должен совпадать с плейсхолдером в файле.</span>
                            </div>
                            <div className="docx-mapping-actions">
                              <button
                                type="button"
                                className="docx-btn docx-btn--secondary"
                                onClick={() => addEmptyMapping(variantIndex)}
                              >
                                <Plus size={16} />
                                <span>Пустая строка</span>
                              </button>
                              <button
                                type="button"
                                className="docx-btn docx-btn--accent"
                                onClick={() => openKeyDrawer(variantIndex)}
                              >
                                <FileJson size={16} />
                                <span>Выбрать из docxDictionary</span>
                              </button>
                            </div>
                          </div>

                          {(variant.keys || []).length === 0 ? (
                            <div className="docx-mapping-empty">
                              <FileJson size={24} />
                              <span>
                                Добавьте ключи только для этого варианта. Список JSON-ключей открывается
                                при добавлении или редактировании шаблона.
                              </span>
                            </div>
                          ) : (
                            <div className="docx-mapping-table">
                              <div className="docx-mapping-row docx-mapping-row--head">
                                <span>Ключ в DOCX</span>
                                <span>Ключ из системы</span>
                                <span>Если пусто</span>
                                <span>Опции</span>
                              </div>
                              {variant.keys.map((mapping, keyIndex) => {
                                const normalized = normalizeDocxKeyMapping(mapping);
                                const dictionaryItem = getDictionaryItem(normalized.systemKey);

                                return (
                                  <div key={keyIndex} className="docx-mapping-row">
                                    <label className="docx-field docx-field--small">
                                      <input
                                        type="text"
                                        value={normalized.docxKey}
                                        onChange={(event) =>
                                          updateKeyMapping(variantIndex, keyIndex, {
                                            docxKey: event.target.value,
                                          })
                                        }
                                        placeholder="client.fullName"
                                      />
                                    </label>
                                    <label className="docx-field docx-field--small">
                                      <input
                                        type="text"
                                        list="docx-system-keys"
                                        value={normalized.systemKey}
                                        onChange={(event) =>
                                          updateKeyMapping(variantIndex, keyIndex, {
                                            systemKey: event.target.value,
                                            key: event.target.value,
                                          })
                                        }
                                        placeholder="credit.amount"
                                      />
                                      {dictionaryItem && <small>{dictionaryItem.description}</small>}
                                    </label>
                                    <label className="docx-field docx-field--small">
                                      <input
                                        type="text"
                                        value={normalized.defaultValue}
                                        onChange={(event) =>
                                          updateKeyMapping(variantIndex, keyIndex, {
                                            defaultValue: event.target.value,
                                          })
                                        }
                                        placeholder="Нет данных"
                                      />
                                    </label>
                                    <div className="docx-mapping-options">
                                      <label className="docx-check">
                                        <input
                                          type="checkbox"
                                          checked={normalized.required}
                                          onChange={(event) =>
                                            updateKeyMapping(variantIndex, keyIndex, {
                                              required: event.target.checked,
                                            })
                                          }
                                        />
                                        <span>важно</span>
                                      </label>
                                      <button
                                        type="button"
                                        className="docx-icon-btn docx-icon-btn--danger"
                                        onClick={() => removeKey(variantIndex, keyIndex)}
                                        title="Удалить ключ"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            </main>

            <aside className="docx-builder-aside">
              <div className="docx-preview-card">
                <div className="docx-preview-card__icon">
                  <Settings2 size={20} />
                </div>
                <h2>Как это появится</h2>
                <p>На выбранной странице пользователь увидит кнопку с названием шаблона.</p>
                <div className="docx-preview-button">
                  <FileText size={16} />
                  <span>{activeTemplate.name || "Название кнопки"}</span>
                </div>
                <div className="docx-preview-meta">
                  <span>Страница</span>
                  <code>{activeTemplate.page || "page"}</code>
                  <span>Раздел</span>
                  <code>{activeTemplate.section || "section"}</code>
                  <span>Роли</span>
                  <div className="docx-chip-list">{renderRoleChips(activeTemplate.roles)}</div>
                  <span>Условия</span>
                  <div className="docx-variant-mini-list" style={{ marginTop: "4px" }}>
                    {(() => {
                      const conditions = Array.isArray(activeTemplate.conditions)
                        ? activeTemplate.conditions
                        : parseDocxJsonField(activeTemplate.conditions, []);
                      if (conditions.length === 0) return <span style={{ color: "#9ca3af" }}>Без условий (всегда)</span>;
                      return conditions.map((cond, idx) => (
                        <span key={idx}>
                          <code>{cond.key || "?"}</code> {cond.operator} <code>{cond.value || "?"}</code>
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="docx-preview-card">
                <h2>Подсказка по ключам</h2>
                <p>
                  В DOCX используйте плейсхолдеры вида <code>{"{client.fullName}"}</code>. В строке
                  маппинга можно оставить такой же ключ или указать свой DOCX-ключ и отдельный ключ
                  системы.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showDrawer && (
          <div className="docx-drawer-layer">
            <motion.div
              className="docx-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
            />
            <motion.aside
              className="docx-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
            >
              <div className="docx-drawer__header">
                <div>
                  <span className="docx-eyebrow">docxDictionary</span>
                  <h2>Выберите системный ключ</h2>
                  <p>Он добавится как системный ключ и как DOCX-ключ, но DOCX-ключ можно поменять.</p>
                </div>
                <button type="button" className="docx-icon-btn" onClick={() => setShowDrawer(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="docx-search-field docx-search-field--drawer">
                <Search size={18} />
                <input
                  type="text"
                  value={dictionarySearch}
                  onChange={(event) => setDictionarySearch(event.target.value)}
                  placeholder="Найти JSON-ключ"
                />
              </div>

              <div className="docx-dictionary-list">
                {filteredDictionary.map((section) => (
                  <section key={section.category} className="docx-dictionary-section">
                    <h3>{section.category}</h3>
                    <div>
                      {section.keys.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className="docx-dictionary-item"
                          onClick={() => selectKeyFromDrawer(item)}
                        >
                          <span>
                            <code>{item.key}</code>
                            <small>{item.description}</small>
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTestModal && testTemplate && (
          <div className="docx-modal-layer">
            <motion.div
              className="docx-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: "spring", duration: 0.35 }}
            >
              <div className="docx-modal__header">
                <div>
                  <span className="docx-eyebrow">Генерация файла</span>
                  <h2>{testTemplate.name}</h2>
                  <p>Выберите вариант и заполните тестовые значения. Пустые поля возьмут default.</p>
                </div>
                <button type="button" className="docx-icon-btn" onClick={() => setShowTestModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="docx-modal__body">
                <label className="docx-field">
                  <span>Вариант файла</span>
                  <CustomSelect
                    value={String(testVariantIdx)}
                    onChange={(val) => handleTestVariantChange(Number(val))}
                    options={(testTemplate.parsedVariants || []).map((variant, index) => ({
                      value: String(index),
                      label: variant.name
                    }))}
                  />
                </label>

                {(() => {
                  const variant = (testTemplate.parsedVariants || [])[testVariantIdx];
                  const keys = variant?.keys || [];

                  if (keys.length === 0) {
                    return (
                      <div className="docx-mapping-empty">
                        <FileJson size={24} />
                        <span>В этом варианте нет настроенных ключей, файл будет создан без пользовательских подстановок.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="docx-test-key-list">
                      {keys.map((mapping) => {
                        const normalized = normalizeDocxKeyMapping(mapping);
                        const dictionaryItem = getDictionaryItem(normalized.systemKey);

                        return (
                          <label key={normalized.docxKey} className="docx-test-key">
                            <span>
                              <code>{normalized.docxKey}</code>
                              <small>
                                {normalized.systemKey}
                                {dictionaryItem ? ` · ${dictionaryItem.description}` : ""}
                              </small>
                            </span>
                            <input
                              type="text"
                              value={testInputs[normalized.docxKey] ?? ""}
                              onChange={(event) =>
                                setTestInputs({
                                  ...testInputs,
                                  [normalized.docxKey]: event.target.value,
                                })
                              }
                              placeholder={normalized.defaultValue || "Пусто = default"}
                            />
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="docx-modal__footer">
                <button type="button" className="docx-btn docx-btn--secondary" onClick={() => setShowTestModal(false)}>
                  Закрыть
                </button>
                <button
                  type="button"
                  className="docx-btn docx-btn--primary"
                  onClick={handleRunTestGenerate}
                  disabled={isTestGenerating}
                >
                  {isTestGenerating ? <Loader2 className="docx-spin" size={16} /> : <Download size={16} />}
                  <span>{isTestGenerating ? "Генерация..." : "Сгенерировать и скачать"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocxGenerator;
