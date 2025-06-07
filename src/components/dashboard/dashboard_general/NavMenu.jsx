import React from 'react';

const NavMenu = ({ activeItem, onMenuClick }) => {
  const menuItems = ['Премии', 'Клиенты', 'Меню', 'Платежи', 'Рассылки', 'Еда', 'Другие', 'Маркет'];

  return (
    <nav className="nav-menu">
      {menuItems.map((item) => (
        <div
          key={item}
          className={`nav-menu__item ${activeItem === item ? 'nav-menu__item--active' : ''}`}
          onClick={() => onMenuClick(item)}
        >
          {item}
        </div>
      ))}
    </nav>
  );
};

export default NavMenu;
