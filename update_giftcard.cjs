const fs = require('fs');
const file = 'src/pages/general/GiftCard.jsx';
let content = fs.readFileSync(file, 'utf8');

const pollSearch = "const filename = `poll_${applicationId}.zip`;\\r\\n            downloadFile(blob, filename);";
const pollReplace = "const filename = `poll_${applicationId}.zip`;\\n            downloadFile(blob, filename);\\n\\n            if (data.inn) {\\n                try {\\n                    const formData = new FormData();\\n                    formData.append('inn', data.inn);\\n                    formData.append('title', 'Сгенерированная анкета');\\n                    formData.append('file', blob, filename);\\n\\n                    await fetch(`${automationUrl}/clients-data-files/upload`, {\\n                        method: 'POST',\\n                        headers: {\\n                            Authorization: `Bearer ${localStorage.getItem('access_token')}`\\n                        },\\n                        body: formData\\n                    });\\n                } catch (err) {\\n                    console.error('Ошибка при сохранении анкеты:', err);\\n                }\\n            }";

const offerSearch = "const filename = `offer_${applicationId}.zip`;\\r\\n            downloadFile(blob, filename);";
const offerReplace = "const filename = `offer_${applicationId}.zip`;\\n            downloadFile(blob, filename);\\n\\n            if (data.inn) {\\n                try {\\n                    const formData = new FormData();\\n                    formData.append('inn', data.inn);\\n                    formData.append('title', 'Сгенерированный офферт');\\n                    formData.append('file', blob, filename);\\n\\n                    await fetch(`${automationUrl}/clients-data-files/upload`, {\\n                        method: 'POST',\\n                        headers: {\\n                            Authorization: `Bearer ${localStorage.getItem('access_token')}`\\n                        },\\n                        body: formData\\n                    });\\n                } catch (err) {\\n                    console.error('Ошибка при сохранении офферта:', err);\\n                }\\n            }";

content = content.replace(pollSearch, pollReplace);
content = content.replace(pollSearch.replace(/\\r\\n/g, "\\n"), pollReplace);

content = content.replace(offerSearch, offerReplace);
content = content.replace(offerSearch.replace(/\\r\\n/g, "\\n"), offerReplace);

fs.writeFileSync(file, content);
console.log('Replaced successfully');
