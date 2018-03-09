import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as levels from './../data/levels';
import { Button, Container, Text } from './Explanation.styles';

class Explanation extends React.Component {
  static propTypes = {
    game: PropTypes.object.isRequired,
    play: PropTypes.func.isRequired
  };

  render() {
    const { play, game } = this.props;
    const { currentLevel } = game;
    const { explanations } = levels[`level${currentLevel}`];
    return (
      <Container>
        <Text>{explanations.map((e, i) => <p key={`exp-${i}`}>{e}</p>)}</Text>
        <Button onClick={play}>Got it</Button>
      </Container>
    );
  }
}

const mapStateToProps = ({ game }) => ({ game });
const mapDispatchToProps = dispatch => ({
  play: () => dispatch(push('/game'))
});

export default connect(mapStateToProps, mapDispatchToProps)(Explanation);
