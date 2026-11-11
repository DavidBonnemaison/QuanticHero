const p2 =
  typeof window !== 'undefined'
    ? window.p2
    : typeof globalThis !== 'undefined'
      ? globalThis.p2
      : undefined;

export default p2;
