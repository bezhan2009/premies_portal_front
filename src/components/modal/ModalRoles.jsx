import React, { useEffect, useState } from "react";
import { getRoles } from "../../api/roles/roles";

export default function ModalRoles({ open, data }) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const rolesData = await getRoles();
      setRoles(rolesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!open) {
    return "";
  }
  return <div className="modal-roles">modal-roles</div>;
}
