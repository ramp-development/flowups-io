// Capitalise the first letter of a string
export const sentenceCase = (string: string): string => {
  return string.toLowerCase().replace(/(^\s*\w)/g, (match) => match.toUpperCase());
};
