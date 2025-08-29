import React, { useEffect, useState } from "react";
import "../../../styles/components/TestsPage.scss";
import "../../../styles/components/WorkerTests.scss";
import Spinner from "../../Spinner.jsx";

const baseURL = import.meta.env.VITE_BACKEND_URL;

const QUESTION_TYPE_LABELS = {
  single_choice: "Одиночный выбор",
  multiple_choice: "Множественный выбор",
  text: "Текстовый ответ",
};

export default function WorkerTestsPage() {
  const [allowed, setAllowed] = useState(null);
  const [tests, setTests] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(0);

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
          fetchTests();
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

  const fetchTests = () => {
    const token = localStorage.getItem("access_token");

    fetch(`${baseURL}/worker/tests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => {
        setTests(data);
        const initial = {};
        data.forEach((test) => {
          test.Questions.forEach((q) => {
            initial[q.ID] = {
              test_id: test.ID,
              question_id: q.ID,
              type: q.type,
              text_answer: "",
              SelectedOptions: [],
            };
          });
        });
        setAnswers(initial);
      })
      .catch((err) => {
        console.error(err);
        setError("Не удалось загрузить тесты");
      })
      .finally(() => setLoading(false));
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
      <div className="block_info_prems" align="center">
        <div className="worker-page-blocked">
          <h2>Вы уже проходили тест в этом месяце</h2>
          <p>Ответить снова можно через месяц.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="worker-tests-page">
      {tests.map((test) => (
        <div key={test.ID} className="worker-test-card">
          <div className="worker-test-header">
            <h2>{test.Title}</h2>
            <p>{test.description}</p>
          </div>

          <div className="worker-questions">
            {/* {test.Questions.map((q) => (
                <div key={q.ID} className="worker-question-card">
                                <div className="worker-question-title">{q.text}</div>
                                <div className="worker-question-type">{QUESTION_TYPE_LABELS[q.type]}</div>

                                {q.type === 'single_choice' && (
                                    <ul className="worker-options-list">
                                        {q.Options.map((opt) => (
                                            <li
                                                key={opt.ID}
                                                className={answers[q.ID]?.SelectedOptions[0]?.option_id === opt.ID ? 'selected' : ''}
                                            >
                                                <label className="custom-radio">
                                                    <input
                                                        type="radio"
                                                        name={`q_${q.ID}`}
                                                        checked={answers[q.ID]?.SelectedOptions[0]?.option_id === opt.ID}
                                                        onChange={() =>
                                                            handleAnswer(q.ID, {
                                                                SelectedOptions: [{ option_id: opt.ID }]
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

                                {q.type === 'multiple_choice' && (
                                    <ul className="worker-options-list">
                                        {q.Options.map((opt) => {
                                            const isChecked = answers[q.ID]?.SelectedOptions?.some(
                                                (o) => o.option_id === opt.ID
                                            );

                                            return (
                                                <li
                                                    key={opt.ID}
                                                    className={isChecked ? 'selected' : ''}
                                                >
                                                    <label className="custom-checkbox-tests">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                let current = answers[q.ID]?.SelectedOptions || [];
                                                                let newSelected;
                                                                if (isChecked) {
                                                                    newSelected = current.filter(
                                                                        (o) => o.option_id !== opt.ID
                                                                    );
                                                                } else {
                                                                    newSelected = [...current, { option_id: opt.ID }];
                                                                }
                                                                handleAnswer(q.ID, {
                                                                    SelectedOptions: newSelected
                                                                });
                                                            }}
                                                        />
                                                        <span className="checkmark"></span>
                                                        <span className="checkbox-text">{opt.text}</span>
                                                    </label>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {q.type === 'text' && (
                                    <textarea
                                        placeholder="Ваш ответ..."
                                        value={answers[q.ID]?.text_answer || ''}
                                        onChange={(e) =>
                                            handleAnswer(q.ID, { text_answer: e.target.value })
                                        }
                                    />
                                )}
                </div>
            ))} */}
            <div>
              <h1>
                {question + 1}/{test.Questions.length}
              </h1>
            </div>
            <div
              key={test.Questions[question].ID}
              className="worker-question-card"
            >
              <div className="worker-question-title">
                {test.Questions[question].text}
              </div>
              <div className="worker-question-type">
                {QUESTION_TYPE_LABELS[test.Questions[question].type]}
              </div>

              {test.Questions[question].type === "single_choice" && (
                <ul className="worker-options-list">
                  {test.Questions[question].Options.map((opt) => (
                    <li
                      key={opt.ID}
                      className={
                        answers[test.Questions[question].ID]?.SelectedOptions[0]
                          ?.option_id === opt.ID
                          ? "selected"
                          : ""
                      }
                    >
                      <label className="custom-radio">
                        <input
                          type="radio"
                          name={`q_${test.Questions[question].ID}`}
                          checked={
                            answers[test.Questions[question].ID]
                              ?.SelectedOptions[0]?.option_id === opt.ID
                          }
                          onChange={() =>
                            handleAnswer(test.Questions[question].ID, {
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

              {test.Questions[question].type === "multiple_choice" && (
                <ul className="worker-options-list">
                  {test.Questions[question].Options.map((opt) => {
                    const isChecked = answers[
                      test.Questions[question].ID
                    ]?.SelectedOptions?.some((o) => o.option_id === opt.ID);

                    return (
                      <li key={opt.ID} className={isChecked ? "selected" : ""}>
                        <label className="custom-checkbox-tests">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              let current =
                                answers[test.Questions[question].ID]
                                  ?.SelectedOptions || [];
                              let newSelected;
                              if (isChecked) {
                                newSelected = current.filter(
                                  (o) => o.option_id !== opt.ID
                                );
                              } else {
                                newSelected = [
                                  ...current,
                                  { option_id: opt.ID },
                                ];
                              }
                              handleAnswer(test.Questions[question].ID, {
                                SelectedOptions: newSelected,
                              });
                            }}
                          />
                          <span className="checkmark"></span>
                          <span className="checkbox-text">{opt.text}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              {test.Questions[question].type === "text" && (
                <textarea
                  placeholder="Ваш ответ..."
                  value={
                    answers[test.Questions[question].ID]?.text_answer || ""
                  }
                  onChange={(e) =>
                    handleAnswer(test.Questions[question].ID, {
                      text_answer: e.target.value,
                    })
                  }
                />
              )}
            </div>
            <div className="btn-test-nav">
              <button
                className="btn"
                onClick={() => {
                  if (question) setQuestion(question - 1);
                }}
              >
                Назад
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (question + 1 < test.Questions.length)
                    setQuestion(question + 1);
                }}
              >
                Дальше
              </button>
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
      ))}

      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}
