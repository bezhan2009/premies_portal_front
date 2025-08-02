import React, { useEffect } from 'react'

export default function RadioSelect({ options, selectedValue, onChange }) {
    useEffect(() => {
        onChange(selectedValue || options[0]?.name);
    }, [])
  return (
    <div className='radio-select'>
        {options.map(option => (
            <label key={option.id} className="radio-select-item" onChange={() => onChange(option.name)}>
                <input
                    type="radio"
                    name="cardType"
                    value={option.id}
                    checked={selectedValue === option.name}
                    onChange={() => onChange(option.name)}
                />
                <span>{option.name}</span>
            </label>
        ))}
    </div>
  )
}
