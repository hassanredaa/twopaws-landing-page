export const isReactSnapPrerender = () => {
  if (typeof navigator === "undefined") return false;
  return /ReactSnap/i.test(navigator.userAgent);
};
