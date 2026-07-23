import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../../shared/api/api";
import ConfirmModal from "../../../shared/ui/ConfirmModal";
import { attributeLabel, categoryLabel, enumLabel } from "../../../shared/i18n/labels";

const LEVELS = ["", "JUNIOR", "MIDDLE", "SENIOR", "C_LEVEL"];

function operatorsFor(type) {
  if (type === "NUMERIC" || type === "DATE") return ["eq", "gt", "gte", "lt", "lte"];
  if (type === "BOOLEAN") return ["eq"];
  if (type === "STRING" || type === "TEXT") return ["eq", "contains"];
  if (type === "ONE_OF_MANY") return ["eq"];
  return ["eq"];
}

const empty = {
  title: "",
  shortDescription: "",
  company: "",
  level: "",
  isPublic: true,
  maxProjects: 3,
  imageUrl: "",
  attributeIds: [],
  tagsText: "",
  accessRules: [],
};

function snapshot(form) {
  return JSON.stringify(form);
}

export default function PositionFormModal({
  show,
  initial,
  attributes,
  token,
  onClose,
  onSaved,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const pendingImageRef = useRef(null);
  const initialSnapshot = useRef(snapshot(empty));

  useEffect(() => {
    if (!show) return;
    setError(null);
    setConfirmClose(false);
    pendingImageRef.current = null;
    if (!initial) {
      setForm(empty);
      initialSnapshot.current = snapshot(empty);
      return;
    }
    const next = {
      title: initial.title || "",
      shortDescription: initial.shortDescription || "",
      company: initial.company || "",
      level: initial.level || "",
      isPublic: initial.isPublic,
      maxProjects: initial.maxProjects ?? 3,
      imageUrl: initial.imageUrl || "",
      attributeIds: (initial.attributes || []).map((a) => a.id),
      tagsText: (initial.projectTags || []).map((tag) => tag.name).join(", "),
      accessRules: Array.isArray(initial.accessRules) ? initial.accessRules : [],
    };
    setForm(next);
    initialSnapshot.current = snapshot(next);
  }, [show, initial]);


  const selectedAttributes = useMemo(
    () => attributes.filter((a) => form.attributeIds.includes(a.id)),
    [attributes, form.attributeIds]
  );

  const isDirty = snapshot(form) !== initialSnapshot.current;

  if (!show) return null;

  function requestClose() {
    if (isDirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  function discardAndClose() {
    setConfirmClose(false);
    onClose();
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleAttribute(id) {
    setForm((prev) => {
      const selected = prev.attributeIds.includes(id)
        ? prev.attributeIds.filter((value) => value !== id)
        : [...prev.attributeIds, id];

      return {
        ...prev,
        attributeIds: selected,
        // Убрали атрибут — убираем и правила доступа, которые на него ссылались.
        accessRules: prev.accessRules.filter((rule) => selected.includes(rule.attributeId)),
      };
    });
  }

  function addRule() {
    const first = selectedAttributes[0];
    if (!first) return;
    setForm((prev) => ({
      ...prev,
      accessRules: [
        ...prev.accessRules,
        {
          attributeId: first.id,
          operator: operatorsFor(first.type)[0],
          value: first.type === "BOOLEAN" ? true : "",
        },
      ],
    }));
  }

  function updateRule(index, patch) {
    setForm((prev) => ({
      ...prev,
      accessRules: prev.accessRules.map((rule, i) =>
        i === index ? { ...rule, ...patch } : rule
      ),
    }));
  }

  function removeRule(index) {
    setForm((prev) => ({
      ...prev,
      accessRules: prev.accessRules.filter((_, i) => i !== index),
    }));
  }

  async function uploadPositionImage(positionId, file) {
    const body = new FormData();
    body.append("image", file);
    const data = await apiFetch(`/api/positions/${positionId}/image`, {
      method: "POST",
      token,
      body,
    });
    return data;
  }

  async function handleImagePick(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(t("errors.chooseImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t("positions.image.tooLarge"));
      return;
    }

    if (!initial?.id) {
      // Новой позиции ещё нет в базе — картинку загрузим после создания.
      pendingImageRef.current = file;
      setField("imageUrl", URL.createObjectURL(file));
      return;
    }

    setUploadingImage(true);
    setError(null);
    try {
      const data = await uploadPositionImage(initial.id, file);
      setField("imageUrl", data.url);
      if (data.position) onSaved?.(data.position);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const projectTags = form.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const body = {
      title: form.title,
      shortDescription: form.shortDescription,
      company: form.company,
      level: form.level || null,
      isPublic: form.isPublic,
      maxProjects: Number(form.maxProjects),
      imageUrl: form.imageUrl?.startsWith("blob:") ? null : form.imageUrl || null,
      attributeIds: form.attributeIds,
      projectTags,
      accessRules: form.isPublic ? [] : form.accessRules,
      ...(initial ? { version: initial.version } : {}),
    };

    try {
      const data = await apiFetch(
        initial ? `/api/positions/${initial.id}` : "/api/positions",
        {
          method: initial ? "PATCH" : "POST",
          token,
          body,
        }
      );
      let position = data.position;
      const pending = pendingImageRef.current;
      if (pending && position?.id) {
        const uploaded = await uploadPositionImage(position.id, pending);
        pendingImageRef.current = null;
        position = uploaded.position || { ...position, imageUrl: uploaded.url };
      }
      initialSnapshot.current = snapshot({
        ...form,
        imageUrl: position.imageUrl || "",
      });
      onSaved(position);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (


    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ background: "rgba(0,0,0,.45)", overflowY: "auto" }}
      onClick={requestClose}
    >
      <div
        className="modal-dialog modal-lg modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-content"
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >

          <form
            onSubmit={submit}
            className="d-flex flex-column overflow-hidden"
          >
            <div className="modal-header">
              <h2 className="modal-title h5">
                {initial ? t("positions.edit") : t("positions.create")}
              </h2>
              <button type="button" className="btn-close" onClick={requestClose} />
            </div>

            <div className="modal-body overflow-auto">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label">{t("positions.fields.title")}</label>
                  <input
                    className="form-control"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">{t("positions.fields.level")}</label>
                  <select
                    className="form-select"
                    value={form.level}
                    onChange={(e) => setField("level", e.target.value)}
                  >
                    {LEVELS.map((level) => (
                      <option key={level || "none"} value={level}>
                        {enumLabel(t, "positionLevels", level)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">{t("positions.fields.company")}</label>
                  <input
                    className="form-control"
                    value={form.company}
                    onChange={(e) => setField("company", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t("positions.fields.maxProjects")}</label>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    value={form.maxProjects}
                    onChange={(e) => setField("maxProjects", e.target.value)}
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">{t("positions.fields.image")}</label>
                  <div className="position-image-field">
                    <div className="position-image-field__preview">
                      {form.imageUrl ? (
                        <img src={form.imageUrl} alt="" />
                      ) : (
                        <span>{(form.company || form.title || "?").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="position-image-field__actions">
                      <label className="btn btn-outline-secondary btn-sm mb-0">
                        <i className="bi bi-image" aria-hidden="true" />
                        {uploadingImage
                          ? t("positions.image.uploading")
                          : t("positions.image.choose")}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          hidden
                          disabled={uploadingImage || saving}
                          onChange={(e) => {
                            handleImagePick(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {form.imageUrl && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          disabled={uploadingImage || saving}
                          onClick={() => {
                            pendingImageRef.current = null;
                            setField("imageUrl", "");
                          }}
                        >
                          {t("positions.image.remove")}
                        </button>
                      )}
                      <small className="text-body-secondary d-block">
                        {t("positions.image.hint")}
                      </small>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label">{t("positions.fields.description")}</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.shortDescription}
                    onChange={(e) => setField("shortDescription", e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">{t("positions.fields.tags")}</label>
                  <input
                    className="form-control"
                    value={form.tagsText}
                    onChange={(e) => setField("tagsText", e.target.value)}
                    placeholder="React, Node.js, PostgreSQL"
                  />
                  <div className="form-text">{t("positions.tagsHint")}</div>
                </div>
              </div>

              <hr />

              <h3 className="h6">{t("positions.fields.attributes")}</h3>
              <div className="row g-2 mb-3">
                {attributes.map((attribute) => (
                  <div className="col-md-6" key={attribute.id}>
                    <label className="form-check border rounded p-2 ps-5 d-block">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={form.attributeIds.includes(attribute.id)}
                        onChange={() => toggleAttribute(attribute.id)}
                      />
                      <span className="fw-medium">{attributeLabel(t, attribute)}</span>
                      <small className="d-block text-body-secondary">
                        {enumLabel(t, "attributeTypes", attribute.type)} ·{" "}
                        {categoryLabel(t, attribute.category)}
                      </small>
                    </label>
                  </div>
                ))}
              </div>

              <hr />

              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="position-public"
                  checked={form.isPublic}
                  onChange={(e) => setField("isPublic", e.target.checked)}
                />
                <label className="form-check-label" htmlFor="position-public">
                  {t("positions.fields.public")}
                </label>
              </div>

              {!form.isPublic && (
                <section>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="h6 mb-0">{t("positions.fields.rules")}</h3>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={addRule}
                      disabled={!selectedAttributes.length}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" />
                      {t("positions.addRule")}
                    </button>
                  </div>

                  {!selectedAttributes.length && (
                    <p className="small text-body-secondary">
                      {t("positions.selectAttributesFirst")}
                    </p>
                  )}

                  {form.accessRules.map((rule, index) => {
                    const attribute =
                      selectedAttributes.find((item) => item.id === rule.attributeId) ||
                      selectedAttributes[0];
                    if (!attribute) return null;
                    return (
                      <div className="row g-2 mb-2" key={`${rule.attributeId}-${index}`}>
                        <div className="col-md-5">
                          <select
                            className="form-select"
                            value={rule.attributeId}
                            onChange={(e) => {
                              const next = selectedAttributes.find(
                                (item) => item.id === e.target.value
                              );
                              updateRule(index, {
                                attributeId: next.id,
                                operator: operatorsFor(next.type)[0],
                                value: next.type === "BOOLEAN" ? true : "",
                              });
                            }}
                          >
                            {selectedAttributes.map((item) => (
                              <option key={item.id} value={item.id}>
                                {attributeLabel(t, item)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-2">
                          <select
                            className="form-select"
                            value={rule.operator}
                            onChange={(e) => updateRule(index, { operator: e.target.value })}
                          >
                            {operatorsFor(attribute.type).map((operator) => (
                              <option key={operator} value={operator}>
                                {enumLabel(t, "operators", operator)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-4">
                          {attribute.type === "BOOLEAN" ? (
                            <select
                              className="form-select"
                              value={String(rule.value)}
                              onChange={(e) =>
                                updateRule(index, { value: e.target.value === "true" })
                              }
                            >
                              <option value="true">{t("common.yes")}</option>
                              <option value="false">{t("common.no")}</option>
                            </select>
                          ) : attribute.type === "ONE_OF_MANY" ? (
                            <select
                              className="form-select"
                              value={rule.value}
                              onChange={(e) => updateRule(index, { value: e.target.value })}
                            >
                              <option value="">—</option>
                              {attribute.options?.map((option) => (
                                <option key={option.id} value={option.label}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className="form-control"
                              type={attribute.type === "NUMERIC" ? "number" : "text"}
                              value={rule.value}
                              onChange={(e) =>
                                updateRule(index, {
                                  value:
                                    attribute.type === "NUMERIC"
                                      ? Number(e.target.value)
                                      : e.target.value,
                                })
                              }
                              required
                            />
                          )}
                        </div>
                        <div className="col-md-1">
                          <button
                            type="button"
                            className="btn btn-outline-danger icon-only w-100"
                            onClick={() => removeRule(index)}
                            aria-label={t("positions.removeRule")}
                          >
                            <i className="bi bi-trash3" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}

              {initial && (
                <p className="small text-body-secondary mt-3 mb-0">
                  {t("positions.version")}: {initial.version}
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={requestClose}>
                <i className="bi bi-x-lg" aria-hidden="true" />
                {t("positions.cancel")}
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {!saving && <i className="bi bi-check2" aria-hidden="true" />}
                {saving ? "…" : t("positions.save")}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        show={confirmClose}
        title={t("positions.unsavedTitle")}
        message={t("positions.unsavedConfirm")}
        confirmLabel={t("positions.unsavedDiscard")}
        cancelLabel={t("positions.unsavedStay")}
        confirmVariant="danger"
        onConfirm={discardAndClose}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
