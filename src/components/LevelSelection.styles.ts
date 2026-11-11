import styled from 'styled-components';

export const SelectionContainer = styled.div`
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 16px 12px calc(30px + env(safe-area-inset-bottom, 20px));
  box-sizing: border-box;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 3px dashed #444;
  padding-bottom: 16px;
  margin-bottom: 20px;
`;

export const BackButton = styled.button`
  background: transparent;
  border: 1px solid #666;
  color: #fff;
  font-family: inherit;
  font-size: 22px;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background: #333;
  }
`;

export const Title = styled.h1`
  text-align: center;
  color: white;
  font-size: 32px;
  margin: 0;
  font-weight: normal;
  letter-spacing: 0.05em;
`;

export const MenuItem = styled.div<{ disabled?: boolean }>`
  background-color: #222;
  border: 1px solid #333;
  border-radius: 6px;
  color: white;
  padding: 16px;
  margin: 12px 0;
  display: flex;
  align-items: center;
  user-select: none;
  transition: transform 0.1s, background-color 0.15s;

  ${(p) =>
    !p.disabled
      ? `
    cursor: pointer;
    &:hover {
      background-color: #2a2a2a;
      border-color: #555;
    }
    &:active {
      transform: scale(0.98);
    }
  `
      : `
    cursor: not-allowed;
    opacity: 0.25;
  `};
`;

export const Atom = styled.div<{ bgColor: string; color: string }>`
  background-color: ${(p) => p.bgColor};
  color: ${(p) => p.color};
  width: 80px;
  height: 80px;
  line-height: 80px;
  font-size: 56px;
  text-align: center;
  position: relative;
  flex-shrink: 0;
  border-radius: 4px;
`;

export const AtomicNumber = styled.div`
  position: absolute;
  top: -28px;
  left: 4px;
  font-size: 24px;
  color: #ddd;
`;

export const AtomDescription = styled.div`
  flex-grow: 1;
  padding-left: 18px;
  overflow: hidden;
`;

export const AtomTitle = styled.h2`
  font-weight: normal;
  font-size: 34px;
  padding: 0;
  margin: 0 0 6px;
  color: #fff;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;

export const AtomScore = styled.div`
  font-size: 26px;
  color: #bbb;
  font-family: 'VT323', monospace;
`;
