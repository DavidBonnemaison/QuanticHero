import styled from 'styled-components';

export const Container = styled.div`
  color: white;
  font-size: 20px;
  text-align: center;
  position: relative;
  height: 100vh;
  width: 100%;
`;

export const Done = styled.div`
  font-size: 60px;
  padding: 20px;
  margin: 20px;
`;

export const Score = styled.div`
  font-size: 30px;
  color: #aaa;
  border: 2px solid;
  padding: 10px;
  margin: 40px 20px;
  position: relative;
`;

export const ScoreType = styled.div`
  position: absolute;
  top: -32px;
  left: 0;
`;

export const ButtonContainer = styled.div`
  position: absolute;
  bottom: 15px;
  left: 0;
  height: 60px;
  width: 100%;
`;

export const Button = styled.div`
  display: inline-block;
  vertical-align: middle;
  bottom: 15px;
  width: 22%;
  padding: 10px;
  font-size: 30px;
  background-color: ${p =>
    p.type === 'next' ? `#b71c1c` : p.type === 'retry' ? `#b1810f` : `#888`};
  margin-right: 5%;

  &:last-child {
    margin-right: 0;
  }
`;

export const Best = styled.div`
  background-color: #b71c1c;
  padding: 5px;
  position: absolute;
  bottom: -15px;
  right: -15px;
  font-size: 20px;
`;

export const Molecule = styled.div`
  background-color: ${p => p.bgColor};
  color: ${p => p.color};
  text-align: center;
  width: 150px;
  height: 150px;
  line-height: 150px;
  font-size: 75px;
  margin: 10px auto;
  position: relative;

  > span:first-child {
    position: absolute;
    font-size: 30px;
    top: 10px;
    left: 10px;
    line-height: 1;
  }
`;
