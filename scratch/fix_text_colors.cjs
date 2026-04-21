const fs = require('fs');
const path = require('path');

const stylesPath = '/home/sk/dev/premies_portal_front/src/styles';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.scss') || file.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Only match color: #XXX or color: #XXXXXX
      const regex = /color\s*:\s*#(222|222222|333|333333|444|444444|555|555555|666|666666|777|777777)\b/g;
      
      const newContent = content.replace(regex, (match, p1) => {
        changed = true;
        
        // Let's decide which token to use based on how dark it is
        if (p1.startsWith('2') || p1.startsWith('3')) {
          return 'color: var(--text-color)';
        } else if (p1.startsWith('4') || p1.startsWith('5')) {
          return 'color: var(--text-secondary)';
        } else {
          return 'color: var(--text-muted)';
        }
      });

      // Also replace hardcoded white backgrounds that might have been missed
      const bgRegex = /background(-color)?\s*:\s*#(ffffff|fff)\b/gi;
      const newContent2 = newContent.replace(bgRegex, (match) => {
         // I'll be careful here, maybe some whites are intended. I'll NOT do global bg replace automatically.
         return match;
      });

      if (changed) {
        fs.writeFileSync(fullPath, newContent2);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(stylesPath);
console.log("Done");
