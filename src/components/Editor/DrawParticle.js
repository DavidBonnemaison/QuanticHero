import React from 'react';
import PropTypes from 'prop-types';

const colors = {
  duplicate: 'blue',
  speed: 'red',
  lowGravity: 'green',
  antiGravity: 'cyan'
};

const DrawParticle = ({ x, y, scale, type }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x * scale}px`,
      top: `${y * scale}px`,
      height: `${20 * scale}px`,
      width: `${20 * scale}px`,
      backgroundColor: colors[type],
      borderRadius: '50%'
    }}
  />
);

DrawParticle.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  scale: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired
};

export default DrawParticle;
