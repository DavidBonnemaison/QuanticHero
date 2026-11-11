import styled from 'styled-components';

export const Container = styled.div`
  text-align: center;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 30px 20px;
  box-sizing: border-box;
`;

export const Text = styled.div`
  padding: 20px;
  font-size: 36px;
  line-height: 1.4;
  max-width: 440px;

  p {
    margin: 16px 0;
  }
`;

export const Button = styled.button`
  font-size: 40px;
  font-family: inherit;
  padding: 12px 48px;
  background-color: #b71c1c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 32px;
  transition: opacity 0.15s, transform 0.1s;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.96);
  }
`;
