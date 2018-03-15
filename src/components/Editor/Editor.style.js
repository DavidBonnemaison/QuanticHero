import styled from 'styled-components';

export const Container = styled.div``;

export const EditPanel = styled.div`
  background: white;
  font-family: sans-serif;
  padding: 20px;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  overflow: auto;
  width: 220px;
  z-index: 2;
`;

export const FieldEditor = styled.div`
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 2px;
  padding: 10px;

  > div {
    margin: 5px 0;
  }

  label {
    display: inline-block;
    padding-right: 5px;
    width: 50px;
    text-align: right;
    font-size: 12px;
  }

  input {
    display: inline-block;
    width: 70px;
    padding: 3px;
  }
`;

export const DisplayPanel = styled.div`
  position: absolute;
  left: 220px;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  background-color: ${p => p.hue};
  width: ${p => p.width}px;
  height: ${p => p.height}px;
`;

export const PlayButton = styled.button`
  padding: 10px;
  position: fixed;
  top: 0;
  right: 0;
  font-size: 16px;
  z-index: 1;
`;

export const ResetButton = styled.button`
  padding: 10px;
  position: fixed;
  top: 0;
  left: 260px;
  font-size: 16px;
  z-index: 1;
`;

export const AddButton = styled.div`
  cursor: pointer;
  font-size: 20px;
  width: 20px;
  height: 20px;
  border-radius: 20px;
  line-height: 20px;
  text-align: center;
  float: right;
  border: 2px solid black;
`;
