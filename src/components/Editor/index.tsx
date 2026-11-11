import { max, range } from 'lodash';
import type React from 'react';
import { useEffect, useState } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateCurrentLevel } from '../../actions/game';
import * as actions from '../../actions/levels';
import * as levelsData from '../../data/levels';
import type { LevelData, RootState } from '../../types';
import DrawParticle from './DrawParticle';
import DrawPlatform from './DrawPlatform';
import {
  AddButton,
  Container,
  DisplayPanel,
  DownloadButton,
  EditPanel,
  FieldEditor,
  PlayButton,
  ResetButton
} from './Editor.style';
import ParticlesEditor from './ParticleEditor';
import PlatformsEditor from './PlatformsEditor';

const downloader = (filename: string, text: string) => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

interface GridProps {
  h: number;
  v: number;
  scale: number;
}

const Grid: React.FC<GridProps> = ({ h, v, scale }) => {
  const s = 20 * scale;
  return (
    <>
      {range(0, h).map((x) =>
        range(0, v).map((y) => (
          <div
            key={`gridItem-${x}-${y}`}
            style={{
              position: 'absolute',
              left: `${x * s}px`,
              top: `${y * s}px`,
              width: `${s}px`,
              height: `${s}px`,
              pointerEvents: 'none',
              backgroundColor: (x + y) % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
            }}
          />
        ))
      )}
    </>
  );
};

interface EditorComponentProps {
  level: LevelData;
  scale: number;
  grid: { h: number; v: number };
  play: () => void;
  resetLevels: () => void;
  download: () => void;
  currentLevel: number;
  onDropPlatform: (params: { n: number; x: number; y: number }) => void;
}

const EditorComponent: React.FC<EditorComponentProps> = ({
  level,
  scale,
  grid,
  play,
  resetLevels,
  download,
  currentLevel,
  onDropPlatform
}) => {
  const { platforms, particles, hue, antiHue, width, height, player, door } = level;

  const [, dropRef] = useDrop(() => ({
    accept: 'DrawPlatform',
    drop: (_item, monitor) => ({
      diff: monitor.getDifferenceFromInitialOffset()
    })
  }));

  return (
    <div ref={dropRef as unknown as React.Ref<HTMLDivElement>}>
      <DisplayPanel hue={hue} width={width * scale} height={height * scale}>
        <PlayButton onClick={play}>PLAY</PlayButton>
        <ResetButton onClick={resetLevels}>RESET</ResetButton>
        <DownloadButton onClick={download}>DOWNLOAD</DownloadButton>
        {platforms.map((p, i) => (
          <DrawPlatform
            key={`platformDrawing${p.x}-${p.y}-${i}`}
            {...p}
            color={antiHue}
            scale={scale}
            antiHue={hue}
            onDrop={onDropPlatform}
            i={i}
          />
        ))}
        {particles.map((p, i) => (
          <DrawParticle key={`particleDrawing${p.x}-${p.y}-${i}`} {...p} scale={scale} i={i} />
        ))}
        <div
          style={{
            position: 'absolute',
            left: `${player.position.x * scale}px`,
            top: `${player.position.y * scale}px`,
            width: `${20 * scale}px`,
            height: `${80 * scale}px`,
            backgroundColor: 'red'
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${(door.x - 40) * scale}px`,
            top: `${(door.y - 100) * scale}px`,
            width: `${70 * scale}px`,
            height: `${70 * scale}px`,
            backgroundColor: 'rgba(255,255,255,0.5)',
            border: `${5 * scale}px solid black`,
            borderRadius: '50%'
          }}
        />
        <Grid {...grid} scale={scale} />
      </DisplayPanel>
    </div>
  );
};

export const EditorView: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const levels = useSelector((state: RootState) => state.levels);
  const game = useSelector((state: RootState) => state.game);

  const [currentLevelNumber, setCurrentLevelNumber] = useState<number>(game.currentLevel || 1);

  useEffect(() => {
    if (!levels) {
      dispatch(actions.setLevels(levelsData as unknown as Record<string, LevelData>));
    }
    if (game.currentLevel) {
      setCurrentLevelNumber(game.currentLevel);
    }
  }, [levels, game.currentLevel, dispatch]);

  if (!levels) {
    return null;
  }

  const levelKey = `level${currentLevelNumber}`;
  const level = levels[levelKey];
  if (!level) {
    return null;
  }

  const { platforms, particles, hue, antiHue, width, height, player, door } = level;

  const getScale = (dims: { width: number; height: number }) =>
    max([(window.innerWidth - 220) / dims.width, window.innerHeight / dims.height]) || 1;

  const scale = getScale({ width, height });
  const levelsRange = range(1, 11);
  const grid = {
    h: width / 20,
    v: height / 20
  };

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    type: string
  ) => {
    const { value, dataset } = e.target;
    const { n, prop } = dataset;
    dispatch(actions.update({ level: currentLevelNumber, type, n, prop, value }));
  };

  const handleChangeLevel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    dispatch(updateCurrentLevel(val));
    setCurrentLevelNumber(val);
  };

  const handleResetLevels = () => {
    dispatch(actions.setLevels(levelsData as unknown as Record<string, LevelData>));
  };

  const handleDeletePlatform = (e: React.MouseEvent<HTMLDivElement>) => {
    const n = (e.currentTarget as HTMLElement).dataset.n;
    dispatch(actions.deletePlatform({ level: currentLevelNumber, n }));
  };

  const handleDeleteParticle = (e: React.MouseEvent<HTMLDivElement>) => {
    const n = (e.currentTarget as HTMLElement).dataset.n;
    dispatch(actions.deleteParticle({ level: currentLevelNumber, n }));
  };

  const handleDownload = () => {
    const content = JSON.stringify(levels[levelKey], null, 2);
    downloader(`${levelKey}.json`, content);
  };

  const handleDropPlatform = ({ n, x, y }: { n: number; x: number; y: number }) => {
    dispatch(
      actions.update({
        level: currentLevelNumber,
        type: 'platform',
        n,
        prop: 'x',
        value: x
      })
    );
    dispatch(
      actions.update({
        level: currentLevelNumber,
        type: 'platform',
        n,
        prop: 'y',
        value: y
      })
    );
  };

  return (
    <Container>
      <EditPanel>
        <button
          onClick={() => navigate('/')}
          style={{ marginBottom: 12, padding: '4px 8px', cursor: 'pointer' }}
        >
          ← Menu
        </button>
        <h3>Level</h3>
        <select value={currentLevelNumber} onChange={handleChangeLevel}>
          {levelsRange.map((l) => (
            <option key={`level${l}`} value={l}>
              {l} - {levels[`level${l}`]?.atom || `Level ${l}`}
            </option>
          ))}
        </select>
        <FieldEditor>
          <div>
            <label>width:</label>
            <input
              type="number"
              value={width}
              onChange={(e) => handleFieldChange(e, 'width')}
              step="10"
              data-n={0}
              data-prop="width"
            />
          </div>
          <div>
            <label>height:</label>
            <input
              type="number"
              value={height}
              onChange={(e) => handleFieldChange(e, 'height')}
              step="10"
              data-n={0}
              data-prop="height"
            />
          </div>
          <div>
            <label>Hue:</label>
            <input
              type="color"
              value={hue}
              onChange={(e) => handleFieldChange(e, 'hue')}
              data-n={0}
              data-prop="hue"
            />
          </div>
          <div>
            <label>A-hue:</label>
            <input
              type="color"
              value={antiHue}
              onChange={(e) => handleFieldChange(e, 'antiHue')}
              data-n={0}
              data-prop="hue"
            />
          </div>
        </FieldEditor>
        <h3>
          Platforms
          <AddButton onClick={() => dispatch(actions.addPlatform({ level: currentLevelNumber }))}>
            +
          </AddButton>
        </h3>
        {platforms.map((p, i) => (
          <PlatformsEditor
            {...p}
            key={`platform${i}`}
            onChange={(e) => handleFieldChange(e, 'platform')}
            deletePlatform={handleDeletePlatform}
            i={i}
          />
        ))}
        <hr />
        <h3>
          Particles
          <AddButton onClick={() => dispatch(actions.addParticle({ level: currentLevelNumber }))}>
            +
          </AddButton>
        </h3>
        {particles.map((p, i) => (
          <ParticlesEditor
            {...p}
            key={`particles${i}`}
            onChange={(e) => handleFieldChange(e, 'particle')}
            deleteParticle={handleDeleteParticle}
            i={i}
          />
        ))}
        <h3>Player</h3>
        <FieldEditor>
          <div>
            <label>x:</label>
            <input
              type="number"
              value={player.position.x}
              onChange={(e) => handleFieldChange(e, 'player')}
              step="10"
              data-n={0}
              data-prop="x"
            />
          </div>
          <div>
            <label>y:</label>
            <input
              type="number"
              value={player.position.y}
              onChange={(e) => handleFieldChange(e, 'player')}
              step="10"
              data-n={0}
              data-prop="y"
            />
          </div>
        </FieldEditor>
        <h3>Portal</h3>
        <FieldEditor>
          <div>
            <label>x:</label>
            <input
              type="number"
              value={door.x}
              onChange={(e) => handleFieldChange(e, 'portal')}
              step="10"
              data-n={0}
              data-prop="x"
            />
          </div>
          <div>
            <label>y:</label>
            <input
              type="number"
              value={door.y}
              onChange={(e) => handleFieldChange(e, 'portal')}
              step="10"
              data-n={0}
              data-prop="y"
            />
          </div>
        </FieldEditor>
      </EditPanel>
      <EditorComponent
        scale={scale}
        play={() => navigate('/game')}
        grid={grid}
        resetLevels={handleResetLevels}
        download={handleDownload}
        level={level}
        currentLevel={currentLevelNumber}
        onDropPlatform={handleDropPlatform}
      />
    </Container>
  );
};

export default function EditorWithDnd() {
  return (
    <DndProvider backend={HTML5Backend}>
      <EditorView />
    </DndProvider>
  );
}
