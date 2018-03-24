const docElement = document.documentElement;
const width = docElement.clientWidth > 500 ? 500 : docElement.clientWidth;
const height = docElement.clientHeight > 1000 ? 1000 : docElement.clientHeight;

export default {
  width,
  height,
  localStorageName: 'quanticherov1'
};
