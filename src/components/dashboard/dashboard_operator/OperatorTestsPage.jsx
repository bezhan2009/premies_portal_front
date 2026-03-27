import React, { useEffect, useState } from "react";
import Select from "../../elements/Select";
import "../../../styles/components/TestsPage.scss";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/KnowledgeBase.scss";
import Spinner from "../../Spinner.jsx";
import { Viewer, Worker } from "@react-pdf-viewer/core";

const baseURL = import.meta.env.VITE_BACKEND_URL;

// Маппинг типа вопроса к человеко-понятному тексту
const QUESTION_TYPE_LABELS = {
  single_choice: "Одиночный выбор",
  multiple_choice: "Множественный выбор",
  text: "Текстовый ответ",
};

export default function OperatorTestsPage() {
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [testDetail, setTestDetail] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [answers, setAnswers] = useState([]);

  const [modal, setModal] = useState({
    open: false,
    entity: "",
    mode: "",
    data: null,
  });

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = () => {
    const token = localStorage.getItem("access_token");
    fetch(`${baseURL}/tests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setTests)
      .catch(console.error);
  };

  const fetchTestDetail = (id) => {
    const token = localStorage.getItem("access_token");
    fetch(`${baseURL}/tests/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setTestDetail)
      .catch(console.error);
  };

  const fetchAnswers = (testId) => {
    const token = localStorage.getItem("access_token");
    fetch(`${baseURL}/tests/answers/${testId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setAnswers)
      .catch(console.error);
  };

  const openModal = (entity, mode, data = null) => {
    setModal({ open: true, entity, mode, data });
  };

  const closeModal = () => {
    setModal({ open: false, entity: "", mode: "", data: null });
  };

  const handleSave = (entity, mode, payload, id = null) => {
    const token = localStorage.getItem("access_token");
    let method, url;

    if (entity === "test") {
      method = mode === "create" ? "POST" : "PATCH";
      url = mode === "create" ? `${baseURL}/tests` : `${baseURL}/tests/${id}`;
    } else if (entity === "question") {
      method = mode === "create" ? "POST" : "PATCH";
      url =
        mode === "create"
          ? `${baseURL}/tests/questions/${payload.test_id}`
          : `${baseURL}/tests/questions/${id}`;
    } else if (entity === "option") {
      method = mode === "create" ? "POST" : "PATCH";
      url =
        mode === "create"
          ? `${baseURL}/tests/questions/options/${payload.question_id}`
          : `${baseURL}/tests/questions/options/${id}`;
    }

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(() => {
        closeModal();
        if (entity === "test") fetchTests();
        else if (selectedTestId) fetchTestDetail(selectedTestId);
      })
      .catch(console.error);
  };

  const handleDelete = (entity, id) => {
    if (!window.confirm("Удалить элемент?")) return;

    const token = localStorage.getItem("access_token");
    let url;
    if (entity === "test") url = `${baseURL}/tests/${id}`;
    if (entity === "question") url = `${baseURL}/tests/questions/${id}`;
    if (entity === "option") url = `${baseURL}/tests/questions/options/${id}`;

    fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) return Promise.reject(r.statusText);
        if (entity === "test") {
          fetchTests();
          setSelectedTestId(null);
          setTestDetail(null);
        } else if (selectedTestId) {
          fetchTestDetail(selectedTestId);
        }
      })
      .catch(console.error);
  };

  return (
    <div className="tests-module content-page">
      <aside className="kb-sidebar">
        <h3>Тесты</h3>
        <button
          className="kb-add-btn"
          onClick={() => openModal("test", "create")}
        >
          + Добавить тест
        </button>
        <ul>
          {tests.map((t) => (
            <li
              key={t.ID}
              className={t.ID === selectedTestId ? "active" : ""}
              onClick={() => {
                setSelectedTestId(t.ID);
                fetchTestDetail(t.ID);
              }}
            >
              {t.Title}
              <span
                className="kb-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal("test", "edit", t);
                }}
              >
                ✎
              </span>
              <span
                className="kb-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete("test", t.ID);
                }}
              >
                🗑
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <section className="kb-content">
        {testDetail ? (
          <div className="kb-detail">
            <h2>{testDetail.Title}</h2>
            <p>{testDetail.description}</p>

            <div className="kb-items">
              {testDetail.Questions?.map((q) => (
                <div key={q.ID} className={`question-card question-${q.type}`}>
                  <h4>{q.text}</h4>
                  <p className="question-type">
                    Тип: {QUESTION_TYPE_LABELS[q.type]}
                  </p>

                  {/* Вывод опций */}
                  {["single_choice", "multiple_choice"].includes(q.type) && (
                    <ul className="options-list">
                      {q.Options?.map((o) => (
                        <li
                          key={o.ID}
                          className={`option-item ${
                            o.is_correct ? "correct" : ""
                          }`}
                        >
                          <label>
                            <input
                              type={
                                q.type === "single_choice"
                                  ? "radio"
                                  : "checkbox"
                              }
                              disabled
                            />{" "}
                            {o.text}
                          </label>
                          <div className="option-actions">
                            <span
                              onClick={() => openModal("option", "edit", o)}
                            >
                              ✎
                            </span>
                            <span onClick={() => handleDelete("option", o.ID)}>
                              🗑
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {q.type === "text" && (
                    <>
                      {q.Options?.[0]?.correct_text && (
                        <p className="correct-text">
                          Правильный ответ:{" "}
                          <strong>{q.Options[0].correct_text}</strong>
                          <span
                            className="kb-action-btn"
                            onClick={() =>
                              openModal("option", "edit", {
                                ...q.Options[0],
                                question_id: q.ID,
                              })
                            }
                          >
                            ✎
                          </span>
                          <span
                            className="kb-action-btn"
                            onClick={() =>
                              handleDelete("option", q.Options[0].ID)
                            }
                          >
                            🗑
                          </span>
                        </p>
                      )}
                      {!q.Options?.length && (
                        <button
                          className="kb-add-btn"
                          onClick={() =>
                            openModal("option", "create", { question_id: q.ID })
                          }
                        >
                          Добавить правильный ответ
                        </button>
                      )}
                    </>
                  )}

                  <div className="kb-doc-actions">
                    <span onClick={() => openModal("question", "edit", q)}>
                      ✎
                    </span>
                    <span onClick={() => handleDelete("question", q.ID)}>
                      🗑
                    </span>
                  </div>

                  {q.type !== "text" && (
                    <button
                      className="kb-add-btn"
                      onClick={() =>
                        openModal("option", "create", { question_id: q.ID })
                      }
                    >
                      Добавить вариант
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              className="kb-add-btn"
              onClick={() =>
                openModal("question", "create", { test_id: testDetail.ID })
              }
            >
              Добавить вопрос
            </button>

            <button
              className="kb-add-btn"
              onClick={() => {
                if (!showAnswers) {
                  fetchAnswers(testDetail.ID);
                }
                setShowAnswers(!showAnswers);
              }}
              style={{ marginTop: "20px" }}
            >
              {showAnswers ? "Свернуть ответы" : "Показать ответы"}
            </button>

            {showAnswers && answers.length > 0 && (
              <div className="kb-answers">
                <h3>Ответы пользователей</h3>
                <div className="answers-grid">
                  {answers.map((a) => {
                    return (
                      <div
                        key={a.ID}
                        className={`answer-card ${
                          a.is_correct_answer
                            ? "correct-answer"
                            : "wrong-answer"
                        }`}
                      >
                        <div className="answer-header">
                          <strong>
                            {a.user?.full_name || "Неизвестный пользователь"}
                          </strong>
                          <span className="answer-type">
                            {QUESTION_TYPE_LABELS[a.type]}
                          </span>
                        </div>

                        <p>
                          <strong>
                            <b>Вопрос:</b>
                          </strong>
                          <b>{a.question?.text || "Нет текста"}</b>
                        </p>

                        {a.type === "single_choice" && (
                          <>
                            <p>
                              <strong>Ответ пользователя:</strong>{" "}
                              {a.text_answer || "Нет ответа"}
                            </p>
                            <p>
                              <strong>Правильный вариант:</strong>{" "}
                              {a.question?.Options?.find(
                                (opt) => opt.is_correct,
                              )?.text || "Нет данных"}
                            </p>
                          </>
                        )}

                        {a.type === "multiple_choice" && (
                          <>
                            <p>
                              <strong>Выбранные варианты:</strong>
                            </p>
                            <ul className="multi-list">
                              {a.multi_answers?.map((opt) => (
                                <li key={opt.ID}>{opt.text}</li>
                              ))}
                            </ul>
                            <p>
                              <strong>Правильные варианты:</strong>
                            </p>
                            <ul className="multi-list">
                              {a.question?.Options?.filter(
                                (opt) => opt.is_correct,
                              )?.map((opt) => (
                                <li key={opt.ID}>{opt.text}</li>
                              ))}
                            </ul>
                          </>
                        )}

                        {a.type === "text" && (
                          <>
                            <p>
                              <strong>Ответ пользователя:</strong>{" "}
                              {a.text_answer || "Нет ответа"}
                            </p>
                            <p>
                              <strong>Правильный ответ:</strong>{" "}
                              {a.question?.Options?.[0]?.correct_text ||
                                "Нет данных"}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>Выберите тест</p>
        )}
      </section>

      {modal.open && (
        <CrudModal modal={modal} onClose={closeModal} onSave={handleSave} />
      )}
    </div>
  );
}

function CrudModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState(modal.data || {});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(modal.data || {});
    setErrors({});
  }, [modal]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    let newErrors = {};
    if (modal.entity === "test") {
      if (!form.Title || !form.Title.trim())
        newErrors.Title = "Название обязательно";
      if (!form.description || !form.description.trim())
        newErrors.description = "Описание обязательно";
    }
    if (modal.entity === "question") {
      if (!form.text || !form.text.trim())
        newErrors.text = "Текст вопроса обязателен";
      if (!form.type || form.type.trim() === "")
        newErrors.type = "Тип вопроса обязателен";
    }
    if (modal.entity === "option") {
      if (!form.text || !form.text.trim())
        newErrors.text = "Текст варианта обязателен";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (modal.entity === "option") {
      form.is_correct = form.is_correct === "true" || form.is_correct === true;
    }
    if (modal.entity === "question") {
      form.time_limit = Number(form.time_limit) * 60 * 1000;
    }
    onSave(
      modal.entity,
      modal.mode,
      form,
      modal.data?.ID || form.question_id || form.test_id,
    );
  };

  return (
    <div className="kb-modal-overlay">
      <div className="kb-modal">
        <h3>
          {modal.mode === "create" ? "Создать" : "Редактировать"}{" "}
          {modal.entity === "question"
            ? "вопрос"
            : modal.entity === "option"
              ? "вариант"
              : "тест"}
        </h3>
        <div className="kb-modal-content">
          {modal.entity === "test" && (
            <>
              <input
                name="Title"
                value={form.Title || ""}
                onChange={handleChange}
                placeholder="Название теста"
              />
              {errors.Title && (
                <span className="error-msg">{errors.Title}</span>
              )}
              <textarea
                name="description"
                value={form.description || ""}
                onChange={handleChange}
                placeholder="Описание"
              />
              {errors.description && (
                <span className="error-msg">{errors.description}</span>
              )}
            </>
          )}
          {modal.entity === "question" && (
            <>
              <input
                name="text"
                value={form.text || ""}
                onChange={handleChange}
                placeholder="Текст вопроса"
              />
              {errors.text && <span className="error-msg">{errors.text}</span>}
              <input
                name="time_limit"
                value={form?.time_limit || ""}
                onChange={handleChange}
                type="number"
                placeholder="Время на ответ (в минутах)"
              />
              {errors.time_limit && (
                <span className="error-msg">{errors.time_limit}</span>
              )}
              <Select
                value={form.type || ""}
                onChange={(val) => handleChange({ target: { name: "type", value: val } })}
                options={[
                  { value: "", label: "Выберите тип вопроса" },
                  { value: "single_choice", label: "Одиночный выбор" },
                  { value: "multiple_choice", label: "Множественный выбор" },
                  { value: "text", label: "Текстовый ответ" },
                ]}
              />
              {errors.type && <span className="error-msg">{errors.type}</span>}

              <input type="hidden" name="test_id" value={form.test_id || ""} />
            </>
          )}
          {modal.entity === "option" && (
            <>
              <input
                name="text"
                value={form.text || ""}
                onChange={handleChange}
                placeholder="Текст варианта"
              />
              {errors.text && <span className="error-msg">{errors.text}</span>}
              <input
                name="correct_text"
                value={form.correct_text || ""}
                onChange={handleChange}
                placeholder="Правильный текст (для text-вопросов)"
              />
              <Select
                value={String(form.is_correct)}
                onChange={(val) => handleChange({ target: { name: "is_correct", value: val } })}
                options={[
                  { value: "false", label: "Не правильный" },
                  { value: "true", label: "Правильный" },
                ]}
              />
              <input
                type="hidden"
                name="question_id"
                value={form.question_id || ""}
              />
            </>
          )}
        </div>
        <div className="kb-modal-actions">
          <button onClick={onClose}>Отмена</button>
          <button onClick={handleSubmit}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}
