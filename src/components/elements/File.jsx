import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";

const PDF_ICON = (
  <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    minHeight: 80,
    background: "rgba(220,53,69,0.08)",
    borderRadius: 8,
    border: "2px dashed #dc3545",
    padding: 8,
  }}>
    <span style={{ fontSize: 36 }}>📄</span>
    <span style={{ fontSize: 12, color: "#dc3545", fontWeight: 700, marginTop: 4 }}>PDF загружен</span>
  </div>
);

export default function FileUpload({
  error,
  errors,
  id,
  width = 20,
  onChange,
  placeholder,
  placeholderImage,
  value,
  edit,
}) {
  const [preview, setPreview] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const location = useLocation();
  const fieldErrors = error || errors;

  useEffect(() => {
    if (typeof value === "string") {
      const normalizedPath = value.replace(/\\/g, "/");
      const isPdfFile = normalizedPath.toLowerCase().endsWith(".pdf");
      setIsPdf(isPdfFile);

      if (isPdfFile) {
        setPreview(null);
        return;
      }

      if (
        normalizedPath.startsWith("http://") ||
        normalizedPath.startsWith("https://") ||
        normalizedPath.startsWith("blob:") ||
        normalizedPath.startsWith("data:") ||
        normalizedPath.startsWith("/")
      ) {
        setPreview(normalizedPath);
        return;
      }

      const backendUrl =
        location.pathname.split("/")[1] === "credit"
          ? import.meta.env.VITE_BACKEND_CREDIT_URL
          : import.meta.env.VITE_BACKEND_APPLICATION_URL;

      const url = `${backendUrl}/${normalizedPath.replace(/^\/+/, "")}`;
      setPreview(url);
    } else {
      if (value instanceof File) {
        if (value.type === "application/pdf" || value.name?.toLowerCase().endsWith(".pdf")) {
          setIsPdf(true);
          setPreview(null);
          return;
        }
        setIsPdf(false);
        const objectUrl = URL.createObjectURL(value);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
      } else {
        setIsPdf(false);
        setPreview(null);
      }
    }
  }, [value, location.pathname]);

  return (
    <label className="file" htmlFor={edit ? "" : id} style={{ position: "relative" }}>
      {isPdf ? PDF_ICON : (
        <img
          src={preview || placeholderImage}
          width={width}
          alt={placeholder || "Upload file"}
        />
      )}
      <input
        id={id}
        type="file"
        placeholder={placeholder}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onChange(file);
          }
        }}
        accept="image/*,.pdf"
        aria-describedby={`${id}-error`}
      />
      {fieldErrors?.[id] && (
        <p id={`${id}-error`} className="error-input">
          {fieldErrors[id]}
        </p>
      )}
    </label>
  );
}

FileUpload.propTypes = {
  error: PropTypes.object,
  errors: PropTypes.object,
  id: PropTypes.string.isRequired,
  width: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  placeholderImage: PropTypes.string.isRequired,
  value: PropTypes.any,
};
