const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// fix repeated class names
content = content.replace(/dark:bg-white dark:bg-gray-900 dark:bg-white dark:bg-\[\#121217\]/g, 'dark:bg-[#121217]');
content = content.replace(/dark:bg-gray-900 dark:bg-white dark:bg-\[\#121217\]/g, 'dark:bg-[#121217]');
content = content.replace(/bg-gray-900 dark:bg-\[\#121217\]/g, 'bg-white dark:bg-[#121217]');

content = content.replace(/dark:bg-gray-900 dark:bg-black\/5 dark:bg-white\/5/g, 'dark:bg-white/5');
content = content.replace(/dark:bg-gray-900 dark:bg-black\/10 dark:bg-white\/10/g, 'dark:bg-white/10');

content = content.replace(/text-gray-900 dark:text-white dark:text-white dark:text-black/g, 'text-gray-900 dark:text-white');
content = content.replace(/dark:text-gray-900 dark:text-white/g, 'dark:text-white');

content = content.replace(/dark:border-black\/10 dark:border-white\/10/g, 'dark:border-white/10');
content = content.replace(/dark:border-black\/20 dark:border-white\/20/g, 'dark:border-white/20');

fs.writeFileSync(path, content);
console.log('App.tsx final text cleanup');
