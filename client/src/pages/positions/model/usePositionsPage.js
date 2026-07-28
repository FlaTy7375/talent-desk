import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";

export function usePositionsPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const canManage = user?.role === "RECRUITER" || user?.role === "ADMIN";
  const canCreateCv = user?.role === "CANDIDATE";
  const canSelect = canManage || canCreateCv;

  const [positions, setPositions] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [accessFilter, setAccessFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const positionsUrl = canManage
        ? "/api/positions/manage"
        : canCreateCv
          ? "/api/cvs/available-positions"
          : "/api/positions";
      const positionRequest = apiFetch(positionsUrl, {
        token: canManage || canCreateCv ? accessToken : undefined,
      });

      const requests = [positionRequest];
      if (canManage) {
        requests.push(apiFetch("/api/attributes", { token: accessToken }));
      }

      const [positionData, attributeData] = await Promise.all(requests);
      setPositions(positionData.positions || []);
      setAttributes(attributeData?.attributes || []);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [canManage, canCreateCv, accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPositions = useMemo(() => {
    if (accessFilter === "public") {
      return positions.filter((position) => position.isPublic);
    }
    if (accessFilter === "restricted") {
      return positions.filter((position) => !position.isPublic);
    }
    return positions;
  }, [positions, accessFilter]);

  const selected = useMemo(
    () => filteredPositions.filter((position) => selectedIds.has(position.id)),
    [filteredPositions, selectedIds]
  );

  const filterCounts = useMemo(
    () => ({
      all: positions.length,
      public: positions.filter((position) => position.isPublic).length,
      restricted: positions.filter((position) => !position.isPublic).length,
    }),
    [positions]
  );

  const levelCounts = useMemo(() => {
    const counts = { JUNIOR: 0, MIDDLE: 0, SENIOR: 0, C_LEVEL: 0 };
    for (const position of filteredPositions) {
      if (counts[position.level] != null) counts[position.level] += 1;
    }
    return counts;
  }, [filteredPositions]);

  const focusedPosition = canCreateCv && selected.length === 1 ? selected[0] : null;

  function toggle(id) {
    if (!canSelect) return;
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit() {
    if (selected.length !== 1) return;
    setEditing(selected[0]);
    setShowForm(true);
  }

  async function duplicate() {
    if (selected.length !== 1) return;
    try {
      await apiFetch(`/api/positions/${selected[0].id}/duplicate`, {
        method: "POST",
        token: accessToken,
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} position(s)?`)) return;
    try {
      await apiFetch("/api/positions", {
        method: "DELETE",
        token: accessToken,
        body: { ids: selected.map((position) => position.id) },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createOrOpenCv() {
    if (selected.length !== 1) return;
    if (selected[0].existingCv) {
      navigate(`/cvs/${selected[0].existingCv.id}`);
      return;
    }
    try {
      const data = await apiFetch("/api/cvs", {
        method: "POST",
        token: accessToken,
        body: { positionId: selected[0].id },
      });
      navigate(`/cvs/${data.cv.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return {
    user,
    accessToken,
    canManage,
    canCreateCv,
    canSelect,
    positions,
    attributes,
    selectedIds,
    loading,
    error,
    showForm,
    setShowForm,
    editing,
    setEditing,
    accessFilter,
    setAccessFilter,
    filteredPositions,
    selected,
    filterCounts,
    levelCounts,
    focusedPosition,
    toggle,
    openCreate,
    openEdit,
    duplicate,
    remove,
    createOrOpenCv,
    load,
  };
}
