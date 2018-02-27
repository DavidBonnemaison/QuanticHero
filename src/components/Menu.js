import React from 'react';
import { connect } from 'react-redux';
import * as actions from './../actions/menu';

class Menu extends React.Component {
  componentDidMount() {
    this.props.testSync('value1');
    this.props.testAsync('value2');
  }

  render() {
    return <div>{this.props.menu}</div>;
  }
}

const mapStateToProps = ({ menu }) => ({ menu });
const mapDispatchToProps = dispatch => ({
  testSync: v => dispatch(actions.testSync(v)),
  testAsync: v => dispatch(actions.testAsync(v))
});

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
