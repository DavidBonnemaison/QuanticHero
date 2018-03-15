const initialState = null;

const defaultPlatform = {
  x: 0,
  y: 0,
  width: 200,
  height: 20
};

export default (state = initialState, action) => {
  const { type, payload } = action;
  const levelNumber = payload && payload.level && `level${payload.level}`;
  switch (type) {
    case 'UPDATE_LEVEL':
      switch (payload.type) {
        case 'platform':
          return {
            ...state,
            [levelNumber]: {
              ...state[levelNumber],
              platforms: state[levelNumber].platforms.map((p, i) => {
                return i === Number(payload.n)
                  ? { ...p, [payload.prop]: Number(payload.value) }
                  : p;
              })
            }
          };
        case 'particle':
          return {
            ...state,
            [levelNumber]: {
              ...state[levelNumber],
              particles: state[levelNumber].particles.map((p, i) => {
                return i === Number(payload.n)
                  ? {
                      ...p,
                      [payload.prop]:
                        payload.prop === 'type' ? payload.value : Number(payload.value)
                    }
                  : p;
              })
            }
          };
        case 'player':
          return {
            ...state,
            [levelNumber]: {
              ...state[levelNumber],
              player: {
                position: {
                  ...state[levelNumber].player.position,
                  [payload.prop]: Number(payload.value)
                }
              }
            }
          };
        case 'portal':
          return {
            ...state,
            [levelNumber]: {
              ...state[levelNumber],
              door: {
                ...state[levelNumber].door,
                [payload.prop]: Number(payload.value)
              }
            }
          };
        default:
          return state;
      }
    case 'ADD_PLATFORM': {
      return {
        ...state,
        [levelNumber]: {
          ...state[levelNumber],
          platforms: state[levelNumber].platforms.concat(defaultPlatform)
        }
      };
    }
    case 'UPDATE_ALL_LEVELS':
      return payload.data;
    default:
      return state;
  }
};
