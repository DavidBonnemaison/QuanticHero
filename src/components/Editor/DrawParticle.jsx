import React from 'react';
import PropTypes from 'prop-types';

const colors = {
  duplicate: 'blue',
  speed: 'red',
  lowGravity: 'green',
  antiGravity: 'cyan'
};

const DrawParticle = ({ x, y, scale, type, i }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x * scale}px`,
      top: `${y * scale}px`,
      height: `${20 * scale}px`,
      width: `${20 * scale}px`,
      backgroundColor: colors[type],
      borderRadius: '50%',
      textAlign: 'center',
      fontSize: `${20 * scale}px`,
      color: type === 'antiGravity' ? 'black' : 'white'
    }}
  >
    <span>{i}</span>
  </div>
);

DrawParticle.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  i: PropTypes.number.isRequired,
  scale: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired
};

export default DrawParticle;
