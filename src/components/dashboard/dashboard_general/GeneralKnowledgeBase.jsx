import React, { useEffect, useState } from "react";
import "../../../styles/components/BlockInfo.scss";
import "../../../styles/components/KnowledgeBase.scss";
import fileLogo from "../../../assets/file_logo.png";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import Input from "../../elements/Input";

const baseURL = import.meta.env.VITE_BACKEND_URL;

export default function GeneralKnowledgeBaseBlockInfo() {
  const [bases, setBases] = useState([]);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [baseData, setBaseData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${baseURL}/knowledge/bases`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then(setBases)
      .catch((err) => console.error("Error fetching bases:", err));
  }, []);

  useEffect(() => {
    if (!selectedBaseId) {
      setBaseData(null);
      return;
    }
    const token = localStorage.getItem("access_token");
    fetch(`${baseURL}/knowledge/bases/${selectedBaseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then(setBaseData)
      .catch((err) => console.error("Error fetching base data:", err));
  }, [selectedBaseId]);

  return (
    <div className="knowledge-module">
      <aside className="kb-sidebar">
        <h3>Базы знаний</h3>
        <ul>
          {bases.map((b) => (
            <li
              key={b.ID}
              className={b.ID === selectedBaseId ? "active" : ""}
              onClick={() => setSelectedBaseId(b.ID)}
            >
              {b.title}
            </li>
          ))}
        </ul>
      </aside>

      <section className="kb-content">
        {baseData ? (
          <KnowledgeBaseDetail data={baseData} />
        ) : (
          <p>Выберите базу знаний</p>
        )}
      </section>
    </div>
  );
}

function KnowledgeBaseDetail({ data }) {
  const [filter, setFilter] = useState("");
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(null);
  const docs =
    data.knowledge.find((k) => k.ID === selectedKnowledgeId)?.knowledge_docs ||
    [];

  console.log("docs", docs);

  return (
    <div className="kb-detail">
      <h2>{data.title}</h2>

      <div className="kb-items">
        {data.knowledge.map((item) => (
          <div
            key={item.ID}
            className={`kb-item ${
              item.ID === selectedKnowledgeId ? "active" : ""
            }`}
            onClick={() => setSelectedKnowledgeId(item.ID)}
          >
            <h4>{item.title}</h4>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
      <div>
        <Input title={"Поиск"} onChange={(e) => setFilter(e)} value={filter} />
      </div>

      <div className="kb-docs-and-viewer">
        <div className="kb-docs">
          <KnowledgeDocsList
            docs={
              filter.trim().length > 0
                ? docs.filter((e) =>
                    e.title.toLowerCase().includes(filter.toLowerCase())
                  )
                : docs
            }
          />
        </div>
      </div>
    </div>
  );
}

function KnowledgeDocsList({ docs }) {
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState(null);

  const handleDownload = async (doc) => {
    try {
      const url = `${baseURL}/${doc.file_path.replace(/\\/g, "/")}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = doc.title || "document.pdf";
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (e) {
      alert(`Не удалось скачать файл: ${e.message}`);
    }
  };

  if (!docs.length) {
    return <p>Документы отсутствуют</p>;
  }

  return (
    <>
      <ul className="kb-docs-list">
        {docs.map((doc) => {
          const url = `${baseURL}/${doc.file_path.replace(/\\/g, "/")}`;
          const isActive = doc.ID === selectedDocId;

          return (
            <li
              key={doc.ID}
              className={`kb-doc-item ${isActive ? "active" : ""}`}
              onClick={() => {
                setSelectedDocId(doc.ID);
                setSelectedDocUrl(url);
              }}
            >
              <img src={fileLogo} width="30px" alt="" />
              <span className="doc-label">{doc.title}</span>

              <span
                className="kb-download-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(doc);
                }}
                style={{ marginLeft: "10px", cursor: "pointer" }}
              >
                ⬇️
              </span>
            </li>
          );
        })}
      </ul>

      <div className="kb-pdf-viewer">
        <PdfViewer fileUrl={selectedDocUrl} />
      </div>
    </>
  );
}

function PdfViewer({ fileUrl }) {
  if (!fileUrl) {
    return <p>Выберите документ для просмотра</p>;
  }

  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
      <div className="pdf-container" style={{ height: "1000px" }}>
        <Viewer
          fileUrl={fileUrl}
          onDocumentLoadFail={(e) => {
            console.error("Ошибка загрузки PDF", e);
            alert(
              "Не удалось загрузить PDF. Возможно, он заблокирован браузером."
            );
          }}
        />
      </div>
    </Worker>
  );
}
