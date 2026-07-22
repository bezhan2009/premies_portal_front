import React from "react";
import { Navigate } from "react-router-dom";

export default function GroupsPage() {
  return <Navigate to="/feedback?tab=groups" replace />;
}
