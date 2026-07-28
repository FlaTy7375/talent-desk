import { useEffect, useState } from "react";
import { apiFetch } from "../../../shared/api/api";
import { emptyConstraints, constraintsFromAttribute, buildConstraintsPayload } from "./constraints";
import { emptyForm } from "./constants";

export function useAttributeForm({ show, initial, categories, token, onSaved, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(false);

  const isEdit = Boolean(initial);
  const isSystem = Boolean(initial?.isSystem);

  useEffect(() => {
    if (!show) return;
    setError(null);
    setConflict(false);
    if (initial) {
      setForm({
        name: initial.name || "",
        description: initial.description || "",
        type: initial.type || "STRING",
        categoryId: initial.categoryId || initial.category?.id || "",
        optionsText: (initial.options || []).map((o) => o.label).join("\n"),
        constraints: constraintsFromAttribute(initial),
      });
    } else {
      setForm({
        ...emptyForm,
        categoryId: categories[0]?.id || "",
        constraints: { ...emptyConstraints },
      });
    }
  }, [show, initial, categories]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setConstraint(key, value) {
    setForm((prev) => ({
      ...prev,
      constraints: { ...prev.constraints, [key]: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setConflict(false);

    const options = form.optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const constraints = isSystem ? undefined : buildConstraintsPayload(form);

    try {
      if (isEdit) {
        const payload = {
          version: initial.version,
          description: form.description,
        };
        if (!isSystem) {
          payload.name = form.name;
          payload.type = form.type;
          payload.categoryId = form.categoryId;
          payload.constraints = constraints;
          if (form.type === "ONE_OF_MANY") {
            payload.options = options;
          } else {
            payload.options = [];
          }
        }

        const data = await apiFetch(`/api/attributes/${initial.id}`, {
          method: "PATCH",
          token,
          body: payload,
        });
        onSaved(data.attribute);
      } else {
        const data = await apiFetch("/api/attributes", {
          method: "POST",
          token,
          body: {
            name: form.name,
            description: form.description,
            type: form.type,
            categoryId: form.categoryId,
            options: form.type === "ONE_OF_MANY" ? options : [],
            constraints,
          },
        });
        onSaved(data.attribute);
      }
      onClose();
    } catch (err) {
      if (err.status === 409 && err.body?.error === "Version conflict") {
        setConflict(true);
        setError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return {
    form,
    saving,
    error,
    conflict,
    isEdit,
    isSystem,
    setField,
    setConstraint,
    handleSubmit,
  };
}
