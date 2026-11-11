export const formatScore = (ms: number): string => {
  if (Number.isNaN(ms) || ms < 0) {
    return '00:00:00';
  }

  const totalMs = Math.floor(ms);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const centiseconds = Math.floor((totalMs % 1000) / 10);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const SS = String(centiseconds).padStart(2, '0');

  return `${mm}:${ss}:${SS}`;
};

export default formatScore;
