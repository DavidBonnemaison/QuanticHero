export const testSync = payload => ({
  type: 'TEST_SYNC',
  payload
});

export const testAsync = payload => {
  return dispatch =>
    setTimeout(() => {
      dispatch({
        type: 'TEST_ASYNC',
        payload
      });
    }, 3000);
};
