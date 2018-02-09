const { range, min } = require('lodash');
const Matrix = require('./Matrix');

const createLevel = level => {
  const params = {
    world: {
      width: 1200 + level * 200,
      height: 500 + level * 200
    }
  };

  const matrix = new Matrix({
    rows: params.world.height / 10,
    cols: params.world.width / 10,
    level
  });

  matrix.insertPlatform({
    x: matrix.cols / 4,
    y: matrix.rows - 2,
    width: matrix.cols / 2,
    height: 2
  });

  matrix.insertPlatform({
    x: matrix.cols / 4 + 5,
    y: matrix.rows - 10,
    width: 15,
    height: 2
  });

  matrix.insertSpike({
    x: 0,
    y: matrix.rows - 1,
    width: matrix.cols / 4,
    height: 1
  });

  matrix.insertSpike({
    x: matrix.cols * 3 / 4,
    y: matrix.rows - 1,
    width: matrix.cols / 4,
    height: 1
  });

  range(level * 50).forEach(() => {
    matrix.nextPlatform();
  });

  range(params.world.width).forEach(() => {
    matrix.nextParticle();
  });

  return {
    platforms: matrix.getCoordinates(),
    particles: matrix.getParticles(),
    spikes: matrix.getSpikes(),
    player: {
      position: {
        x: params.world.width / 2,
        y: params.world.height - 100
      }
    },
    uncertainty: min([level, 20]),
    door: {
      x: 10 * (matrix.bounds.top.x + matrix.bounds.top.width / 2),
      y: 10 * matrix.bounds.top.y
    },
    ...params.world
  };
};

module.exports = createLevel;
