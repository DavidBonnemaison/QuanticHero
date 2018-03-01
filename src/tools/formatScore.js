import moment from 'moment';

export default ms =>
  moment(0)
    .set('ms', ms)
    .format('mm:ss:SS');
