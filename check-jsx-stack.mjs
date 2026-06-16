import fs from 'fs';
const content = fs.readFileSync('src/components/dashboard/dashboard_operator/processing/Transactions.jsx', 'utf8');

const stack = [];
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = line.match(/<div[^>]*>/g) || [];
  opens.forEach(match => stack.push({ line: i + 1, match }));

  const closes = line.match(/<\/div>/g) || [];
  closes.forEach(() => stack.pop());
}

console.log("Unclosed divs:");
stack.forEach(item => console.log(`Line ${item.line}: ${item.match}`));
