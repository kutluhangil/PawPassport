const fs = require('fs');
const cssPath = './src/index.css';
let content = fs.readFileSync(cssPath, 'utf8');

const filterCssSearch = `.filter-vintage img { filter: sepia(50%) contrast(150%) saturate(150%); }`;
const filterCssReplace = `.filter-vintage img { filter: sepia(50%) contrast(150%) saturate(150%); }
.filter-retro img { filter: contrast(120%) saturate(80%) sepia(20%) hue-rotate(-15deg); }`;
content = content.replace(filterCssSearch, filterCssReplace);

fs.writeFileSync(cssPath, content);
console.log('index.css Updated!');
