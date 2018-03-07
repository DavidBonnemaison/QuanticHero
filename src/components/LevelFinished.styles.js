import styled from 'styled-components';

export const Container = styled.div`
  color: white;
  font-size: 20px;
  text-align: center;
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
  margin: 35px 20px;
  position: relative;
`;

export const ScoreType = styled.div`
  position: absolute;
  top: -32px;
  left: 0;
`;

export const Button = styled.div`
  display: inline-block;
  vertical-align: middle;
  position: absolute;
  bottom: 15px;
  width: 38%;
  padding: 10px;
  font-size: 36px;
  left: ${p => (p.type === 'next' ? `52%` : `5%`)};
  background-color: ${p => (p.type === 'next' ? `#b71c1c` : `#888`)};
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
  width: 200px;
  height: 200px;
  line-height: 200px;
  font-size: 100px;
  margin: 10px auto;
  position: relative;

  > span:first-child {
    position: absolute;
    font-size: 40px;
    top: 10px;
    left: 10px;
    line-height: 1;
  }
`;
