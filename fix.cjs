const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStart = `            )}

            {/* SEARCH AND CATEGORY FILTER COMPONENT */}             </div>`;
const targetEnd = `            {/* SEARCH AND CATEGORY FILTER COMPONENT */}
            <div id="search-filter-controls-container" className="space-y-3 pt-2">`;

const lines = code.split('\n');
const startIndex = lines.findIndex(line => line.includes('{/* SEARCH AND CATEGORY FILTER COMPONENT */}             </div>')) - 1; // back to `            )}`
let endIndex = lines.findIndex((line, i) => i > startIndex && line.includes('{/* SEARCH AND CATEGORY FILTER COMPONENT */}'));

if (startIndex >= 0 && endIndex > startIndex) {
    const newLines = [
        ...lines.slice(0, startIndex + 1), // keeps `            )}` and ` `
        '',
        '            {/* SEARCH AND CATEGORY FILTER COMPONENT */}', // replace garbage
        ...lines.slice(endIndex + 1)
    ];
    fs.writeFileSync('src/App.tsx', newLines.join('\n'));
    console.log('Fixed garbage block');
} else {
    console.log('Could not find block', startIndex, endIndex);
}
