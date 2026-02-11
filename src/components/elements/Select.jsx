export default function Select({
                                   id,
                                   error,
                                   onChange,
                                   value,
                                   options = [],
                                   className = "",
                                   onEnter,
                                   style,
                                   title,
                               }) {
    return (
        <label className={`select ${className}`} htmlFor={id}>
            {title && title}
            <select
                style={style}
                id={id}
                value={value || ""} // Добавлен fallback
                onChange={(e) => onChange(e.target.value)}
                aria-describedby={`${id}-error`}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        onEnter?.(value);
                    }
                }}
            >
                {options.map((item, i) => (
                    <option value={item.value} key={i}>
                        {item.label}
                    </option>
                ))}
            </select>
            <p className={error?.[id] && "error-input"}>{error?.[id]}</p>
        </label>
    );
}
