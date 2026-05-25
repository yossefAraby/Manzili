const fs = require('fs');
const path = 'c:/Users/Admin/Desktop/Manzili/app/(public)/custom/custom-form/page.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Pinterest button title - match with leading indentation
const oldTitle = '              canInspire\n                ? `Search Pinterest for "${trimmedQuery}"`\n                : "Type an item name first to inspire from Pinterest"';
const newTitle = "              canInspire\n                ? t('custom.form.inspireSearch', { query: trimmedQuery })\n                : t('custom.form.inspireDisabled')";

if (content.includes(oldTitle)) {
  content = content.replace(oldTitle, newTitle);
  console.log('OK - Pinterest title replaced');
} else {
  console.log('FAIL - Pinterest title pattern not matched');
  // Debug: show lines around "Search Pinterest"
  const idx = content.indexOf('Search Pinterest for');
  if (idx >= 0) {
    const start = Math.max(0, idx - 80);
    const end = Math.min(content.length, idx + 120);
    console.log('Context around match:', JSON.stringify(content.substring(start, end)));
  }
}

// Fix double quotes to single quotes for consistency
content = content.replace('{t("custom.form.uploadPhotos")}', "{t('custom.form.uploadPhotos')}");
content = content.replace('{t("custom.form.aiSuggestions")}', "{t('custom.form.aiSuggestions')}");

fs.writeFileSync(path, content);
console.log('Written.');
