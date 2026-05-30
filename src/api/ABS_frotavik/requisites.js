const API_URL = import.meta.env.VITE_BACKEND_URL;

export const generateCardRequisites = async (data) => {
  const token = localStorage.getItem("access_token");

  try {
    const response = await fetch(`${API_URL}/automation/requisites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Ошибка при генерации реквизитов: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Реквизиты_${data.cardNumber}.docx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error("Ошибка при запросе генерации реквизитов:", error);
    throw error;
  }
};
