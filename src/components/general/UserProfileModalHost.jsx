import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Descriptions, Modal, Spin, Tag, message } from "antd";
import { MessageCircle, User } from "lucide-react";
import useChatStore from "../../store/useChatStore.js";
import "../../styles/components/UserProfileModalHost.scss";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const absolutePhotoURL = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${backendUrl}${value.startsWith("/") ? "" : "/"}${value}`;
};

export default function UserProfileModalHost() {
  const [target, setTarget] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const openConversation = useChatStore((state) => state.openConversation);

  useEffect(() => {
    const openProfile = (event) => setTarget(event.detail || null);
    window.addEventListener("open-user-profile", openProfile);
    return () => window.removeEventListener("open-user-profile", openProfile);
  }, []);

  useEffect(() => {
    if (!target) return undefined;
    const controller = new AbortController();
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    const load = async () => {
      setLoading(true);
      setProfile(null);
      try {
        let userId = Number(target.userId || 0);
        if (!userId && target.absName) {
          const response = await fetch(`${backendUrl}/users/profile/by-abs-name?abs_name=${encodeURIComponent(target.absName)}`, { headers, signal: controller.signal });
          if (!response.ok) throw new Error("Сотрудник с таким именем в АБС не найден");
          setProfile(await response.json());
          return;
        }
        if (!userId && target.username) {
          const response = await fetch(`${backendUrl}/users/id-by-username?username=${encodeURIComponent(target.username)}`, { headers, signal: controller.signal });
          if (!response.ok) throw new Error("Сотрудник не найден");
          userId = Number((await response.json()).id || 0);
        }
        if (!userId) throw new Error("Не удалось определить сотрудника");

        const response = await fetch(`${backendUrl}/users/profile/${userId}`, { headers, signal: controller.signal });
        if (!response.ok) throw new Error("Не удалось загрузить профиль сотрудника");
        setProfile(await response.json());
      } catch (error) {
        if (error.name !== "AbortError") message.error(error.message || "Ошибка загрузки профиля");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [target]);

  const statusColor = profile?.work_status === "На работе" ? "green" : "default";
  const initials = useMemo(() => String(profile?.full_name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(""), [profile?.full_name]);

  return (
    <Modal
      open={Boolean(target)}
      onCancel={() => setTarget(null)}
      title="Профиль сотрудника"
      footer={null}
      width={620}
      zIndex={2147482000}
      rootClassName="employee-profile-modal"
    >
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spin /></div>
      ) : profile ? (
        <div className="employee-profile-modal__content">
          <div className="employee-profile-modal__hero">
            <Avatar size={88} src={absolutePhotoURL(profile.photo_url)} icon={<User />}>
              {initials}
            </Avatar>
            <div>
              <div className="employee-profile-modal__name">{profile.full_name || "Без ФИО"}</div>
              <div className="employee-profile-modal__position">{profile.position || "Должность не указана"}</div>
              <div className="employee-profile-modal__status"><Tag color={statusColor}>{profile.work_status}</Tag></div>
            </div>
          </div>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ФИО">{profile.full_name || "Не указано"}</Descriptions.Item>
            <Descriptions.Item label="Дата рождения">{profile.birth_date || "Не указана"}</Descriptions.Item>
            <Descriptions.Item label="Внутренний телефон">{profile.internal_phone || "Не указан"}</Descriptions.Item>
            <Descriptions.Item label="Статус">{profile.work_status}</Descriptions.Item>
            <Descriptions.Item label="Семейное положение">{profile.marital_status || "Не указано"}</Descriptions.Item>
            <Descriptions.Item label="Должность">{profile.position || "Не указана"}</Descriptions.Item>
          </Descriptions>
          <div className="employee-profile-modal__actions">
            <Button onClick={() => setTarget(null)}>Закрыть</Button>
            <Button
              type="primary"
              icon={<MessageCircle size={17} />}
              disabled={!Number(profile.id)}
              onClick={() => {
                openConversation({ userId: profile.id, name: profile.full_name, chatType: "direct" });
                setTarget(null);
              }}
            >
              Чат с сотрудником
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>Профиль не найден</div>
      )}
    </Modal>
  );
}
