import React, { useState, useEffect, useRef } from 'react';
import '../../../styles/components/LastModified.scss';

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель',
  'Май', 'Июнь', 'Июль', 'Август',
  'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const Filters = ({ initialDate, modificationDesc, onChange }) => {
  const [currentDate, setCurrentDate] = useState(initialDate ? new Date(initialDate) : new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-based
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const wrapperRef = useRef(null);

  // Exit edit mode on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notify parent on change
  useEffect(() => {
    onChange?.({ month: selectedMonth, year: selectedYear });
  }, [selectedMonth, selectedYear]);

  const changeMonth = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  return (
      <div className="last-modified-container">
        {modificationDesc && (
            <div className="modification-desc">
              <span className="modification-desc__label">{modificationDesc}</span>
            </div>
        )}

        <div className="date-filter" ref={wrapperRef}>
          <button
              className="date-filter__arrow date-filter__arrow--left"
              onClick={() => changeMonth(-1)}
          >
            <span className="arrow-icon"></span>
          </button>

          {isEditing ? (
              <div className="date-filter__inputs">
                <select
                    className="date-filter__select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {monthNames.map((name, index) => (
                      <option key={index + 1} value={index + 1}>{name}</option>
                  ))}
                </select>
                <input
                    type="number"
                    className="date-filter__inputs__year-input"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                />
              </div>
          ) : (
              <span
                  className="date-filter__current"
                  onDoubleClick={() => setIsEditing(true)}
              >
            {monthNames[selectedMonth - 1]} {selectedYear}
          </span>
          )}

          <button
              className="date-filter__arrow date-filter__arrow--right"
              onClick={() => changeMonth(1)}
          >
            <span className="arrow-icon"></span>
          </button>
        </div>
      </div>
  );
};

export default Filters;
