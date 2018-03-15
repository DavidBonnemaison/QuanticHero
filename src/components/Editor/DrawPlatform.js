import React from 'react';
import PropTypes from 'prop-types';

const DrawPlatform = ({ x, y, width, height, scale, color }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x * scale}px`,
      top: `${y * scale}px`,
      height: `${height * scale}px`,
      width: `${width * scale}px`,
      backgroundColor: color
    }}
  />
);

DrawPlatform.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  scale: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired
};

export default DrawPlatform;
