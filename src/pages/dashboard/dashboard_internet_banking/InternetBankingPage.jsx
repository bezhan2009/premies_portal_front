import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftRight, Ban, BookOpenText, Cpu, Edit3, Landmark, ListTree, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users } from "lucide-react";

import {
  getInternetBankingClient,
  listInternetBankingARMs,
  listInternetBankingClients,
  listInternetBankingRoles,
  saveInternetBankingARM,
  saveInternetBankingClient,
  saveInternetBankingRole,
  setInternetBankingClientStatus,
} from "../../../api/internetBanking.js";
import {
  buildClientPayload,
  clientToForm,
  emptyInternetBankingPerson,
} from "./internetBankingForm.js";
import InternetBankingDictionary from "./InternetBankingDictionary.jsx";
import InternetBankingOperations from "./InternetBankingOperations.jsx";
import InternetBankingPaymentCategories from "./InternetBankingPaymentCategories.jsx";

const { Title, Text } = Typography;

export default function InternetBankingPage() {
  const [clients, setClients] = useState([]);
  const [roles, setRoles] = useState([]);
  const [arms, setARMs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [query, setQuery] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientModal, setClientModal] = useState({ open: false, client: null });
  const [roleModal, setRoleModal] = useState({ open: false, role: null });
  const [armModal, setARMModal] = useState({ open: false, arm: null });
  const [clientForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [armForm] = Form.useForm();

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listInternetBankingClients({ page, pageSize, query });
      setClients(data?.items || []);
      setTotal(data?.total || 0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query]);

  const loadCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [rolesData, armsData] = await Promise.all([
        listInternetBankingRoles(),
        listInternetBankingARMs(),
      ]);
      setRoles(rolesData?.items || []);
      setARMs(armsData?.items || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { loadCatalogs(); }, [loadCatalogs]);

  const applySearch = () => {
    const nextQuery = searchDraft.trim();
    if (page === 1 && query === nextQuery) {
      loadClients();
      return;
    }
    setPage(1);
    setQuery(nextQuery);
  };

  const roleOptions = useMemo(() => roles
    .filter((role) => role.is_active !== false)
    .map((role) => ({ value: role.code, label: `${role.name} (${role.code})` })), [roles]);
  const armOptions = useMemo(() => arms
    .filter((arm) => arm.is_active !== false)
    .map((arm) => ({ value: arm.code, label: `${arm.name} (${arm.code})` })), [arms]);

  const openClientModal = async (client) => {
    setError("");
    if (!client) {
      clientForm.setFieldsValue({
        absClientCode: "",
        displayName: "",
        isActive: true,
        people: [emptyInternetBankingPerson()],
      });
      setClientModal({ open: true, client: null });
      return;
    }
    try {
      const detail = await getInternetBankingClient(client.id);
      clientForm.setFieldsValue(clientToForm(detail));
      setClientModal({ open: true, client: detail });
    } catch (requestError) {
      message.error(requestError.message);
    }
  };

  const submitClient = async () => {
    try {
      const values = await clientForm.validateFields();
      const payload = buildClientPayload(values, clientModal.client?.id);
      await saveInternetBankingClient(payload);
      message.success(clientModal.client ? "Доступы обновлены" : "Клиент добавлен");
      setClientModal({ open: false, client: null });
      await Promise.all([loadClients(), loadCatalogs()]);
    } catch (submitError) {
      if (!submitError.errorFields) message.error(submitError.message);
    }
  };

  const toggleClient = (client) => {
    const nextActive = !client.is_active;
    Modal.confirm({
      title: nextActive ? "Активировать доступ?" : "Отключить доступ?",
      content: `${client.abs_client_code} — ${client.display_name || "без названия"}`,
      okText: nextActive ? "Активировать" : "Отключить",
      okButtonProps: { danger: !nextActive },
      cancelText: "Отмена",
      async onOk() {
        await setInternetBankingClientStatus(client.id, nextActive);
        message.success("Статус изменён");
        await loadClients();
      },
    });
  };

  const openRoleModal = (role) => {
    roleForm.setFieldsValue(role ? {
      code: role.code,
      name: role.name,
      description: role.description,
      armCodes: (role.arms || []).map((arm) => arm.code),
      isActive: role.is_active !== false,
    } : { code: "", name: "", description: "", armCodes: [], isActive: true });
    setRoleModal({ open: true, role: role || null });
  };

  const submitRole = async () => {
    try {
      const values = await roleForm.validateFields();
      await saveInternetBankingRole({
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || "",
        arm_codes: values.armCodes || [],
        is_active: values.isActive,
        persisted: Boolean(roleModal.role),
      });
      message.success("Роль сохранена");
      setRoleModal({ open: false, role: null });
      await loadCatalogs();
    } catch (submitError) {
      if (!submitError.errorFields) message.error(submitError.message);
    }
  };

  const openARMModal = (arm) => {
    armForm.setFieldsValue(arm ? {
      code: arm.code,
      name: arm.name,
      description: arm.description,
      group: arm.group,
      sortOrder: arm.sort_order,
      isActive: arm.is_active !== false,
    } : { code: "", name: "", description: "", group: "client", sortOrder: 0, isActive: true });
    setARMModal({ open: true, arm: arm || null });
  };

  const submitARM = async () => {
    try {
      const values = await armForm.validateFields();
      await saveInternetBankingARM({
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || "",
        group: values.group.trim(),
        sort_order: values.sortOrder || 0,
        is_active: values.isActive,
        persisted: Boolean(armModal.arm),
      });
      message.success("АРМ сохранён");
      setARMModal({ open: false, arm: null });
      await loadCatalogs();
    } catch (submitError) {
      if (!submitError.errorFields) message.error(submitError.message);
    }
  };

  const clientColumns = [
    { title: "Код клиента в АБС", dataIndex: "abs_client_code", width: 190, render: (value) => <Text code>{value}</Text> },
    { title: "Клиент", dataIndex: "display_name", render: (value) => value || "—" },
    {
      title: "Пользователи",
      dataIndex: "people",
      render: (people = []) => <Space wrap>{people.map((person) => <Tag color={person.is_active === false ? "red" : "default"} key={person.access_id || person.id}>{person.full_name}{person.is_active === false ? " · заблокирован" : ""}</Tag>)}</Space>,
    },
    {
      title: "Разрешенные IP",
      dataIndex: "people",
      render: (people = []) => people.flatMap((person) => person.allowed_ips || []).join(", ") || "Любой IP",
    },
    {
      title: "Телефоны",
      dataIndex: "people",
      render: (people = []) => people.flatMap((person) => person.phones || []).join(", ") || "—",
    },
    { title: "Статус", dataIndex: "is_active", width: 130, render: (active) => <Tag color={active ? "green" : "red"}>{active ? "Активен" : "Отключён"}</Tag> },
    {
      title: "Действия",
      width: 220,
      render: (_, client) => <Space>
        <Button icon={<Edit3 size={15} />} onClick={() => openClientModal(client)}>Изменить</Button>
        <Button danger={client.is_active} onClick={() => toggleClient(client)}>{client.is_active ? "Отключить" : "Включить"}</Button>
      </Space>,
    },
  ];

  const roleColumns = [
    { title: "Код", dataIndex: "code", width: 220, render: (value) => <Text code>{value}</Text> },
    { title: "Название", dataIndex: "name" },
    { title: "АРМ", dataIndex: "arms", render: (items = []) => <Space wrap>{items.map((arm) => <Tag key={arm.code}>{arm.name || arm.code}</Tag>)}</Space> },
    { title: "Статус", dataIndex: "is_active", width: 120, render: (active) => <Tag color={active ? "green" : "default"}>{active ? "Активна" : "Отключена"}</Tag> },
    { title: "", width: 120, render: (_, role) => <Button icon={<Edit3 size={15} />} onClick={() => openRoleModal(role)}>Изменить</Button> },
  ];

  const armColumns = [
    { title: "Код АРМ", dataIndex: "code", width: 260, render: (value) => <Text code>{value}</Text> },
    { title: "Название", dataIndex: "name" },
    { title: "Группа", dataIndex: "group", width: 150, render: (value) => <Tag>{value}</Tag> },
    { title: "Порядок", dataIndex: "sort_order", width: 100 },
    { title: "Статус", dataIndex: "is_active", width: 120, render: (active) => <Tag color={active ? "green" : "default"}>{active ? "Активен" : "Отключён"}</Tag> },
    { title: "", width: 120, render: (_, arm) => <Button icon={<Edit3 size={15} />} onClick={() => openARMModal(arm)}>Изменить</Button> },
  ];

  const tabs = [
	{
	  key: "payment-categories",
	  label: <span className="ib-tab-label"><ArrowLeftRight size={16} />Категории платежей/переводов</span>,
	  children: <InternetBankingPaymentCategories />,
	},
	{
	  key: "operations",
	  label: <span className="ib-tab-label"><ListTree size={16} />Операции</span>,
	  children: <InternetBankingOperations />,
	},
    {
      key: "clients",
      label: <span className="ib-tab-label"><Users size={16} />Клиенты и доступы</span>,
      children: <Card className="ib-section-card" bordered>
        <div className="ib-table-toolbar">
          <Input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} onPressEnter={applySearch} prefix={<Search size={16} />} allowClear placeholder="Код АБС, ФИО, ИНН или телефон" />
          <Button icon={<Search size={16} />} onClick={applySearch}>Найти</Button>
          <Button icon={<RefreshCw size={16} />} onClick={() => loadClients()}>Обновить</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => openClientModal(null)}>Добавить клиента</Button>
        </div>
        <Table rowKey="id" loading={loading} dataSource={clients} columns={clientColumns} scroll={{ x: 1100 }} pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); } }} />
      </Card>,
    },
    {
      key: "roles",
      label: <span className="ib-tab-label"><ShieldCheck size={16} />Роли</span>,
      children: <Card className="ib-section-card" bordered>
        <div className="ib-table-toolbar ib-table-toolbar--end"><Button type="primary" icon={<Plus size={16} />} onClick={() => openRoleModal(null)}>Добавить роль</Button></div>
        <Table rowKey="code" loading={catalogLoading} dataSource={roles} columns={roleColumns} scroll={{ x: 900 }} pagination={false} />
      </Card>,
    },
    {
      key: "arms",
      label: <span className="ib-tab-label"><Cpu size={16} />АРМ</span>,
      children: <Card className="ib-section-card" bordered>
        <div className="ib-table-toolbar ib-table-toolbar--end"><Button type="primary" icon={<Plus size={16} />} onClick={() => openARMModal(null)}>Добавить АРМ</Button></div>
        <Table rowKey="code" loading={catalogLoading} dataSource={arms} columns={armColumns} scroll={{ x: 900 }} pagination={false} />
      </Card>,
    },
    {
      key: "dictionary",
      label: <span className="ib-tab-label"><BookOpenText size={16} />Словари</span>,
      children: <InternetBankingDictionary />,
    },
  ];

  return <div className="internet-banking-admin-page">
    <header className="ib-page-header">
      <div className="ib-page-icon"><Landmark size={26} /></div>
      <div><Title level={2}>Интернет банк</Title><Text type="secondary">Клиенты, пользователи и точечные права доступа к продуктам АБС</Text></div>
    </header>
    {error && <Alert className="ib-error" type="error" showIcon closable message={error} onClose={() => setError("")} />}
    <Tabs items={tabs} defaultActiveKey="clients" />

    <Modal className="ib-client-modal" width={1180} open={clientModal.open} title={clientModal.client ? "Изменение клиента и доступов" : "Новый клиент интернет-банка"} okText="Сохранить" cancelText="Отмена" onOk={submitClient} onCancel={() => setClientModal({ open: false, client: null })} destroyOnHidden forceRender>
      <Form form={clientForm} layout="vertical" requiredMark="optional">
        <Card className="ib-form-section" title="Картотека клиента" bordered>
          <Row gutter={16}>
            <Col xs={24} md={10}><Form.Item name="absClientCode" label="Код клиента в АБС" rules={[{ required: true, message: "Введите код клиента" }]}><Input placeholder="5400.001610" disabled={Boolean(clientModal.client)} /></Form.Item></Col>
            <Col xs={24} md={10}><Form.Item name="displayName" label="Название клиента"><Input placeholder="Краткое название организации или клиента" /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item name="isActive" label="Доступ активен" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
        </Card>
        <Form.List name="people">
          {(fields, { add, remove }) => <>
            <div className="ib-repeatable-heading"><div><Title level={4}>Пользователи</Title><Text type="secondary">Для одной картотеки можно назначить несколько физических лиц</Text></div><Button icon={<Plus size={16} />} onClick={() => add(emptyInternetBankingPerson())}>Добавить пользователя</Button></div>
            {fields.map((field, index) => <Card className="ib-person-card" key={field.key} title={`Пользователь ${index + 1}`} extra={fields.length > 1 && <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => remove(field.name)}>Удалить</Button>} bordered>
              <Form.Item name={[field.name, "personId"]} hidden><Input /></Form.Item>
              <Row gutter={16}>
                <Col xs={24} lg={12}><Form.Item name={[field.name, "fullName"]} label="ФИО" rules={[{ required: true, message: "Введите ФИО" }]}><Input placeholder="Фамилия Имя Отчество" /></Form.Item></Col>
                <Col xs={24} lg={8}><Form.Item name={[field.name, "inn"]} label="ИНН" rules={[{ required: true, message: "Введите ИНН" }]}><Input placeholder="ИНН пользователя" /></Form.Item></Col>
                <Col xs={24} lg={4}><Form.Item name={[field.name, "isActive"]} label={<Space size={4}><Ban size={14} />Не заблокирован</Space>} valuePropName="checked"><Switch /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24}><Form.Item name={[field.name, "phones"]} label="Номера телефонов" rules={[{ required: true, message: "Добавьте хотя бы один телефон" }]}><Select mode="tags" tokenSeparators={[",", " "]} placeholder="+992900001122" notFoundContent={null} /></Form.Item></Col>
                <Col xs={24}><Form.Item name={[field.name, "allowedIPs"]} label="Разрешенный IP" extra="Если поле пустое — вход разрешен с любого IP. Можно указать несколько IP или подсеть CIDR."><Select mode="tags" tokenSeparators={[",", " ", ";"]} placeholder="10.64.1.9, 10.65.30.22 или 10.64.1.0/24" notFoundContent={null} /></Form.Item></Col>
                <Col xs={24} lg={12}><Form.Item name={[field.name, "roleCodes"]} label="Роли (мультивыбор)"><Select mode="multiple" showSearch optionFilterProp="label" options={roleOptions} placeholder="Выберите одну или несколько ролей" /></Form.Item></Col>
                <Col xs={24} lg={12}><Form.Item name={[field.name, "directArmCodes"]} label="Дополнительные АРМ (мультивыбор)"><Select mode="multiple" showSearch optionFilterProp="label" options={armOptions} placeholder="Назначьте точечные права" /></Form.Item></Col>
              </Row>
            </Card>)}
          </>}
        </Form.List>
      </Form>
    </Modal>

    <Modal open={roleModal.open} title={roleModal.role ? "Изменение роли" : "Новая роль"} okText="Сохранить" cancelText="Отмена" onOk={submitRole} onCancel={() => setRoleModal({ open: false, role: null })} destroyOnHidden forceRender>
      <Form form={roleForm} layout="vertical">
        <Form.Item name="code" label="Код роли" rules={[{ required: true }]}><Input disabled={Boolean(roleModal.role)} placeholder="custom_role" /></Form.Item>
        <Form.Item name="name" label="Название" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="Описание"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="armCodes" label="АРМ роли" rules={[{ required: true, message: "Выберите хотя бы один АРМ" }]}><Select mode="multiple" showSearch optionFilterProp="label" options={armOptions} /></Form.Item>
        <Form.Item name="isActive" label="Активна" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </Modal>

    <Modal open={armModal.open} title={armModal.arm ? "Изменение АРМ" : "Новый АРМ"} okText="Сохранить" cancelText="Отмена" onOk={submitARM} onCancel={() => setARMModal({ open: false, arm: null })} destroyOnHidden forceRender>
      <Form form={armForm} layout="vertical">
        <Form.Item name="code" label="Код АРМ" rules={[{ required: true }]}><Input disabled={Boolean(armModal.arm)} placeholder="cards.custom.action" /></Form.Item>
        <Form.Item name="name" label="Название" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="Описание"><Input.TextArea rows={3} /></Form.Item>
        <Row gutter={16}><Col span={14}><Form.Item name="group" label="Группа" rules={[{ required: true }]}><Input placeholder="cards" /></Form.Item></Col><Col span={10}><Form.Item name="sortOrder" label="Порядок"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col></Row>
        <Form.Item name="isActive" label="Активен" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </Modal>
  </div>;
}
