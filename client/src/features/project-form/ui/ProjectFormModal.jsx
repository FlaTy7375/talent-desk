import { useEffect, useState } from "react";
import Tags from "@yaireo/tagify/react";
import "@yaireo/tagify/dist/tagify.css";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../../shared/api/api";

const empty = {
  name: "",
  periodStart: "",
  periodEnd: "",
  description: "",
  tags: [],
};

function dateForInput(value) {
  return value ? String(value).slice(0, 10) : "";
}

export default function ProjectFormModal({
  show,
  initial,
  suggestions,
  token,
  ownerUserId = null,
  onClose,
  onSaved,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!show) return;
    setError(null);
    setForm(
      initial
        ? {
            name: initial.name,
            periodStart: dateForInput(initial.periodStart),
            periodEnd: dateForInput(initial.periodEnd),
            description: initial.description || "",
            tags: initial.tags || [],
          }
        : empty
    );
  }, [show, initial]);

  if (!show) return null;

  function field(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const base = initial
        ? `/api/profile/projects/${initial.id}`
        : "/api/profile/projects";
      const path = ownerUserId
        ? `${base}?userId=${encodeURIComponent(ownerUserId)}`
        : base;
      const data = await apiFetch(path, {
        method: initial ? "PATCH" : "POST",
        token,
        body: {
          ...form,
          ...(initial ? { version: initial.version } : {}),
        },
      });
      onSaved(data.project);
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
      style={{ background: "rgba(0,0,0,.45)", overflowY: "auto" }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <form onSubmit={submit}>
            <div className="modal-header">
              <h2 className="modal-title h5">
                {initial ? t("profile.projects.edit") : t("profile.projects.create")}
              </h2>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="mb-3">
                <label className="form-label">{t("profile.projects.name")}</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => field("name", e.target.value)}
                  required
                />
              </div>
              <div className="row g-2 mb-3">
                <div className="col-sm-6">
                  <label className="form-label">{t("profile.projects.from")}</label>
                  <input
                    className="form-control"
                    type="date"
                    value={form.periodStart}
                    onChange={(e) => field("periodStart", e.target.value)}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label">{t("profile.projects.to")}</label>
                  <input
                    className="form-control"
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) => field("periodEnd", e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">{t("profile.projects.tags")}</label>
                <Tags
                  value={form.tags.join(",")}
                  settings={{
                    whitelist: suggestions,
                    dropdown: { enabled: 0, maxItems: 20 },
                    duplicates: false,
                  }}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.detail.value || "[]");
                      field(
                        "tags",
                        parsed.map((tag) => tag.value)
                      );
                    } catch {
                      field("tags", []);
                    }
                  }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">{t("profile.projects.description")}</label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={form.description}
                  onChange={(e) => field("description", e.target.value)}
                />
                {form.description && (
                  <div className="border rounded p-3 mt-2">
                    <ReactMarkdown>{form.description}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                <i className="bi bi-x-lg" aria-hidden="true" />
                {t("profile.projects.cancel")}
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {!saving && <i className="bi bi-check2" aria-hidden="true" />}
                {saving ? "…" : t("profile.projects.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
