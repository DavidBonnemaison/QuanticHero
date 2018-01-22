const fs = require('fs');
const $ = require('cheerio');
const level = process.argv.slice(2)[0];

const transformToShape = data => {
  const coordinates = data.split(' ');
  const p1 = coordinates[1].split('L');
  const p2 = coordinates[3].split('L');
  const x = Number(coordinates[0].replace('M', ''));
  const y = Number(coordinates[5].replace('Z', ''));
  const width = Number(p1[1]) - Number(p2[1]);
  const height = Number(p2[0]) - Number(p1[0]);
  return { x, y, width, height };
};

const cb = (err, data) => {
  if (err) {
    throw err;
  }
  const svg = $(data)[2];
  const points = svg.children
    .filter(c => c.name === 'defs')[0]
    .children.filter(d => d.attribs !== {})
    .map(d => d.attribs)
    .filter(a => a !== undefined)
    .map(a => a.d);

  const shape = points.map(transformToShape);
  console.log(JSON.stringify(shape));
};

fs.readFile(`./maps/level${level}.svg`, 'utf8', cb);
