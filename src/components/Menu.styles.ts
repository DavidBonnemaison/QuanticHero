import styled from 'styled-components';

export const MenuWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
`;

export const Title = styled.h1`
  text-align: center;
  color: #999;
  padding-bottom: 20px;
  font-size: 80px;
  letter-spacing: 0.1em;
  margin: 0 0 40px;
  font-weight: normal;
`;

export const Button = styled.button`
  color: #e2e2e2;
  font-size: 30px;
  font-family: inherit;
  width: 100%;
  max-width: 240px;
  text-align: center;
  padding: 18px 24px;
  margin: 16px auto;
  border: 2px solid #e2e2e2;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s, color 0.15s, transform 0.1s;

  &:hover {
    background-color: #e2e2e2;
    color: #000;
  }

  &:active {
    transform: scale(0.97);
  }
`;
