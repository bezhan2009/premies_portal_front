import axios from 'axios';

/**
 * Generates a DOCX file using a predefined template from the public folder.
 * 
 * @param {string} templatePath - The path to the template in the public folder (e.g., '/templates/credit_report.docx')
 * @param {object} jsonData - The key-value pairs to replace in the template
 * @param {string} outputFileName - The name of the downloaded file
 */
export const generateDocxFromTemplate = async (templatePath, jsonData, outputFileName = 'document.docx') => {
  try {
    // 1. Fetch the template file from the public folder
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Не удалось загрузить шаблон: ${response.statusText}`);
    }
    const blob = await response.blob();
    const file = new File([blob], "template.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append("template", file);
    formData.append("data", JSON.stringify(jsonData));

    // 3. Call backend API
    const apiResponse = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:7575'}/api/docx/generate`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem("token") || localStorage.getItem("access_token")}`
      },
      responseType: 'blob'
    });

    // 4. Download the generated file
    const url = window.URL.createObjectURL(new Blob([apiResponse.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', outputFileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return true;
  } catch (error) {
    console.error("Error in generateDocxFromTemplate:", error);
    throw error;
  }
};
