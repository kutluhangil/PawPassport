const fs = require('fs');

const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace standard colors to support light/dark
content = content.replace(/bg-\[\#121217\]/g, 'bg-white dark:bg-[#121217]');
content = content.replace(/text-white(\s|'|"|`|\/)/g, 'text-gray-900 dark:text-white$1');
content = content.replace(/text-black(\s|'|"|`|\/)/g, 'text-white dark:text-black$1');
content = content.replace(/bg-white(\s|'|"|`|\/)/g, 'bg-gray-900 dark:bg-white$1');
content = content.replace(/bg-white\/5/g, 'bg-black/5 dark:bg-white/5');
content = content.replace(/bg-white\/10/g, 'bg-black/10 dark:bg-white/10');
content = content.replace(/bg-white\/20/g, 'bg-black/20 dark:bg-white/20');
content = content.replace(/border-white\/10/g, 'border-black/10 dark:border-white/10');
content = content.replace(/border-white\/20/g, 'border-black/20 dark:border-white/20');
content = content.replace(/text-white\/30/g, 'text-black/30 dark:text-white/30');
content = content.replace(/text-white\/50/g, 'text-black/50 dark:text-white/50');
content = content.replace(/text-white\/60/g, 'text-black/60 dark:text-white/60');
content = content.replace(/text-white\/70/g, 'text-black/70 dark:text-white/70');
content = content.replace(/text-white\/80/g, 'text-black/80 dark:text-white/80');

fs.writeFileSync(path, content);
console.log('App.tsx updated for dark mode!');
