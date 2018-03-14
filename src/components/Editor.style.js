import styled from 'styled-components';

export const EditPanel = styled.div`
  background: white;
  font-family: sans-serif;
  padding: 20px;
`;

export const FieldEditor = styled.div`
  margin: 10px 0;
  border: 1px solid #ccc;
  width: 140px;
  padding: 10px;

  > div {
    margin: 5px 0;
  }

  label {
    display: inline-block;
    padding-right: 5px;
    width: 50px;
    text-align: right;
  }

  input {
    display: inline-block;
    width: 70px;
    padding: 3px;
  }
`;
