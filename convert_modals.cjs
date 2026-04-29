const fs = require('fs');
const files = ['./src/components/UserProfileModal.tsx', './src/components/CropModal.tsx'];

files.forEach(path => {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    content = content.replace(/bg-\[\#121217\]/g, 'bg-white dark:bg-[#121217]');
    content = content.replace(/text-white(\s|'|"|`|\/)/g, 'text-gray-900 dark:text-white$1');
    content = content.replace(/text-black(\s|'|"|`|\/)/g, 'text-white dark:text-black$1');
    content = content.replace(/bg-white(\s|'|"|`|\/)/g, 'bg-gray-900 dark:bg-white$1');
    content = content.replace(/bg-white\/5/g, 'bg-black/5 dark:bg-white/5');
    content = content.replace(/bg-white\/10/g, 'bg-black/10 dark:bg-white/10');
    content = content.replace(/bg-white\/20/g, 'bg-black/20 dark:bg-white/20');
    content = content.replace(/border-white\/10/g, 'border-black/10 dark:border-white/10');
    content = content.replace(/border-white\/20/g, 'border-black/20 dark:border-white/20');
    
    // fix known glitches
    content = content.replace(/text-gray-900 dark:text-black\/(\d+) dark:text-white\/\1/g, 'text-black/$1 dark:text-white/$1');
    content = content.replace(/text-gray-900 dark:text-white\/(\d+)/g, 'text-black/$1 dark:text-white/$1');
    content = content.replace(/bg-gray-900 dark:bg-black\/(\d+) dark:bg-white\/\1/g, 'bg-black/$1 dark:bg-white/$1');
    
    // the contrast values...
    content = content.replace(/text-black\/30/g, 'text-gray-500');
    content = content.replace(/text-black\/50/g, 'text-gray-600');
    content = content.replace(/text-black\/60/g, 'text-gray-600');
    content = content.replace(/text-black\/70/g, 'text-gray-700');
    content = content.replace(/text-black\/80/g, 'text-gray-800');
    content = content.replace(/text-black\/90/g, 'text-gray-900');

    content = content.replace(/dark:text-white\/30/g, 'dark:text-gray-400');
    content = content.replace(/dark:text-white\/50/g, 'dark:text-gray-300');
    content = content.replace(/dark:text-white\/60/g, 'dark:text-gray-300');
    content = content.replace(/dark:text-white\/70/g, 'dark:text-gray-200');
    content = content.replace(/dark:text-white\/80/g, 'dark:text-gray-200');
    content = content.replace(/dark:text-white\/90/g, 'dark:text-gray-100');

    fs.writeFileSync(path, content);
    console.log(path + ' updated for dark mode!');
  }
});
