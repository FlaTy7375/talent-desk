import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";

export function useAttributesPage() {
  const { accessToken } = useAuth();

  const [attributes, setAttributes] = useState([]);
  const [recent, setRecent] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (categoryId) params.set("categoryId", categoryId);

      const [listData, recentData, catData] = await Promise.all([
        apiFetch(`/api/attributes?${params.toString()}`, { token: accessToken }),
        apiFetch("/api/attributes?recent=1", { token: accessToken }),
        apiFetch("/api/meta/categories", { token: accessToken }),
      ]);

      setAttributes(listData.attributes || []);
      setRecent(recentData.attributes || []);
      setCategories(catData.categories || []);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, q, categoryId]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  const selectedCount = selectedIds.size;

  const selectedAttributes = useMemo(
    () => attributes.filter((a) => selectedIds.has(a.id)),
    [attributes, selectedIds]
  );

  const summary = useMemo(() => {
    const system = attributes.filter((item) => item.isSystem).length;
    return {
      total: attributes.length,
      system,
      custom: attributes.length - system,
      categories: new Set(attributes.map((item) => item.category?.id).filter(Boolean))
        .size,
    };
  }, [attributes]);

  function toggleOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === attributes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(attributes.map((a) => a.id)));
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit() {
    if (selectedAttributes.length !== 1) return;
    setEditing(selectedAttributes[0]);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!selectedCount) return;
    const names = selectedAttributes.map((a) => a.name).join(", ");
    if (!window.confirm(`Delete attributes: ${names}?`)) return;

    try {
      await apiFetch("/api/attributes", {
        method: "DELETE",
        token: accessToken,
        body: { ids: [...selectedIds] },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return {
    attributes,
    recent,
    categories,
    loading,
    error,
    q,
    setQ,
    categoryId,
    setCategoryId,
    selectedIds,
    modalOpen,
    setModalOpen,
    editing,
    setEditing,
    selectedCount,
    selectedAttributes,
    summary,
    toggleOne,
    toggleAll,
    openCreate,
    openEdit,
    handleDelete,
    load,
  };
}
