import React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as levels from './../data/levels';

class Explanation extends React.Component {
  render() {
    const { play, game } = this.props;
    const { currentLevel } = game;
    const explanations = levels[`level${currentLevel}`];
    return (
      <div>
        {explanations.map((e, i) => <p key={`exp-${i}`}>{e}</p>)}
        <button onClick={play} />
      </div>
    );
  }
}

const mapStateToProps = ({ game }) => ({ game });
const mapDispatchToProps = dispatch => ({
  play: () => dispatch(push('/game'))
});

export default connect(mapStateToProps, mapDispatchToProps)(Explanation);
