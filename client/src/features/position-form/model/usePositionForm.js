import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../../shared/api/api";
import {
  EMPTY_FORM,
  formFromInitial,
  operatorsFor,
  snapshot,
} from "./constants";

export function usePositionForm({ show, initial, attributes, token, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const pendingImageRef = useRef(null);
  const initialSnapshot = useRef(snapshot(EMPTY_FORM));

  useEffect(() => {
    if (!show) return;
    setError(null);
    setConfirmClose(false);
    pendingImageRef.current = null;
    const next = formFromInitial(initial);
    setForm(next);
    initialSnapshot.current = snapshot(next);
  }, [show, initial]);

  const selectedAttributes = useMemo(
    () => attributes.filter((a) => form.attributeIds.includes(a.id)),
    [attributes, form.attributeIds]
  );

  const isDirty = snapshot(form) !== initialSnapshot.current;

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
    return apiFetch(`/api/positions/${positionId}/image`, {
      method: "POST",
      token,
      body,
    });
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

  return {
    form,
    saving,
    error,
    uploadingImage,
    confirmClose,
    setConfirmClose,
    selectedAttributes,
    isDirty,
    setField,
    toggleAttribute,
    addRule,
    updateRule,
    removeRule,
    handleImagePick,
    requestClose,
    discardAndClose,
    submit,
    pendingImageRef,
  };
}
