const fs = require('fs');
const content = fs.readFileSync('c:/Users/Admin/Desktop/Manzili/app/(public)/custom/negotiation/[id]/page.jsx', 'utf8');

// Check for t declarations
const tCount = (content.match(/const t = useTranslate\(\);/g) || []).length;
console.log('const t = useTranslate() declarations: ' + tCount);

// Check for t() calls
const tCalls = (content.match(/t\(/g) || []).length;
console.log('t() calls: ' + tCalls);

// Verify each sub-component has the t declaration
const components = ['ChatCard', 'CompactDetails', 'Countdown', 'ColorChip', 'ProposalStatusBadge', 'CtaButton', 'NegotiationPage'];
for (const comp of components) {
  // Find the function declaration
  const funcRegex = new RegExp('function\\s+' + comp + '\\s*\\(');
  const funcMatch = content.match(funcRegex);
  if (funcMatch) {
    // Find the position and check if there's a t declaration after it
    const pos = funcMatch.index;
    const snippet = content.substring(pos, pos + 500);
    const hasT = snippet.includes('const t = useTranslate()');
    console.log(comp + ': ' + (hasT ? 'HAS t' : 'MISSING t'));
  }
}

// Check for any remaining plain English text in JSX
// These are common patterns that should now be wrapped in t()
const suspiciousPatterns = [
  '>Request details<',
  '>Open full view<',
  '>Description<',
  '>Colors<',
  '>Voice memo<',
  '>Delivery deadline<',
  '>Your Proposal<',
  '>Conversation<',
  '>Pending response<',
  '>Declined<',
  '>Blocked<',
  '>Accepted<',
  '>Awaiting buyer<',
  '>Progress uploaded<',
  '>Ready to ship<',
  '>Closed<',
  '>Note to buyer<',
  '>Delivery<',
  '>Quantity<',
  '>Material<',
  '>Price<',
];

let found = 0;
for (const p of suspiciousPatterns) {
  const regex = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (regex.test(content)) {
    console.log('SUSPICIOUS: ' + p);
    found++;
  }
}
if (found === 0) {
  console.log('No suspicious plain text found!');
}
