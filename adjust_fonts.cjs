const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/className="text-lg md:text-xl font-sans text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light leading-relaxed mb-12"/g, 'className="text-lg md:text-xl font-sans text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-normal leading-relaxed mb-12"');
content = content.replace(/className="font-sans text-gray-600 dark:text-gray-300 leading-relaxed font-light"/g, 'className="font-sans text-gray-600 dark:text-gray-300 leading-relaxed font-normal"');
content = content.replace(/className="font-sans text-lg text-gray-600 dark:text-gray-300 mb-12 font-light max-w-lg leading-relaxed"/g, 'className="font-sans text-lg text-gray-600 dark:text-gray-300 mb-12 font-normal max-w-lg leading-relaxed"');

fs.writeFileSync(path, content);
console.log('App.tsx font-weights adjusted!');
