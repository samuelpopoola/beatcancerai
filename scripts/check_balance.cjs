const fs = require('fs');
const path = process.argv[2];
const start = Number(process.argv[3] || 1);
const end = Number(process.argv[4] || 999999);
if (!path) { console.error('Usage: node check_balance.cjs <file> [startLine] [endLine]'); process.exit(2); }
const txt = fs.readFileSync(path,'utf8').split('\n');
const slice = txt.slice(start-1, end);
let paren=0, brace=0, bracket=0;
for (let i=0;i<slice.length;i++){
  const line = slice[i];
  for (let ch of line){
    if (ch === '(') paren++;
    if (ch === ')') paren--;
    if (ch === '{') brace++;
    if (ch === '}') brace--;
    if (ch === '[') bracket++;
    if (ch === ']') bracket--;
  }
  if (paren<0 || brace<0 || bracket<0) {
    console.log(`Line ${start+i}: negative balance detected -> paren=${paren} brace=${brace} bracket=${bracket}`);
  }
}
console.log(`Range ${start}-${end} -> paren=${paren} brace=${brace} bracket=${bracket}`);
console.log('--- region start ---');
console.log(slice.join('\n'));
console.log('--- region end ---');
