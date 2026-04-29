const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// The glitch format: bg-gray-900 dark:bg-gray-900 dark:bg-white text-gray-900 dark:text-white dark:text-white dark:text-black
content = content.replace(/bg-gray-900 dark:bg-gray-900 dark:bg-white text-gray-900 dark:text-white dark:text-white dark:text-black/g, 'bg-gray-900 dark:bg-white text-white dark:text-gray-900');

// And remove the hardcoded white shadow in light mode
content = content.replace(/shadow-\[0_0_30px_rgba\(255,255,255/g, 'shadow-xl dark:shadow-[0_0_30px_rgba(255,255,255');

fs.writeFileSync(path, content);
console.log('App.tsx final text cleanup');
