import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import { ensurePdfUnicodeFont } from "../../../shared/lib/pdfFont";
import ProfileAttributeField from "../../../features/profile-field/ui/ProfileAttributeField";
import LoadingState from "../../../shared/ui/LoadingState";
import { attributeLabel, enumLabel } from "../../../shared/i18n/labels";

function filled(value) {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "object") return Object.values(value).every(filled);
  return true;
}

export default function CvPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, accessToken, updateLocalAvatar, updateLocalName } = useAuth();
  const [cv, setCv] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [dirty, setDirty] = useState(() => new Set());
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [liking, setLiking] = useState(false);

  const cvRef = useRef(cv);
  const draftsRef = useRef(drafts);
  const dirtyRef = useRef(dirty);
  const savingRef = useRef(false);

  useEffect(() => {
    cvRef.current = cv;
  }, [cv]);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const load = useCallback(async () => {
    const data = await apiFetch(`/api/cvs/${id}`, { token: accessToken });
    setCv(data.cv);
    setPermissions(data.permissions);
    setDrafts(
      Object.fromEntries(
        data.cv.attributes.map((item) => [item.attribute.id, item.value])
      )
    );
    setDirty(new Set());
    setStatus("saved");
    setError(null);
  }, [id, accessToken]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  const saveDirty = useCallback(async () => {
    if (!accessToken || !cvRef.current) return true;
    if (!dirtyRef.current.size) return true;
    for (let i = 0; i < 40 && savingRef.current; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (savingRef.current) return false;

    savingRef.current = true;
    setStatus("saving");
    const successes = [];
    let failed = false;

    for (const attributeId of [...dirtyRef.current]) {
      const item = cvRef.current.attributes.find(
        (entry) => entry.attribute.id === attributeId
      );
      try {
        const result = await apiFetch(`/api/cvs/${id}/attributes/${attributeId}`, {
          method: "PUT",
          token: accessToken,
          body: {
            value: draftsRef.current[attributeId],
            version: item.valueVersion,
          },
        });
        successes.push({ attributeId, result });
      } catch (err) {
        failed = true;
        setStatus("error");
        setError(err.message);
      }
    }

    if (successes.length) {
      setCv((previous) => {
        const attributes = previous.attributes.map((item) => {
          const saved = successes.find(
            (entry) => entry.attributeId === item.attribute.id
          );
          return saved
            ? {
                ...item,
                value: saved.result.value,
                valueVersion: saved.result.version,
                filled: filled(saved.result.value),
              }
            : item;
        });
        const next = {
          ...previous,
          attributes,
          complete: attributes.every((item) => item.filled),
        };
        cvRef.current = next;
        return next;
      });
      for (const { attributeId, result } of successes) {
        const item = cvRef.current?.attributes.find(
          (entry) => entry.attribute.id === attributeId
        );
        if (item?.attribute?.name === "Personal Photo") {
          updateLocalAvatar(
            typeof result.value === "string" && result.value ? result.value : null
          );
        }
        if (
          item?.attribute?.name === "First Name" ||
          item?.attribute?.name === "Last Name"
        ) {
          const attrs = cvRef.current?.attributes || [];
          const first = attrs.find((entry) => entry.attribute.name === "First Name");
          const last = attrs.find((entry) => entry.attribute.name === "Last Name");
          const parts = [first, last].map((entry) => {
            if (!entry) return "";
            const value = draftsRef.current[entry.attribute.id];
            return typeof value === "string" ? value.trim() : "";
          });
          const nextName = parts.filter(Boolean).join(" ") || null;
          updateLocalName(nextName);
          if (nextName) {
            setCv((previous) =>
              previous
                ? { ...previous, user: { ...previous.user, name: nextName } }
                : previous
            );
          }
        }
      }
      setDirty((previous) => {
        const next = new Set(previous);
        successes.forEach(({ attributeId }) => next.delete(attributeId));
        dirtyRef.current = next;
        return next;
      });
      if (!failed) setStatus("saved");
    }
    savingRef.current = false;
    return !failed;
  }, [id, accessToken, updateLocalAvatar, updateLocalName]);

  useEffect(() => {
    const timer = setInterval(saveDirty, 7000);
    return () => clearInterval(timer);
  }, [saveDirty]);

  function change(attributeId, value) {
    setDrafts((previous) => ({ ...previous, [attributeId]: value }));
    setDirty((previous) => new Set(previous).add(attributeId));
    setStatus("dirty");
  }

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    setError(null);
    try {
      const saved = await saveDirty();
      if (!saved) return;
      const latest = cvRef.current;
      const data = await apiFetch(`/api/cvs/${id}/publish`, {
        method: "POST",
        token: accessToken,
        body: { version: latest.version },
      });
      setCv(data.cv);
      setStatus("saved");
    } catch (err) {
      setError(
        err.body?.missing?.length
          ? `${err.message}: ${err.body.missing.join(", ")}`
          : err.message
      );
    } finally {
      setPublishing(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("cv.confirmDelete"))) return;
    await apiFetch(`/api/cvs/${id}`, { method: "DELETE", token: accessToken });
    navigate("/profile");
  }

  async function toggleLike() {
    if (liking) return;
    if (!permissions?.canLike && user?.role !== "RECRUITER" && user?.role !== "ADMIN") {
      return;
    }
    const currentlyLiked = Boolean(cvRef.current?.likedByMe);
    const previousLikes = cvRef.current?.likes ?? 0;
    const optimistic = {
      likedByMe: !currentlyLiked,
      likes: Math.max(0, previousLikes + (currentlyLiked ? -1 : 1)),
    };
    setLiking(true);
    setError(null);
    setCv((previous) => (previous ? { ...previous, ...optimistic } : previous));
    if (cvRef.current) {
      cvRef.current = { ...cvRef.current, ...optimistic };
    }
    try {
      const data = await apiFetch(`/api/cvs/${id}/like`, {
        method: currentlyLiked ? "DELETE" : "POST",
        token: accessToken,
      });
      const confirmed = { likedByMe: data.liked, likes: data.likes };
      setCv((previous) => (previous ? { ...previous, ...confirmed } : previous));
      if (cvRef.current) {
        cvRef.current = { ...cvRef.current, ...confirmed };
      }
    } catch (err) {
      const rollback = { likedByMe: currentlyLiked, likes: previousLikes };
      setCv((previous) => (previous ? { ...previous, ...rollback } : previous));
      if (cvRef.current) {
        cvRef.current = { ...cvRef.current, ...rollback };
      }
      setError(err.message);
    } finally {
      setLiking(false);
    }
  }

  async function downloadPdf() {
    if (!cv) return;
    try {
      const attrs = cv.attributes || [];
      const first = attrs.find((entry) => entry.attribute.name === "First Name");
      const last = attrs.find((entry) => entry.attribute.name === "Last Name");
      const nameParts = [first, last].map((entry) => {
        if (!entry) return "";
        const value = drafts[entry.attribute.id] ?? entry.value;
        return typeof value === "string" ? value.trim() : "";
      });
      const name =
        nameParts.filter(Boolean).join(" ") || cv.user.name || cv.user.email || "Candidate";

      const doc = new jsPDF();
      await ensurePdfUnicodeFont(doc);
      const margin = 14;
      let y = 20;
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(16);
      doc.text(cv.position.title || "CV", margin, y);
      y += 10;
      doc.setFontSize(12);
      doc.text(name, margin, y);
      y += 8;
      if (cv.position.company) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(cv.position.company, margin, y);
        doc.setTextColor(0);
        y += 10;
      } else {
        y += 4;
      }

      doc.setFontSize(11);
      doc.text(t("cv.details"), margin, y);
      y += 7;
      doc.setFontSize(9);
      for (const item of cv.attributes) {
        const label = attributeLabel(t, item.attribute);
        const raw = drafts[item.attribute.id] ?? item.value;
        let text = "—";
        if (raw == null || raw === "") text = "—";
        else if (typeof raw === "boolean") text = raw ? t("common.yes") : t("common.no");
        else if (typeof raw === "object") text = JSON.stringify(raw);
        else text = String(raw);
        const line = `${label}: ${text}`.slice(0, 110);
        if (y > 250) {
          doc.addPage();
          doc.setFont("DejaVuSans", "normal");
          y = 20;
        }
        doc.text(line, margin, y);
        y += 6;
      }

      const cvUrl = `${window.location.origin}/cvs/${id}`;
      const qrDataUrl = await QRCode.toDataURL(cvUrl, { margin: 1, width: 140 });
      if (y > 200) {
        doc.addPage();
        doc.setFont("DejaVuSans", "normal");
        y = 20;
      }
      y += 6;
      doc.setFontSize(10);
      doc.text(t("cv.qrHint"), margin, y);
      y += 4;
      doc.addImage(qrDataUrl, "PNG", margin, y, 40, 40);
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(cvUrl, margin + 45, y + 20, { maxWidth: pageWidth - margin * 2 - 45 });

      doc.save(`cv-${id}.pdf`);
    } catch (err) {
      setError(err.message || t("errors.generic"));
    }
  }

  if (error && !cv) return <div className="alert alert-danger">{error}</div>;
  if (!cv) return <LoadingState rows={5} />;

  const candidateName = (() => {
    const attrs = cv.attributes || [];
    const first = attrs.find((entry) => entry.attribute.name === "First Name");
    const last = attrs.find((entry) => entry.attribute.name === "Last Name");
    const parts = [first, last].map((entry) => {
      if (!entry) return "";
      const value = drafts[entry.attribute.id] ?? entry.value;
      return typeof value === "string" ? value.trim() : "";
    });
    return parts.filter(Boolean).join(" ") || cv.user.name || cv.user.email;
  })();

  const canDownloadPdf =
    permissions?.canEdit ||
    user?.role === "RECRUITER" ||
    user?.role === "ADMIN" ||
    cv.user?.id === user?.id;

  return (
    <article className="cv-page">
      <header className="cv-page__header">
        <div className="cv-page__title">
          <Link to="/profile" className="cv-page__back">
            ← {t("cv.back")}
          </Link>
          <div className="cv-page__heading">
            <h1>{cv.position.title}</h1>
            <span
              className={`status-pill ${
                cv.status === "PUBLISHED" ? "status-pill--published" : "status-pill--draft"
              }`}
            >
              <i
                className={`bi ${
                  cv.status === "PUBLISHED" ? "bi-patch-check-fill" : "bi-pencil-square"
                }`}
                aria-hidden="true"
              />
              {enumLabel(t, "cvStatuses", cv.status)}
            </span>
          </div>
          <p className="cv-page__meta">
            {[cv.position.company, candidateName].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div className="cv-page__toolbar">
          {(permissions.canEdit || permissions.canPublish) && (
            <div className="cv-page__group" aria-label={t("cv.primaryActions")}>
              {permissions.canEdit && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={dirty.size === 0 || status === "saving" || publishing}
                  onClick={() => saveDirty()}
                >
                  <i className="bi bi-floppy" aria-hidden="true" />
                  {t("profile.saveNow")}
                </button>
              )}
              {permissions.canPublish && (
                <button
                  type="button"
                  className="btn btn-success cv-publish-button"
                  disabled={publishing || !cv.complete || status === "saving"}
                  onClick={publish}
                >
                  {publishing ? (
                    <>
                      <span className="auth-button-spinner" aria-hidden="true" />
                      <span className="visually-hidden">{t("cv.publishing")}</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-check" aria-hidden="true" />
                      {cv.status === "PUBLISHED" ? t("cv.republish") : t("cv.publish")}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <div className="cv-page__group cv-page__group--tools" aria-label={t("cv.tools")}>
            {(permissions?.canLike ||
              ((user.role === "RECRUITER" || user.role === "ADMIN") &&
                cv.status === "PUBLISHED")) && (
              <button
                type="button"
                className={`btn ${cv.likedByMe ? "btn-primary" : "btn-outline-primary"}`}
                onClick={toggleLike}
                disabled={liking}
                aria-pressed={Boolean(cv.likedByMe)}
              >
                <i
                  className={`bi ${cv.likedByMe ? "bi-heart-fill" : "bi-heart"}`}
                  aria-hidden="true"
                />
                {cv.likedByMe ? t("cv.unlike") : t("cv.like")} · {cv.likes ?? 0}
              </button>
            )}
            {canDownloadPdf && (
              <button type="button" className="btn btn-outline-secondary" onClick={downloadPdf}>
                <i className="bi bi-filetype-pdf" aria-hidden="true" />
                {t("cv.downloadPdf")}
              </button>
            )}
            {permissions.canEdit && (
              <button type="button" className="btn btn-outline-danger" onClick={remove}>
                <i className="bi bi-trash3" aria-hidden="true" />
                {t("cv.delete")}
              </button>
            )}
          </div>
        </div>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}
      {permissions.canEdit && (
        <p className="save-hint">
          <span className={`save-pill save-pill--${status}`}>
            <i className="bi bi-cloud-check" aria-hidden="true" />
            {t(`profile.save.${status}`)}
          </span>
          <span>{t("cv.autosaveHint")}</span>
        </p>
      )}

      <section className="cv-page__panel">
        <div className="cv-page__panel-head">
          <h2>{t("cv.details")}</h2>
        </div>
        <div className="cv-page__panel-body">
          {cv.attributes.map((item) => {
            const empty = !filled(drafts[item.attribute.id]);
            return (
              <div
                key={item.attribute.id}
                className={`cv-page__field ${empty ? "cv-page__field--empty" : ""}`}
              >
                <ProfileAttributeField
                  item={item}
                  value={drafts[item.attribute.id]}
                  dirty={dirty.has(item.attribute.id)}
                  disabled={!permissions.canEdit}
                  token={accessToken}
                  onImageUploaded={updateLocalAvatar}
                  onChange={(value) => change(item.attribute.id, value)}
                />
                {empty && <div className="text-danger small">{t("cv.required")}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="cv-page__panel">
        <div className="cv-page__panel-head">
          <h2>{t("cv.projects")}</h2>
          <p>
            {t("cv.projectFilter")}: {cv.position.projectTags.join(", ") || "—"}
          </p>
        </div>
        <div className="cv-page__panel-body">
          {!cv.projects.length ? (
            <p className="text-body-secondary mb-0">{t("cv.noProjects")}</p>
          ) : (
            cv.projects.map((project) => (
              <div key={project.id} className="cv-page__project">
                <h3>{project.name}</h3>
                <p className="cv-page__project-meta">
                  {project.periodStart?.slice(0, 10) || "—"} –{" "}
                  {project.periodEnd?.slice(0, 10) || "—"} · {project.tags.join(", ")}
                </p>
                <ReactMarkdown>{project.description}</ReactMarkdown>
              </div>
            ))
          )}
        </div>
      </section>
    </article>
  );
}
