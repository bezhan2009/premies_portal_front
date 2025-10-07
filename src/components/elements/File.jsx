import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";

export default function FileUpload({
  error,
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
  const renderFileIcon = (path) => {
    console.log("path", path);

    let backendUrl = "";

    if (path) {
      if (location.pathname.split("/")[1] === "credit") {
        backendUrl = import.meta.env.VITE_BACKEND_CREDIT_URL;
      } else {
        backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
      }
      return `${backendUrl}/${path.replace(/\\/g, "/")}`;
    } else {
      return null;
    }
  };
  console.log("value " + id, value);

  useEffect(() => {
    if (typeof value === "string") {
      const url = renderFileIcon(value);
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
  }, [value]);

  console.log(`location`);

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
      {error?.[id] && (
        <p id={`${id}-error`} className="error-input">
          {error[id]}
        </p>
      )}
    </label>
  );
}

FileUpload.propTypes = {
  error: PropTypes.object,
  id: PropTypes.string.isRequired,
  width: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  placeholderImage: PropTypes.string.isRequired,
  value: PropTypes.any,
};
