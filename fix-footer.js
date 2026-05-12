import fs from 'fs';
const path = 'c:/Users/Admin/Desktop/Manzili/components/Footer.jsx';
let content = fs.readFileSync(path, 'utf8');
// Remove Image import
content = content.replace('import Image from "next/image";\n', '');
// Replace <Image ... /> with <img ... />
content = content.replace(
  '<Image\n        src={assets.logo}\n        alt="logo"\n        width={50}\n        height={50}\n        className="object-contain"\n    />',
  '<img\n        src={assets.logo}\n        alt="logo"\n        width={50}\n        height={50}\n        className="object-contain"\n    />'
);
fs.writeFileSync(path, content);
console.log('Done');