import styled from 'styled-components';

export const Container = styled.div`
  width: 220px;
`;

export const EditPanel = styled.div`
  background: white;
  font-family: sans-serif;
  padding: 20px;
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
  position: fixed;
  left: 220px;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: ${p => p.hue};
`;
