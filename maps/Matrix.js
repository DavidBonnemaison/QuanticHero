const { random, flatten, range, sample } = require('lodash');

class Matrix {
  constructor({ level, rows, cols }) {
    this.level = level;
    this.rows = rows;
    this.cols = cols;
    this.rowSpacing = 8;
    this.colSpacing = 10;
    this.cells = range(rows).map(row => range(cols).map(col => ' '));
    this.platforms = [];
    this.particles = [];
    this.spikes = [];
    this.bounds = {
      top: null,
      left: null,
      right: null
    };
    this.reachable = {
      top: 10,
      side: 20,
      bottom: 20
    };
    this.defaults = {
      width: 15,
      height: 2
    };
  }

  getCoordinates() {
    return this.platforms.map(({ x, y, width, height, movesTo }) => ({
      x: x * 10,
      y: y * 10,
      width: width * 10,
      height: height * 10,
      movesTo: movesTo && {
        x: movesTo.x * 10,
        y: movesTo.y * 10
      }
    }));
  }

  getSpikes() {
    return this.spikes.map(({ x, y, width, height }) => ({
      x: x * 10,
      y: y * 10,
      width: width * 10,
      height: height * 10
    }));
  }

  getParticles() {
    return this.particles.map(({ x, y }) => ({
      x: 10 * x,
      y: 10 * y
    }));
  }

  setCell({ row, col, content }) {
    this.cells[row][col] = content;
  }

  insertPlatform({ x = 0, y = 0, width = 8, height = 1, movesTo }) {
    range(width).forEach(w =>
      range(height).forEach(h => this.setCell({ row: y + h, col: x + w, content: '_' }))
    );
    this.platforms.push({ x, y, width, height, movesTo });
    this.updateBounds();
  }

  insertSpike({ x, y, width, height }) {
    range(width).forEach(w =>
      range(height).forEach(h => this.setCell({ row: y + h, col: x + w, content: '$' }))
    );
    this.spikes.push({ x, y, width, height });
  }

  updateHighestPlatform() {
    this.bounds.top = this.platforms.reduce((prev, curr) => (prev.y > curr.y ? curr : prev), {
      y: this.rows
    });
  }

  updateLeftestPlatform() {
    this.bounds.left = this.platforms.reduce((prev, curr) => (prev.x > curr.x ? curr : prev), {
      x: this.cols / 2
    });
  }

  updateRightestPlatform() {
    this.bounds.right = this.platforms.reduce((prev, curr) => (prev.x < curr.x ? curr : prev), {
      x: this.cols / 2
    });
  }

  updateBounds() {
    this.updateHighestPlatform();
    this.updateLeftestPlatform();
    this.updateRightestPlatform();
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
              res = this.cells[y + h - this.rowSpacing][x + w - this.colSpacing] === ' ';
            } catch (e) {
              err = true;
            }
            return err ? false : res;
          })
        )
      ).filter(a => a === false).length === 0;
    if (!available) {
      return;
    }
    const moves = sample([true, undefined]);
    let movesTo;
    if (moves) {
      movesTo = this.movesTo({ x, y, width, height });
    }
    this.insertPlatform({ x, y, width, height, movesTo });
  }

  movesTo({ x, y, width, height }) {
    return {
      x: sample([x - this.colSpacing, x + width + this.rowSpacing]),
      y
    };
  }

  randomPlatform({ width, height }) {
    const x = random(1, this.cols - width - this.colSpacing);
    const y = random(1, this.rows - height - this.rowSpacing);
    this.insertIfAvailable({ x, y, width, height });
  }

  nextPlatform() {
    const platform = sample(this.platforms);
    const x = sample([
      platform.x + platform.width + random(5, this.reachable.side),
      platform.x - random(5, this.reachable.side)
    ]);
    const y = random(platform.y - this.reachable.top, platform.y + this.reachable.bottom);
    const width = random(this.defaults.width - 5, this.defaults.width + 5);
    const height = this.defaults.height;
    this.insertIfAvailable({
      x,
      y,
      width,
      height
    });
  }

  insertParticle({ x, y }) {
    let err = true;
    try {
      range(10).forEach(w => {
        range(10).forEach(h => {
          if (this.cells[y + w - 5][x + h - 5] !== ' ') {
            // eslint-disable-next-line
            throw 'err';
          }
        });
      });
    } catch (e) {
      console.log('Retrying particle...');
      return;
    }
    !err &&
      this.setCell({
        row: y,
        col: x,
        content: '*'
      });
    this.particles.push({ x, y });
  }

  nextParticle() {
    if (this.particles.length === this.level) {
      return;
    }
    this.insertParticle({
      x: random(this.bounds.left.x, this.bounds.right.x),
      y: random(this.bounds.top.y, this.rows - 10)
    });
  }
}

module.exports = Matrix;
