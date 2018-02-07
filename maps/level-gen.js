const { random, flatten, range, sample } = require('lodash');

const level = 4;

const params = {
  world: {
    width: 150,
    // width: level * 500,
    height: 150
    // height: level * 1000
  }
};

class Matrix {
  constructor({ rows, cols }) {
    this.rows = rows;
    this.cols = cols;
    this.rowSpacing = 1;
    this.colSpacing = 1;
    this.cells = range(rows).map(row => range(cols).map(col => ' '));
    this.platforms = [];
  }

  setCell({ row, col, content }) {
    this.cells[row][col] = content;
  }

  insertPlatform({ x = 0, y = 0, width = 2, height = 1 }) {
    if (x + width > this.cols || y + height > this.rows || x < 1 || y < 1) {
      return;
    }
    range(width).forEach(w =>
      range(height).forEach(h => this.setCell({ row: y + h, col: x + w, content: '_' }))
    );
    this.platforms.push({ x, y, width, height });
  }

  insertIfAvailable({ x, y, width, height }) {
    const available =
      flatten(
        range(width + 2 * this.rowSpacing).map(w =>
          range(height + 2 * this.colSpacing).map(
            h => this.cells[y + h - this.rowSpacing][x + w - this.colSpacing] === ' '
          )
        )
      ).filter(a => a === false).length === 0;
    if (available) {
      this.insertPlatform({ x, y, width, height });
    }
  }

  randomPlatform({ width, height }) {
    const x = random(1, this.cols - width - this.colSpacing);
    const y = random(1, this.rows - height - this.rowSpacing);
    this.insertIfAvailable({ x, y, width, height });
  }

  nextPlatform() {
    const platform = sample(this.platforms);
    const x = random(platform.x - 4, platform.x + 4);
    const y = random(platform.x - 4, platform.x + 2);
    const width = 3;
    const height = 1;
    this.insertIfAvailable({
      x,
      y,
      width,
      height
    });
    console.log(platform);
  }
}

const matrix = new Matrix({ rows: params.world.width / 10, cols: params.world.height / 10 });
matrix.insertPlatform({ x: 3, y: 13, width: 9, height: 2 });
range(30).forEach(() => {
  matrix.nextPlatform();
});
console.log(matrix.cells);
