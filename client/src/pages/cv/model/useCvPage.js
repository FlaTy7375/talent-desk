import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import { filled, getCandidateName } from "../lib/cvUtils";
import { downloadCvPdf } from "../lib/cvPdfExport";

export function useCvPage() {
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
          const nextName = getCandidateName(cvRef.current, draftsRef.current);
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
      await downloadCvPdf({ cv, drafts, id, t });
    } catch (err) {
      setError(err.message || t("errors.generic"));
    }
  }

  const candidateName = cv ? getCandidateName(cv, drafts) : "";
  const canDownloadPdf =
    permissions?.canEdit ||
    user?.role === "RECRUITER" ||
    user?.role === "ADMIN" ||
    cv?.user?.id === user?.id;

  return {
    user,
    cv,
    permissions,
    drafts,
    dirty,
    status,
    error,
    publishing,
    liking,
    candidateName,
    canDownloadPdf,
    saveDirty,
    change,
    publish,
    remove,
    toggleLike,
    downloadPdf,
  };
}
