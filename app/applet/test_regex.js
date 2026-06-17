const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /{currentView === 'dashboard' && \([\s\S]*?{\/\* 2\. Interactive Map Screen/;

if (regex.test(code)) {
  fs.writeFileSync('TEST_MATCH.txt', 'MATCHED');
} else {
  fs.writeFileSync('TEST_MATCH.txt', 'NOT MATCHED');
}
