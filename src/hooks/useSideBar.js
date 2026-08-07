import { useState, useEffect } from "react";

export default function useSidebar(initialState = false) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialState);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return { isSidebarOpen, toggleSidebar };
}
