import React from 'react';
import PropTypes from 'prop-types';
import { Platform } from './Editor.style';

const DrawPlatform = ({ x, y, width, height, scale, color, i, antiHue }) => (
  <Platform
    color={antiHue}
    scale={scale}
    style={{
      left: `${x * scale}px`,
      top: `${y * scale}px`,
      height: `${height * scale}px`,
      width: `${width * scale}px`,
      backgroundColor: color
    }}
  >
    <span>{i}</span>
  </Platform>
);

DrawPlatform.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  i: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  scale: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  antiHue: PropTypes.string.isRequired
};

export default DrawPlatform;
