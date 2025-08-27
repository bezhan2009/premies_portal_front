import { useEffect, useState } from "react";
import PropTypes from "prop-types";

export default function FileUpload({
  error,
  id,
  width = 20,
  onChange,
  placeholder,
  placeholderImage,
  value,
  edit
}) {
  const [preview, setPreview] = useState(null);
  const renderFileIcon = (path) => {
    console.log("path", path);

    if (path) {
      const backendUrl = import.meta.env.VITE_BACKEND_APPLICATION_URL;
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

  return (
    <label className="file" htmlFor={edit ? "" : id }>
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
