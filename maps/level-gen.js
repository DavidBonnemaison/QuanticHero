const fs = require('fs');
const { random, flatten, range, sample } = require('lodash');

const level = 4;

const params = {
  world: {
    width: 400 * level,
    height: 250 * level
  }
};

class Matrix {
  constructor({ rows, cols }) {
    this.rows = rows;
    this.cols = cols;
    this.rowSpacing = 3;
    this.colSpacing = 1;
    this.cells = range(rows).map(row => range(cols).map(col => ' '));
    this.platforms = [];
    this.reachable = {
      top: 5,
      side: 10,
      bottom: 20
    };
    this.defaults = {
      width: 20,
      height: 2
    };
  }

  getCoordinates() {
    return this.platforms.map(({ x, y, width, height }) => {
      return {
        x: x * 10,
        y: y * 10,
        width: width * 10,
        height: height * 10
      };
    });
  }

  setCell({ row, col, content }) {
    this.cells[row][col] = content;
  }

  insertPlatform({ x = 0, y = 0, width = 8, height = 1 }) {
    range(width).forEach(w =>
      range(height).forEach(h => this.setCell({ row: y + h, col: x + w, content: '_' }))
    );
    this.platforms.push({ x, y, width, height });
  }

  insertIfAvailable({ x, y, width, height }) {
    if (x + width > this.cols || y + height > this.rows) {
      return;
    }
    const available =
      flatten(
        range(width + 2 * this.colSpacing).map(w =>
          range(height + 2 * this.rowSpacing).map(h => {
            let res = false;
            let err = false;
            try {
              res = this.cells[y + h - this.colSpacing][x + w - this.rowSpacing] === ' ';
            } catch (e) {
              err = true;
            }
            return err ? false : res;
          })
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
    const x = sample([
      // random(platform.x - this.reachable.side, platform.x - this.reachable.side / 2),
      // random(
      //   platform.x + platform.width + this.reachable.side / 2,
      //   platform.x + platform.width + this.reachable.side
      // )
      platform.x + 5
    ]);
    const y = sample([
      // random(platform.y - this.reachable.top, platform.y - this.reachable.top),
      // random(platform.y + this.reachable.bottom, platform.y + this.reachable.bottom)
      platform.y - 4
    ]);
    const width = this.defaults.width;
    const height = this.defaults.height;
    this.insertIfAvailable({
      x,
      y,
      width,
      height
    });
  }
}

const matrix = new Matrix({ rows: params.world.height / 10, cols: params.world.width / 10 });
matrix.insertPlatform({
  x: matrix.cols / 4,
  y: matrix.rows - 2,
  width: matrix.cols / 2,
  height: 2
});

matrix.insertPlatform({
  x: matrix.cols / 4 + 5,
  y: matrix.rows - 2 - 5,
  width: 20,
  height: 2
});

range(10000).forEach(() => {
  matrix.nextPlatform();
});

fs.writeFileSync('maps/gen.json', JSON.stringify(matrix.getCoordinates()));
