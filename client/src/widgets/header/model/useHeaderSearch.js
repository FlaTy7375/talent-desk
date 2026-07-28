import { useEffect, useState } from "react";
import { apiFetch } from "../../../shared/api/api";

export function useHeaderSearch(accessToken) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState({ positions: [], cvs: [] });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions({ positions: [], cvs: [] });
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);
    const timer = setTimeout(() => {
      apiFetch(`/api/dashboard/search?q=${encodeURIComponent(q)}`, {
        token: accessToken || undefined,
      })
        .then((data) => {
          if (!cancelled) {
            setSuggestions({
              positions: (data.positions || []).slice(0, 5),
              cvs: (data.cvs || []).slice(0, 3),
            });
          }
        })
        .catch(() => {
          if (!cancelled) setSuggestions({ positions: [], cvs: [] });
        })
        .finally(() => {
          if (!cancelled) setSuggestionsLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, accessToken]);

  return {
    query,
    setQuery,
    suggestions,
    suggestionsOpen,
    setSuggestionsOpen,
    suggestionsLoading,
  };
}
