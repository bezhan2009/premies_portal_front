import React, { useState, useEffect } from "react";
import AlertMessage from "../../../components/general/AlertMessage.jsx";
import { Upload, Select, Switch, Button, Input, Form, Card } from "antd";
import { InboxOutlined, SendOutlined } from "@ant-design/icons";

const { Dragger } = Upload;
const { TextArea } = Input;

export default function MailAgentPage() {
  const [form] = Form.useForm();
  const [isHtml, setIsHtml] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });
  const [userOptions, setUserOptions] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const baseUrl = import.meta.env.VITE_BACKEND_URL;
        const response = await fetch(`${baseUrl}/users/emails`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.users)) {
            const options = data.users.map(u => {
              const namePart = u.full_name || u.username || "";
              const label = namePart ? `${namePart} (${u.email})` : u.email;
              return {
                value: u.email,
                label: label,
                searchLabel: `${namePart} ${u.email}`.toLowerCase()
              };
            });
            setUserOptions(options);
          }
        }
      } catch (err) {
        console.error("Failed to fetch users for autocomplete", err);
      }
    };
    fetchUsers();
  }, []);

  const filterOption = (input, option) => {
    if (!option) return false;
    const searchVal = option.searchLabel || (option.label ?? "").toLowerCase();
    return searchVal.includes(input.toLowerCase());
  };

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
  };

  const hideAlert = () => {
    setAlert({ show: false, message: "", type: "success" });
  };

  const handleSend = async (values) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const baseUrl = import.meta.env.VITE_BACKEND_URL;

      const formData = new FormData();
      formData.append("from", values.from || "");
      formData.append("subject", values.subject || "");
      formData.append("body", values.body || "");
      formData.append("is_html", isHtml ? "true" : "false");

      // Handle arrays of emails for to, cc, bcc
      if (values.to && values.to.length) {
        values.to.forEach(email => formData.append("to", email));
      }
      if (values.cc && values.cc.length) {
        values.cc.forEach(email => formData.append("cc", email));
      }
      if (values.bcc && values.bcc.length) {
        values.bcc.forEach(email => formData.append("bcc", email));
      }

      // Append files
      fileList.forEach(file => {
        formData.append("attachments", file.originFileObj);
      });

      const response = await fetch(`${baseUrl}/mail/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Не удалось отправить письмо");
      }

      showAlert("Письмо успешно отправлено!", "success");
      form.resetFields();
      setFileList([]);
      setIsHtml(false);
    } catch (error) {
      showAlert(`Ошибка при отправке: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const draggerProps = {
    multiple: true,
    fileList,
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList((prev) => [...prev, file]);
      return false; // Prevent automatic upload
    },
  };

  return (
    <div className="block_info_prems content-page" align="center">
      {alert.show && (
        <AlertMessage
          message={alert.message}
          type={alert.type}
          onClose={hideAlert}
          duration={5000}
        />
      )}

      <div style={{ maxWidth: "800px", width: "100%", textAlign: "left", padding: "20px 0" }}>
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: 600 }}>
              <SendOutlined style={{ color: "#eb2525" }} />
              <span>Почтовый агент: Отправка почты</span>
            </div>
          }
          bordered={false}
          style={{
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
            background: "var(--bg-surface)",
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSend}
            initialValues={{
              from: "",
              to: [],
              cc: [],
              bcc: [],
              subject: "",
              body: "",
            }}
          >
            <Form.Item
              name="from"
              label="От кого (логин или email)"
              extra="Например: info или info@activbank.tj. По умолчанию используется адрес отправителя."
            >
              <Input placeholder="Отправитель" size="large" />
            </Form.Item>

            <Form.Item
              name="to"
              label="Кому (получатели)"
              rules={[{ required: true, message: "Введите хотя бы одного получателя" }]}
            >
              <Select
                mode="tags"
                style={{ width: "100%" }}
                placeholder="Введите email или логин и нажмите Enter"
                size="large"
                tokenSeparators={[",", " "]}
                options={userOptions}
                filterOption={filterOption}
              />
            </Form.Item>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Form.Item name="cc" label="Копия (Cc)">
                <Select
                  mode="tags"
                  style={{ width: "100%" }}
                  placeholder="Копия"
                  size="large"
                  tokenSeparators={[",", " "]}
                  options={userOptions}
                  filterOption={filterOption}
                />
              </Form.Item>

              <Form.Item name="bcc" label="Скрытая копия (Bcc)">
                <Select
                  mode="tags"
                  style={{ width: "100%" }}
                  placeholder="Скрытая копия"
                  size="large"
                  tokenSeparators={[",", " "]}
                  options={userOptions}
                  filterOption={filterOption}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="subject"
              label="Тема письма"
              rules={[{ required: true, message: "Укажите тему письма" }]}
            >
              <Input placeholder="Тема" size="large" />
            </Form.Item>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontWeight: 500, color: "var(--text-color)" }}>Режим HTML</span>
              <Switch checked={isHtml} onChange={(checked) => setIsHtml(checked)} checkedChildren="ВКЛ" unCheckedChildren="ВЫКЛ" />
            </div>

            <Form.Item
              name="body"
              label="Текст письма"
              rules={[{ required: true, message: "Введите текст письма" }]}
            >
              <TextArea
                rows={10}
                placeholder={isHtml ? "Введите HTML код письма..." : "Введите текст письма..."}
                size="large"
                style={{ fontFamily: isHtml ? "monospace" : "inherit" }}
              />
            </Form.Item>

            <Form.Item label="Вложения">
              <Dragger {...draggerProps} style={{ background: "var(--bg-secondary)", borderRadius: "8px" }}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: "#eb2525" }} />
                </p>
                <p className="ant-upload-text" style={{ color: "var(--text-color)" }}>
                  Нажмите или перетащите файлы для загрузки
                </p>
                <p className="ant-upload-hint" style={{ color: "var(--text-secondary)" }}>
                  Поддерживается загрузка нескольких файлов.
                </p>
              </Dragger>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: "24px" }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                icon={<SendOutlined />}
                size="large"
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: 600,
                  backgroundColor: "#eb2525",
                  borderColor: "#eb2525",
                }}
              >
                {isLoading ? "Отправка..." : "Отправить письмо"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
