export function enumLabel(t, group, value) {
  if (!value) return "—";
  const key = `enums.${group}.${value}`;
  const translated = t(key);

  if (translated === key) {
    return String(value)
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  }
  return translated;
}

export function attributeLabel(t, attribute) {
  if (!attribute) return "";
  if (!attribute.isSystem) return attribute.name;
  return t(`systemAttributes.${attribute.name}`, {
    defaultValue: attribute.name,
  });
}

export function attributeDescription(t, attribute) {
  if (!attribute?.description) return "";
  if (!attribute.isSystem) return attribute.description;
  return t(`systemAttributeDescriptions.${attribute.name}`, {
    defaultValue: attribute.description,
  });
}

export function categoryLabel(t, category) {
  if (!category) return "";
  return t(`systemCategories.${category.code}`, {
    defaultValue: category.name,
  });
}
