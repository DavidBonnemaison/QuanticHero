const initialState = 'Hello World';
export default (state = initialState, action) => {
  const { type, payload } = action;
  switch (type) {
    case 'TEST_SYNC':
      return payload;
    case 'TEST_ASYNC':
      return payload;
    default:
      return state;
  }
};
