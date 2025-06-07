import React from 'react';
import logout from '../../assets/logout.png';

const LogoutImageComponent = ({ width, height }) => {
  return (
    <img
      src={logout}
      alt="Выход"
      style={{ width: width, height: height }}
    />
  );
};

export default LogoutImageComponent;
