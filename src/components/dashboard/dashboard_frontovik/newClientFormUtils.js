export const isQuestionnaireFieldValid = (field, values) => {
  const value = values?.[field.name];
  if (field.boolean) return typeof value === "boolean";
  if (field.optional && String(value || "").trim().length === 0) return true;
  if (field.validate) return field.validate(value, values || {});
  return String(value || "").trim().length > 0;
};

export const isTerrorScreeningReady = ({ lastName, firstName, birthDate }) =>
  [lastName, firstName, birthDate].every(
    (value) => String(value || "").trim().length > 0,
  );
