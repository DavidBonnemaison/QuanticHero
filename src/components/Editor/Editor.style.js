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
  position: relative;

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
    border: 1px solid #ddd;
  }
`;

export const DisplayPanel = styled.div`
  position: absolute;
  left: 260px;
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

export const DownloadButton = styled.button`
  padding: 10px;
  position: fixed;
  top: 0;
  left: 360px;
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

export const PlatformNumber = styled.div`
  font-size: ${p => p.scale * 40}px;
  background-color: ${p => p.color};
  color: ${p => p.anti};
  position: absolute;
  top: ${p => p.scale * -10}px;
  width: ${p => p.scale * 40}px;
  margin-left: ${p => p.scale * -20}px;
  text-align: center;
  display: inline-block;
  border-radius: 50%;
`;

export const ItemNumber = styled.div`
  position: absolute;
  right: 0;
  top: -5px;
  background: #666;
  color: white;
  padding: 10px;
`;

export const DeleteItem = styled.div`
  position: absolute;
  right: 0;
  bottom: -5px;
  color: red;
  padding: 10px;
  cursor: pointer;
`;

export const GridItem = styled.div`
  position: absolute;
`;
