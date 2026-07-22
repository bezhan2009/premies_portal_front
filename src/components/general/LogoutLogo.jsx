import React from 'react';
import { MdLogout } from "react-icons/md";

const LogoutImageComponent = ({ width, height }) => {
  return (
    <MdLogout 
      style={{ width: width, height: height }}
      title="Выйти из системы"
    />
  );
};

export default LogoutImageComponent;
