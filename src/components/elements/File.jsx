import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

export default function FileUpload({
                                       error,
                                       id,
                                       width = 20,
                                       onChange,
                                       placeholder,
                                       placeholderImage,
                                       value = null,
                                   }) {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (value instanceof File) {
            const objectUrl = URL.createObjectURL(value);
            setPreview(objectUrl);

            return () => URL.revokeObjectURL(objectUrl); // очистка при размонтировании
        } else {
            setPreview(null);
        }
    }, [value]);

    return (
        <label className="file" htmlFor={id}>
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
