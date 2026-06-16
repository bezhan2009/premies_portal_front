import fs from 'fs';
const content = fs.readFileSync('src/components/dashboard/dashboard_operator/processing/Transactions.jsx', 'utf8');

let divCount = 0;
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div[^>]*>/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  if (opens > 0 || closes > 0) {
    divCount += opens - closes;
    console.log(`Line ${i+1}: +${opens} -${closes} => Total ${divCount}`);
  }
}
