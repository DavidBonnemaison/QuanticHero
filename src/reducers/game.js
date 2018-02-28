const initialState = {
  maxLevel: 1,
  currentLevel: 0
};

export default (state = initialState, action) => {
  const { type, payload } = action;
  switch (type) {
    case 'UPDATE_MAX_LEVEL':
      return { ...state, maxLevel: Number(payload) };
    case 'UPDATE_CURRENT_LEVEL':
      return { ...state, currentLevel: Number(payload) };
    default:
      return state;
  }
};
