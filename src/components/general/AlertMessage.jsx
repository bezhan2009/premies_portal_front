import React, { useEffect } from "react";
import { toast } from "react-toastify";

export default function AlertMessage({ message, type = "error", duration = 3000 }) {

    useEffect(() => {
        if (!message) return;

        if (type === "success") {
            toast.success(message, { autoClose: duration });
        } else if (type === "info") {
            toast.info(message, { autoClose: duration });
        } else if (type === "warning") {
            toast.warning(message, { autoClose: duration });
        } else {
            toast.error(message, { autoClose: duration });
        }

    }, [message, type, duration]);

    return null;
}

