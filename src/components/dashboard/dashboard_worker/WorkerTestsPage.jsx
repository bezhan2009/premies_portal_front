import React, { useEffect, useState } from "react";
import "../../../styles/components/TestsPage.scss";
import "../../../styles/components/WorkerTests.scss";
import Spinner from "../../Spinner.jsx";
import { apiClient } from "../../../api/utils/apiClient.js";
import TestTimer from "./TestTimer.jsx";
// import { nav } from "framer-motion/client";

const baseURL = import.meta.env.VITE_BACKEND_URL;

const QUESTION_TYPE_LABELS = {
  single_choice: "Одиночный выбор",
  multiple_choice: "Множественный выбор",
  text: "Текстовый ответ",
};

export default function WorkerTestsPage() {
  const [allowed, setAllowed] = useState(null);
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState(0);
  const [timeLimit, setTimeLimit] = useState(null);

  useEffect(() => {
    checkAllowed();
  }, []);

  const checkAllowed = () => {
    const token = localStorage.getItem("access_token");

    fetch(`${baseURL}/tests/answers/allow`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 200) {
          setAllowed(true);
        } else {
          setAllowed(false);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        setAllowed(false);
        setLoading(false);
      });
  };

  const getTests = async () => {
    // .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
    setLoading(true);
    try {
      const res = await apiClient(`/worker/tests`);
      setTest(res.data);
      const initial = {};
      res.data.Questions.forEach((q) => {
        initial[q.ID] = {
          test_id: res.data.ID,
          question_id: q.ID,
          type: q.type,
          text_answer: "",
          SelectedOptions: [],
        };
      });
      setTimeLimit(res.data.time_limit);
      setAnswers(initial);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить тесты");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, payload) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...payload,
      },
    }));
  };

  const isAllAnswered = (test) => {
    return test.Questions.every((q) => {
      const a = answers[q.ID];
      if (!a) return false;
      if (q.type === "text") {
        return a.text_answer?.trim() !== "";
      }
      if (q.type === "single_choice") {
        return a.SelectedOptions.length === 1;
      }
      if (q.type === "multiple_choice") {
        return a.SelectedOptions.length > 0;
      }
      return false;
    });
  };

  const handleSubmit = (test) => {
    const token = localStorage.getItem("access_token");

    const payload = test.Questions.map((q) => answers[q.ID]);

    fetch(`${baseURL}/tests/answers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(() => {
        alert("Ответы успешно отправлены!");
        setAllowed(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Не удалось отправить ответы");
      });
  };

  console.log("tset", test);

  if (loading) {
    return (
      <div className="worker-page-loading">
        <div
          style={{
            transform: "scale(2)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "10px",
            width: "auto",
          }}
        >
          <Spinner />
        </div>
      </div>
    );
  }

  if (allowed === false) {
    return (
      <div className="block_info_prems content-page" align="center">
        <div className="worker-page-blocked">
          <h2>Вы уже проходили тест в этом месяце</h2>
          <p>Ответить снова можно через месяц.</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="worker-tests-page content-page">
        <div className="worker-test-card">
          <div className="worker-test-header">
            <h2>Тест</h2>
            <p>
              Тест можно пройти только один раз в месяц. Во время прохождения{" "}
              <br />
              теста запрещено выходить со страницы или обновлять её — в <br />
              противном случае все ответы будут утеряны.
            </p>
          </div>
          <button
            style={{ width: "200px" }}
            className="kb-add-btn"
            onClick={getTests}
            disabled={loading}
          >
            Начаить тест
          </button>
        </div>

        {error && <p className="error-msg">{error}</p>}
      </div>
    );
  } else {
    return (
      <div className="worker-tests-page content-page">
        <div className="worker-test-card">
          <div className="worker-test-header">
            <div>
              <h2>{test.Title}</h2>
              <p>{test.description}</p>
            </div>
            <div>
              <TestTimer onTimeEnd={timeLimit} />
            </div>
          </div>

          <div className="worker-questions">
            <div className="header-worker-questions">
              <h1>
                {question + 1}/{test.Questions.length}
              </h1>
              <div className="btn-test-nav">
                <button
                  className={`btn ${question && "active-btn"}`}
                  onClick={() => {
                    if (question) setQuestion(question - 1);
                  }}
                >
                  Назад
                </button>
                <button
                  className={`btn ${
                    question + 1 < test.Questions.length && "active-btn"
                  }`}
                  onClick={() => {
                    if (question + 1 < test.Questions.length)
                      setQuestion(question + 1);
                  }}
                >
                  Дальше
                </button>
              </div>
            </div>

            <div
              className="worker-question-wrapper"
              style={{ translate: `-${question * 102}% 0` }}
            >
              {test.Questions.map((test, i) => (
                <nav>
                  <div key={i} className="worker-question-card fade-slide">
                    <div className="worker-question-title">{test.text}</div>
                    <div className="worker-question-type">
                      {QUESTION_TYPE_LABELS[test.type]}
                    </div>
                    {test.type === "single_choice" && (
                      <ul className="worker-options-list">
                        {test.Options.map((opt, i) => (
                          <li
                            key={i}
                            className={
                              answers[test.ID]?.SelectedOptions[0]
                                ?.option_id === opt.ID
                                ? "selected"
                                : ""
                            }
                          >
                            <label className="custom-radio">
                              <input
                                type="radio"
                                name={`q_${test.ID}`}
                                checked={
                                  answers[test.ID]?.SelectedOptions[0]
                                    ?.option_id === opt.ID
                                }
                                onChange={() =>
                                  handleAnswer(test.ID, {
                                    SelectedOptions: [{ option_id: opt.ID }],
                                  })
                                }
                              />
                              <span className="radiomark"></span>
                              <span className="radio-text">{opt.text}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}

                    {test.type === "multiple_choice" && (
                      <ul className="worker-options-list">
                        {test.Options.map((opt, i) => {
                          const isChecked = answers[
                            test.ID
                          ]?.SelectedOptions?.some(
                            (o) => o.option_id === opt.ID,
                          );

                          return (
                            <li key={i} className={isChecked ? "selected" : ""}>
                              <label className="custom-checkbox-tests">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    let current =
                                      answers[test.ID]?.SelectedOptions || [];
                                    let newSelected;
                                    if (isChecked) {
                                      newSelected = current.filter(
                                        (o) => o.option_id !== opt.ID,
                                      );
                                    } else {
                                      newSelected = [
                                        ...current,
                                        { option_id: opt.ID },
                                      ];
                                    }
                                    handleAnswer(test.ID, {
                                      SelectedOptions: newSelected,
                                    });
                                  }}
                                />
                                <span className="checkmark"></span>
                                <span className="checkbox-text">
                                  {opt.text}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {test.type === "text" && (
                      <textarea
                        placeholder="Ваш ответ..."
                        value={answers[test.ID]?.text_answer || ""}
                        onChange={(e) =>
                          handleAnswer(test.ID, {
                            text_answer: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                </nav>
              ))}
            </div>
          </div>

          <div className="worker-submit-bar">
            <button
              className="kb-add-btn"
              onClick={() => handleSubmit(test)}
              disabled={!isAllAnswered(test)}
            >
              Отправить ответы
            </button>
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}
      </div>
    );
  }
}
