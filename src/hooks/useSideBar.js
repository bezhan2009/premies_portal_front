import { useState, useEffect } from "react";

export default function useSidebar(initialState = true) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialState);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return { isSidebarOpen, toggleSidebar };
}
