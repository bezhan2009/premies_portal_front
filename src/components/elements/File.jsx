import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";

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
  const location = useLocation();
  const fieldErrors = error || errors;

  useEffect(() => {
    if (typeof value === "string") {
      const normalizedPath = value.replace(/\\/g, "/");

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
        const objectUrl = URL.createObjectURL(value);
        setPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl); // очистка при размонтировании
      } else {
        setPreview(null);
      }
    }
  }, [value, location.pathname]);

  return (
    <label className="file" htmlFor={edit ? "" : id}>
      <img
        src={preview || placeholderImage}
        width={width}
        alt={placeholder || "Upload file"}
      />
      <input
        id={id}
        type="file"
        placeholder={placeholder}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onChange(file); // сохраняем именно File
          }
        }}
        accept="image/*"
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
