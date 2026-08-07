import React from 'react';
import logo from '../assets/new_logo.jpg';

const LogoImageComponent = ({ width, height }) => {
  return (
    <img
      className='logo-image'
      src={logo}
      alt="Логотип"
      style={{ width: width, height: height }}
    />
  );
};

export default LogoImageComponent;
