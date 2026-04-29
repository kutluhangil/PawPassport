const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// clean up broken text rules
content = content.replace(/text-gray-900 dark:text-black\/(\d+) dark:text-white\/\1/g, 'text-black/$1 dark:text-white/$1');
content = content.replace(/text-gray-900 dark:text-white\/(\d+)/g, 'text-black/$1 dark:text-white/$1');

// clean up broken bg rules
content = content.replace(/bg-gray-900 dark:bg-black\/(\d+) dark:bg-white\/\1/g, 'bg-black/$1 dark:bg-white/$1');
content = content.replace(/bg-gray-900 dark:bg-white dark:bg-\[\#121217\]/g, 'bg-white dark:bg-[#121217]');

fs.writeFileSync(path, content);
console.log('App.tsx fixed');
