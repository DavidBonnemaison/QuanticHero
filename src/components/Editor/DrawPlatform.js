import React from 'react';
import PropTypes from 'prop-types';
import { PlatformNumber } from './Editor.style';
import { DragSource } from 'react-dnd';
import { round } from 'lodash';

export const cardSource = {
  beginDrag(props) {
    return props;
  },
  endDrag(props, monitor, component) {
    if (!monitor.didDrop()) {
      return;
    }

    const { onDrop, i, scale } = props;
    const { diff } = monitor.getDropResult();
    const x = round(props.x + diff.x / scale, -1);
    const y = round(props.y + diff.y / scale, -1);
    onDrop({
      n: i,
      x,
      y
    });
  }
};

export const collect = (connect, monitor) => ({ connectDragSource: connect.dragSource() });

const DrawPlatform = ({
  x,
  y,
  width,
  height,
  scale,
  color,
  i,
  antiHue,
  connectDragSource,
  onDrop
}) => {
  return connectDragSource(
    <div
      scale={scale}
      style={{
        left: `${x * scale}px`,
        top: `${y * scale}px`,
        height: `${height * scale}px`,
        width: `${width * scale}px`,
        backgroundColor: color,
        color: antiHue,
        position: 'absolute',
        textAlign: 'center'
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
  connectDragSource: PropTypes.func.isRequired
};

export default DragSource('DrawPlatform', cardSource, collect)(DrawPlatform);
