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
  return (
    <label className="file" htmlFor={id}>
      <img 
        src={value || placeholderImage} 
        width={width} 
        alt={placeholder || "Upload file"} 
      />
      <input
        id={id}
        type="file"
        placeholder={placeholder}
        onChange={(e) => onChange(URL.createObjectURL(e.target.files[0]))}
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
};