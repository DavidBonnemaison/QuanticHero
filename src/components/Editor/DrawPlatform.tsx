import React from 'react';
import { useDrag } from 'react-dnd';
import { round } from 'lodash';
import { PlatformNumber } from './Editor.style';

interface DrawPlatformProps {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  color: string;
  antiHue: string;
  i: number;
  onDrop: (params: { n: number; x: number; y: number }) => void;
}

export const DrawPlatform: React.FC<DrawPlatformProps> = props => {
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

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: 'DrawPlatform',
      item: () => props,
      end: (_item, monitor) => {
        if (!monitor.didDrop()) return;
        const dropResult = monitor.getDropResult<{ diff?: { x: number; y: number } }>();
        if (dropResult && dropResult.diff) {
          const newX = round(props.x + dropResult.diff.x / scale, -1);
          const newY = round(props.y + dropResult.diff.y / scale, -1);
          onDrop({ n: i, x: newX, y: newY });
        }
      },
      collect: monitor => ({
        isDragging: monitor.isDragging()
      })
    }),
    [props.x, props.y, props.scale, props.i, onDrop]
  );

  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
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

export default DrawPlatform;
