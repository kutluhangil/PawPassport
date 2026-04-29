const fs = require('fs');
const files = ['./src/App.tsx', './src/components/UserProfileModal.tsx', './src/components/CropModal.tsx'];

files.forEach(path => {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

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
    console.log(path + ' better contrast');
  }
});
