import React from 'react';
import logo from '../assets/new_logo.png';

const LogoImageComponent = ({ width, height }) => {
  return (
    <img
      className='logo-image'
      src={logo}
      alt="Логотип"
      style={{ width: width, height: height, background: 'transparent' }}
    />
  );
};

export default LogoImageComponent;
