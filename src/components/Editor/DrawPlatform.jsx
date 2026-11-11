import React from 'react';
import PropTypes from 'prop-types';
import { PlatformNumber } from './Editor.style';
import { useDrag } from 'react-dnd';
import { round } from 'lodash';

const DrawPlatform = (props) => {
  const {
    x,
    y,
    width,
    height,
    scale,
    color,
    i,
    antiHue,
    onDrop
  } = props;

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: 'DrawPlatform',
    item: () => props,
    end: (item, monitor) => {
      if (!monitor.didDrop()) return;
      const dropResult = monitor.getDropResult();
      if (dropResult && dropResult.diff) {
        const newX = round(props.x + dropResult.diff.x / scale, -1);
        const newY = round(props.y + dropResult.diff.y / scale, -1);
        onDrop({ n: i, x: newX, y: newY });
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [props.x, props.y, props.scale, props.i, onDrop]);

  return (
    <div
      ref={dragRef}
      style={{
        left: `${x * scale}px`,
        top: `${y * scale}px`,
        height: `${height * scale}px`,
        width: `${width * scale}px`,
        backgroundColor: color,
        color: antiHue,
        position: 'absolute',
        textAlign: 'center',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move'
      }}
    >
      <PlatformNumber scale={scale} color={color} anti={antiHue}>
        {i}
      </PlatformNumber>
    </div>
  );
};

DrawPlatform.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  i: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  scale: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  antiHue: PropTypes.string.isRequired,
  onDrop: PropTypes.func.isRequired
};

export default DrawPlatform;
