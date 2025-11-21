import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getV2Token } from "../api/getV2Token";

export default function CheckTokenVersion() {
  const location = useLocation();

  const handleSubmit = async () => {
    try {
      const data = await getV2Token({
        token: localStorage.getItem("access_token"),
        // token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJyb2xlX2lkIjozLCJ1c2VybmFtZSI6ImJlemhhbl9vcGVyYXRvciIsImV4cCI6MTg3ODcwMzU5MSwiaXNzIjoiUHJlbWllc1NlcnZpY2UifQ.XA3TWpw7U3PGwFO_sRCRl2SnheliB1upOeu7Bn8cgBc`,
      });

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      if (data.role_ids) {
        localStorage.setItem("role_ids", String(data.role_ids?.[0]));
      }
    } catch (err) {
      console.log(err);
    }
  };
  useEffect(() => {
    if (location.pathname !== "/login") {
      handleSubmit();
    }
  }, []);
  return "";
}
