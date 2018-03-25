const initialState = null;

const defaultPlatform = {
  x: 100,
  y: 100,
  width: 200,
  height: 20
};

const defaultParticle = {
  x: 100,
  y: 100,
  type: 'duplicate'
};

export default (state = initialState, action) => {
  const { type, payload } = action;
  const levelNumber = payload && payload.level && `level${payload.level}`;

  const updateProperty = ({ property, value }) => ({
    ...state,
    [levelNumber]: {
      ...state[levelNumber],
      [property]: value
    }
  });

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
        case 'width':
          return updateProperty({
            property: 'width',
            value: Number(payload.value)
          });
        case 'height':
          return updateProperty({
            property: 'height',
            value: Number(payload.value)
          });
        case 'hue':
          return updateProperty({
            property: 'hue',
            value: payload.value
          });
        case 'antiHue':
          return updateProperty({
            property: 'antiHue',
            value: payload.value
          });
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
    case 'ADD_PARTICLE': {
      return {
        ...state,
        [levelNumber]: {
          ...state[levelNumber],
          particles: state[levelNumber].particles.concat(defaultParticle)
        }
      };
    }
    case 'DELETE_PLATFORM': {
      return {
        ...state,
        [levelNumber]: {
          ...state[levelNumber],
          platforms: state[levelNumber].platforms.filter((p, i) => i !== Number(payload.n))
        }
      };
    }
    case 'DELETE_PARTICLE': {
      return {
        ...state,
        [levelNumber]: {
          ...state[levelNumber],
          particles: state[levelNumber].particles.filter((p, i) => i !== Number(payload.n))
        }
      };
    }
    case 'UPDATE_ALL_LEVELS':
      return payload.data;
    default:
      return state;
  }
};
