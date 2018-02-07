const fs = require('fs');
const { random, flatten, range, sample } = require('lodash');

const level = 4;

const params = {
  world: {
    width: 1600,
    height: 1000
  }
};

class Matrix {
  constructor({ rows, cols }) {
    this.rows = rows;
    this.cols = cols;
    this.rowSpacing = 8;
    this.colSpacing = 8;
    this.cells = range(rows).map(row => range(cols).map(col => ' '));
    this.platforms = [];
    this.reachable = {
      top: 8,
      side: 40,
      bottom: 40
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
    if (
      x + width + this.colSpacing > this.cols ||
      y + height + this.rowSpacing > this.rows ||
      x < this.colSpacing ||
      y < this.rowSpacing
    ) {
      return;
    }
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
    const x = random(
      platform.x - this.reachable.side,
      platform.x + platform.width + this.reachable.side
    );
    const y = random(platform.y - this.reachable.bottom, platform.y + this.reachable.top);
    const width = 12;
    const height = 1;
    this.insertIfAvailable({
      x,
      y,
      width,
      height
    });
  }
}

const matrix = new Matrix({ rows: params.world.width / 10, cols: params.world.height / 10 });
matrix.insertPlatform({ x: 40, y: 99, width: 80, height: 1 });
range(10000).forEach(() => {
  matrix.nextPlatform();
});

fs.writeFileSync('maps/gen.json', JSON.stringify(matrix.getCoordinates()));
