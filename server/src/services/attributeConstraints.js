// Проверяем ограничения поля: длина, шаблон, минимум и максимум.
export function validateAttributeValue(attribute, value) {
  const constraints = attribute?.constraints;
  if (!constraints || typeof constraints !== "object") return null;

  if (value === null || value === undefined || value === "") {
    if (constraints.required) return "Value is required";
    return null;
  }

  if (attribute.type === "STRING" || attribute.type === "TEXT") {
    const text = String(value);
    if (constraints.minLength != null && text.length < Number(constraints.minLength)) {
      return `Minimum length is ${constraints.minLength}`;
    }
    if (constraints.maxLength != null && text.length > Number(constraints.maxLength)) {
      return `Maximum length is ${constraints.maxLength}`;
    }
    if (constraints.pattern) {
      try {
        const re = new RegExp(constraints.pattern);
        if (!re.test(text)) return "Value does not match the required pattern";
      } catch {
        // Битый шаблон в настройках поля пропускаем.
      }
    }
  }

  if (attribute.type === "NUMERIC") {
    const num = Number(value);
    if (Number.isNaN(num)) return "Value must be a number";
    if (constraints.min != null && num < Number(constraints.min)) {
      return `Minimum value is ${constraints.min}`;
    }
    if (constraints.max != null && num > Number(constraints.max)) {
      return `Maximum value is ${constraints.max}`;
    }
  }

  return null;
}
