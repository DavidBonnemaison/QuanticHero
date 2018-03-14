export const update = ({ level, type, n, prop, value }) => ({
  type: 'UPDATE_LEVEL',
  payload: {
    level,
    type,
    n,
    prop,
    value
  }
});

export const setLevels = data => ({
  type: 'UPDATE_ALL_LEVELS',
  payload: { data }
});
