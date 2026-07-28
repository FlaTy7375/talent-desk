import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";

export function useSearchPage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() || "";
  const [draft, setDraft] = useState(q);
  const [results, setResults] = useState({ positions: [], cvs: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => {
    if (!q) {
      setResults({ positions: [], cvs: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch(`/api/dashboard/search?q=${encodeURIComponent(q)}`, {
      token: accessToken || undefined,
    })
      .then(setResults)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, accessToken]);

  function submitSearch(event) {
    event.preventDefault();
    const next = draft.trim();
    navigate(next ? `/search?q=${encodeURIComponent(next)}` : "/search");
  }

  const total = results.positions.length + results.cvs.length;
  const canSeeCvs = user?.role === "RECRUITER" || user?.role === "ADMIN";

  return {
    q,
    draft,
    setDraft,
    results,
    loading,
    error,
    total,
    canSeeCvs,
    submitSearch,
  };
}
