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

export const addPlatform = ({ level }) => ({
  type: 'ADD_PLATFORM',
  payload: { level }
});

export const deletePlatform = ({ level, n }) => ({
  type: 'DELETE_PLATFORM',
  payload: { level, n }
});

export const addParticle = ({ level }) => ({
  type: 'ADD_PARTICLE',
  payload: { level }
});

export const deleteParticle = ({ level, n }) => ({
  type: 'DELETE_PARTICLE',
  payload: { level, n }
});
