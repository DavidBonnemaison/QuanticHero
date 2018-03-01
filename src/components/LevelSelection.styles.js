import styled from 'styled-components';

export const Title = styled.h1`
  text-align: center;
  color: white;
  border-bottom: 4px dashed #555;
  padding-bottom: 20px;
  font-size: 30px;
`;

export const MenuItem = styled.div`
  background-color: #333;
  color: white;
  padding: 20px;
  margin: 20px;
  font-size: 20px;
  cursor: pointer;
  ${p =>
    !p.disabled
      ? `
  cursor: pointer;
  `
      : `
  cursor: not-allowed;
  opacity: 0.2;
      `};
`;

export const Atom = styled.div`
  display: inline-block;
  vertical-align: middle;
  background-color: ${p => p.bgColor};
  color: ${p => p.color};
  width: 100px;
  height: 100px;
  line-height: 100px;
  font-size: 70px;
  text-align: center;
  position: relative;
`;

export const AtomicNumber = styled.div`
  position: absolute;
  top: -35px;
  right: 5px;
  font-size: 30px;
`;

export const AtomDescription = styled.div`
  display: inline-block;
  vertical-align: middle;
  width: calc(100% - 120px);
  padding-left: 20px;
`;

export const AtomTitle = styled.h2`
  font-weight: normal;
  font-size: 40px;
  padding: 0;
  margin: 0;
`;

export const AtomScore = styled.div`
  font-size: 36px;
  margin-top: 10px;
  color: #d2d2d2;
`;
