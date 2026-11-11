import React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as actions from './../actions/game';
import { setLevels } from './../actions/levels';
import { Title, Button } from './Menu.styles';
import Molecules from './../components/Molecules';
import * as levels from './../data/levels';

class Menu extends React.Component {
  componentDidMount() {
    Molecules.start();
    if (!this.props.levels) this.props.setLevels(levels);
  }

  componentWillUnmount() {
    Molecules.end();
  }

  render() {
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

const mapStateToProps = ({ game, levels }) => ({ game, levels });
const mapDispatchToProps = dispatch => ({
  goTo: l => dispatch(push(l)),
  newGame: () => dispatch(actions.updateCurrentLevel(1)),
  setLevels: data => dispatch(setLevels(data))
});

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
