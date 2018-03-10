import React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as actions from './../actions/game';
import { Title, Button } from './Menu.styles';
import Molecules from './../components/Molecules';

class Menu extends React.Component {
  handleClick = n => e => this.props.updateCurrentLevel(n);

  componentDidMount() {
    Molecules.start();
  }

  componentWillUnmount() {
    Molecules.end();
  }

  render() {
    console.log('test');
    const newGame = () => {
      this.props.newGame();
      this.props.goTo('/explanation');
    };
    return (
      <div>
        <div id="container" />
        <Title>Quantum Hero</Title>
        <Button onClick={newGame}>New game</Button>
        <Button onClick={() => this.props.goTo('/levels')}>Levels</Button>
      </div>
    );
  }
}

const mapStateToProps = ({ game }) => ({ game });
const mapDispatchToProps = dispatch => ({
  goTo: l => dispatch(push(l)),
  newGame: () => dispatch(actions.updateCurrentLevel(1))
});

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
