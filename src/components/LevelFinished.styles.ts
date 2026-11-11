import styled from 'styled-components';

export const Container = styled.div`
  color: white;
  text-align: center;
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 30px 16px calc(24px + env(safe-area-inset-bottom, 20px));
  box-sizing: border-box;
`;

export const Done = styled.h1`
  font-size: 56px;
  font-weight: normal;
  margin: 0 0 20px;
  letter-spacing: 0.05em;
`;

export const ScoresWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 320px;
  margin-bottom: 24px;
`;

export const ScoreBox = styled.div`
  border: 2px solid #444;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px 16px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const ScoreType = styled.span`
  font-size: 20px;
  color: #888;
  margin-bottom: 4px;
  letter-spacing: 0.05em;
`;

export const ScoreValue = styled.span`
  font-size: 36px;
  color: #fff;
  font-family: 'VT323', monospace;
  letter-spacing: 0.05em;
`;

export const BestBadge = styled.div`
  background-color: #b71c1c;
  color: white;
  padding: 2px 8px;
  font-size: 18px;
  margin-top: 6px;
  border-radius: 2px;
`;

export const Molecule = styled.div<{ bgColor: string; color: string }>`
  background-color: ${p => p.bgColor};
  color: ${p => p.color};
  text-align: center;
  width: 140px;
  height: 140px;
  line-height: 140px;
  font-size: 70px;
  margin: 0 auto 24px;
  position: relative;
  border-radius: 4px;

  > span:first-child {
    position: absolute;
    font-size: 26px;
    top: 8px;
    left: 8px;
    line-height: 1;
  }
`;

export const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  width: 100%;
  max-width: 360px;
`;

export const Button = styled.button<{ buttonType?: 'next' | 'retry' | 'menu' }>`
  flex: 1;
  padding: 12px 8px;
  font-size: 24px;
  font-family: inherit;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #fff;
  background-color: ${p =>
    p.buttonType === 'next' ? '#b71c1c' : p.buttonType === 'retry' ? '#b1810f' : '#444'};
  transition: opacity 0.15s, transform 0.1s;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.96);
  }
`;
