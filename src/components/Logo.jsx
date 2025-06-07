import React from 'react';
import logo from '../assets/active_logo.png';
import '../styles/components/Logo.scss'

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
