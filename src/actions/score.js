export const setScore = ({ score, level }) => ({
  type: 'SET_SCORE',
  payload: {
    level,
    score
  }
});
