const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/styles/ABSSearch.scss');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = {
  'var(--bg-surface)': '#ffffff',
  'var(--bg-secondary)': '#f8fafc',
  'var(--bg-color)': '#f1f5f9',
  'var(--border-color)': '#e2e8f0',
  'var(--text-color)': '#0f172a',
  'var(--text-secondary)': '#334155',
  'var(--text-muted)': '#64748b',
  'var(--primary-color)': '#c8102e',
  'var(--primary-hover)': '#a00d24',
  'var(--shadow-sm)': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  'var(--shadow-md)': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  'var(--shadow-lg)': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

for (const [key, value] of Object.entries(replacements)) {
  const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  content = content.replace(regex, value);
}

// Special case for rgba(var(--primary-rgb), opacity)
content = content.replace(/rgba\(var\(--primary-rgb\),\s*([0-9.]+)\)/g, 'rgba(200, 16, 46, $1)');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated ABSSearch.scss to Shadcn light theme variables.');
