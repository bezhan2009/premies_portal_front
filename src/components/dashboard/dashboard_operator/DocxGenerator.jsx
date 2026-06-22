import React, { useState } from 'react';
import axios from 'axios';
import { docxDictionary } from '../../../utils/docxDictionary';

const DocxGenerator = () => {
  const [file, setFile] = useState(null);
  const [dataKeys, setDataKeys] = useState([{ key: '', value: '' }]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddRow = () => setDataKeys([...dataKeys, { key: '', value: '' }]);
  const handleRemoveRow = (index) => setDataKeys(dataKeys.filter((_, i) => i !== index));

  const handleChange = (index, field, val) => {
    const newKeys = [...dataKeys];
    newKeys[index][field] = val;
    setDataKeys(newKeys);
  };

  const handleGenerate = async () => {
    if (!file) return alert("Пожалуйста, загрузите шаблон (.docx)");
    setIsGenerating(true);

    const formData = new FormData();
    formData.append("template", file);
    
    // Build JSON data
    const dataObj = {};
    dataKeys.forEach(item => {
      if (item.key) {
        dataObj[item.key] = item.value;
      }
    });

    formData.append("data", JSON.stringify(dataObj));

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/docx/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'generated_document.docx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      alert("Ошибка генерации документа");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Генератор документов (DOCX)</h2>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Generator Form */}
        <div className="flex-1 bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Шаблон документа (.docx)</label>
            <input 
              type="file" 
              accept=".docx" 
              onChange={(e) => setFile(e.target.files[0])} 
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Данные для заполнения</label>
            <p className="text-sm text-gray-500 mb-4">Укажите ключи (без фигурных скобок) и значения для замены в документе.</p>
            {dataKeys.map((row, index) => (
              <div key={index} className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  placeholder="Ключ (например, client.firstName)" 
                  value={row.key} 
                  onChange={(e) => handleChange(index, 'key', e.target.value)} 
                  className="flex-1 border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input 
                  type="text" 
                  placeholder="Значение" 
                  value={row.value} 
                  onChange={(e) => handleChange(index, 'value', e.target.value)} 
                  className="flex-1 border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={() => handleRemoveRow(index)} 
                  className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded hover:bg-red-100 transition-colors"
                  title="Удалить строку"
                >
                  ✕
                </button>
              </div>
            ))}
            <button 
              onClick={handleAddRow} 
              className="text-blue-600 font-medium hover:text-blue-800 transition-colors mt-2 flex items-center gap-1"
            >
              <span>+</span> Добавить поле
            </button>
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={isGenerating} 
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-4 disabled:opacity-50 flex justify-center items-center"
          >
            {isGenerating ? "Генерация..." : "Сгенерировать документ"}
          </button>
        </div>

        {/* Dictionary Reference */}
        <div className="w-full md:w-1/3 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Справочник ключей</h3>
          <p className="text-sm text-gray-600 mb-6">
            Используйте эти ключи в вашем шаблоне Word (заключая их в фигурные скобки, например: <code>{'{client.firstName}'}</code>).
          </p>
          <div className="overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            {docxDictionary.map((section, i) => (
              <div key={i} className="mb-6">
                <h4 className="font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">{section.category}</h4>
                <ul className="text-sm space-y-3">
                  {section.keys.map((item, j) => (
                    <li key={j} className="flex flex-col">
                      <code className="bg-gray-200 text-gray-800 px-2 py-1 rounded w-fit mb-1">{item.key}</code>
                      <span className="text-gray-500 text-xs">{item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocxGenerator;
