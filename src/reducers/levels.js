const initialState = null;

export default (state = initialState, action) => {
  const { type, payload } = action;
  switch (type) {
    case 'UPDATE_LEVEL':
      if (payload.type === 'platform') {
        return {
          ...state,
          [`level${payload.level}`]: {
            ...state[`level${payload.level}`],
            platforms: state[`level${payload.level}`].platforms.map((p, i) => {
              return i === Number(payload.n) ? { ...p, [payload.prop]: Number(payload.value) } : p;
            })
          }
        };
      }
      return { ...state };
    case 'UPDATE_ALL_LEVELS':
      return payload.data;
    default:
      return state;
  }
};
