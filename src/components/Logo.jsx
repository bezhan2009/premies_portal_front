import React from 'react';
import logo from '../assets/active_logo.png';
import '../styles/components/Logo.scss'

const LogoImageComponent = () => {
  return <img className='logo-image' src={logo} alt="Логотип" />;
};

export default LogoImageComponent;
