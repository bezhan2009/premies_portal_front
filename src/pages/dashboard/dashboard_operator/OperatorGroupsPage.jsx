import React from "react";
import { Navigate } from "react-router-dom";

export default function OperatorGroupsPage() {
  return <Navigate to="/operator/feedback?tab=groups" replace />;
}
