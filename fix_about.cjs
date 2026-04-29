const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const closeSearch = `<div className="mt-8">
                <button
                  onClick={() => setShowAboutModal(false)}`;
const closeReplace = `<div className="space-x-4 mt-8 flex">
                <a href="/about" className="flex-1 py-3 bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white font-bold rounded-xl text-center border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  More About Us
                </a>
                <button
                  onClick={() => setShowAboutModal(false)}`;

content = content.replace(closeSearch, closeReplace);
const closeSearch2 = `hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>`;
const closeReplace2 = `hover:opacity-90 transition-opacity flex-1"
                >
                  Close
                </button>
              </div>`;
content = content.replace(closeSearch2, closeReplace2);

fs.writeFileSync(path, content);
console.log('Added about link');
