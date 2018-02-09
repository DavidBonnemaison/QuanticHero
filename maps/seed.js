const fs = require('fs');
const l = Number(process.argv.slice(2)[0]);

const data = require('./../src/data/levels');
const generator = require('./level-gen');
const level = n => ({ ...data[`level${n}`], ...generator(n) });

fs.writeFileSync(`src/data/level${l}.json`, JSON.stringify(level(l)));
