import { min } from 'lodash';
const initialState = {};

export default (state = initialState, action) => {
  const { type, payload } = action;
  switch (type) {
    case 'SET_SCORE':
      const currentBest = state[payload.level] ? state[payload.level].best : 0;
      return {
        ...state,
        [payload.level]: {
          last: payload.score,
          best: currentBest === 0 ? payload.score : min([currentBest, payload.score])
        }
      };
    default:
      return state;
  }
};
