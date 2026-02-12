export const serializeDesign = (query: any) => {
  return query.serialize();
};

export const deserializeDesign = (json: string) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to deserialize design:', e);
    return null;
  }
};
