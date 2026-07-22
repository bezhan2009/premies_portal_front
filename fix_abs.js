const fs = require('fs');

const path = 'd:/Work/Activ bank/activ daily/premies_portal_front/src/components/dashboard/dashboard_frontovik/ABSSearch.jsx';
let content = fs.readFileSync(path, 'utf-8');
let lines = content.split('\n');

let newLines = [];
let i = 0;
while (i < lines.length) {
    if (lines[i].includes('<<<<<<< HEAD')) {
        let hasMarker = false;
        // Check if this is the start of the massive block
        // at line 842.
        if (i > 800) {
            console.log('Found HEAD at index', i);
            // skip until =======
            while (i < lines.length && !lines[i].includes('=======')) {
                i++;
            }
            if (i < lines.length && lines[i].includes('=======')) {
                console.log('Found ======= at index', i);
                i++; // skip =======
            }
        } else {
            // maybe there's another marker?
            newLines.push(lines[i]);
            i++;
        }
    } else if (lines[i].includes('>>>>>>> 66c5')) {
        console.log('Found >>>>>>> at index', i);
        // skip this line
        i++;
    } else {
        newLines.push(lines[i]);
        i++;
    }
}

fs.writeFileSync(path, newLines.join('\n'), 'utf-8');
console.log('Fixed ABSSearch.jsx successfully');
