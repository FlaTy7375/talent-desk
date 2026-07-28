import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import { getDisplayNameFromItems } from "../lib/profileUtils";

export function useProfilePage() {
  const [searchParams] = useSearchParams();
  const { user, accessToken, updateLocalAvatar, updateLocalName } = useAuth();
  const adminUserId =
    user?.role === "ADMIN" ? searchParams.get("userId")?.trim() || null : null;
  const editingOther = Boolean(adminUserId && adminUserId !== user?.id);

  const profileApi = useCallback(
    (path, options = {}) => {
      let url = path;
      if (adminUserId) {
        const sep = path.includes("?") ? "&" : "?";
        url = `${path}${sep}userId=${encodeURIComponent(adminUserId)}`;
      }
      return apiFetch(url, { ...options, token: options.token ?? accessToken });
    },
    [adminUserId, accessToken]
  );

  const [activeTab, setActiveTab] = useState("me");
  const [profile, setProfile] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [saveState, setSaveState] = useState("idle");
  const [error, setError] = useState(null);

  const draftsRef = useRef(drafts);
  const dirtyRef = useRef(dirtyIds);
  const profileRef = useRef(profile);
  const savingRef = useRef(false);
  const profileApiRef = useRef(profileApi);

  const [projectModal, setProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [addAttributeId, setAddAttributeId] = useState("");

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);
  useEffect(() => {
    dirtyRef.current = dirtyIds;
  }, [dirtyIds]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    profileApiRef.current = profileApi;
  }, [profileApi]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    const data = await profileApi("/api/profile");
    setProfile(data);

    const nextDrafts = {};
    [...data.me, ...data.info].forEach((item) => {
      nextDrafts[item.attribute.id] = item.value;
    });
    setDrafts(nextDrafts);
    setDirtyIds(new Set());
    setSaveState("saved");
  }, [accessToken, profileApi]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  function findItem(attributeId) {
    const data = profileRef.current;
    return [...(data?.me || []), ...(data?.info || [])].find(
      (item) => item.attribute.id === attributeId
    );
  }

  function currentDisplayName() {
    const items = [...(profileRef.current?.me || []), ...(profileRef.current?.info || [])];
    return getDisplayNameFromItems(items, draftsRef.current);
  }

  const saveDirty = useCallback(async () => {
    if (!accessToken) return true;
    if (dirtyRef.current.size === 0) return true;
    for (let i = 0; i < 40 && savingRef.current; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (savingRef.current) return false;

    savingRef.current = true;
    setSaveState("saving");

    const ids = [...dirtyRef.current];
    const successes = [];
    let failed = false;

    for (const attributeId of ids) {
      const item = findItem(attributeId);
      if (!item) continue;
      try {
        const result = await profileApiRef.current(`/api/profile/attributes/${attributeId}`, {
          method: "PUT",
          body: {
            value: draftsRef.current[attributeId],
            version: item.valueVersion,
          },
        });
        successes.push({ attributeId, result });
      } catch (err) {
        failed = true;
        setError(err.message);
        setSaveState("error");
      }
    }

    if (successes.length) {
      setProfile((previous) => {
        function update(items) {
          return items.map((item) => {
            const saved = successes.find(
              (entry) => entry.attributeId === item.attribute.id
            );
            return saved
              ? {
                  ...item,
                  value: saved.result.value,
                  valueVersion: saved.result.version,
                }
              : item;
          });
        }
        const next = { ...previous, me: update(previous.me), info: update(previous.info) };
        profileRef.current = next;
        return next;
      });
      if (!editingOther) {
        for (const { attributeId, result } of successes) {
          const item = findItem(attributeId);
          if (item?.attribute?.name === "Personal Photo") {
            updateLocalAvatar(
              typeof result.value === "string" && result.value ? result.value : null
            );
          }
          if (
            item?.attribute?.name === "First Name" ||
            item?.attribute?.name === "Last Name"
          ) {
            updateLocalName(currentDisplayName());
          }
        }
      }
      setDirtyIds((previous) => {
        const next = new Set(previous);
        successes.forEach(({ attributeId }) => next.delete(attributeId));
        dirtyRef.current = next;
        return next;
      });
      if (!failed && successes.length === ids.length) setSaveState("saved");
    }
    savingRef.current = false;
    return !failed;
  }, [accessToken, editingOther, updateLocalAvatar, updateLocalName]);

  useEffect(() => {
    const intervalId = setInterval(saveDirty, 7000);
    return () => clearInterval(intervalId);
  }, [saveDirty]);

  useEffect(() => {
    function flush() {
      if (dirtyRef.current.size) void saveDirty();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [saveDirty]);

  function changeValue(attributeId, value) {
    setDrafts((previous) => ({ ...previous, [attributeId]: value }));
    setDirtyIds((previous) => new Set(previous).add(attributeId));
    setSaveState("dirty");
  }

  async function addInfo(attributeId) {
    if (!attributeId) return;
    try {
      await profileApi(`/api/profile/attributes/${attributeId}`, {
        method: "PUT",
        body: { value: null, version: null },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeInfo(attributeId) {
    try {
      await profileApi(`/api/profile/attributes/${attributeId}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const availableToAdd = useMemo(() => {
    if (!profile) return [];
    const selected = new Set(profile.info.map((item) => item.attribute.id));
    return profile.availableInfo.filter((attribute) => !selected.has(attribute.id));
  }, [profile]);

  const selectedProject = profile?.projects.find(
    (project) => project.id === selectedProjectId
  );

  const displayName = useMemo(() => {
    if (!profile) return null;
    return getDisplayNameFromItems([...profile.me, ...profile.info], drafts);
  }, [profile, drafts]);

  async function deleteProject() {
    if (!selectedProjectId) return;
    try {
      await profileApi(`/api/profile/projects/${selectedProjectId}`, {
        method: "DELETE",
      });
      setSelectedProjectId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return {
    user,
    accessToken,
    adminUserId,
    editingOther,
    profile,
    error,
    activeTab,
    setActiveTab,
    drafts,
    dirtyIds,
    saveState,
    saveDirty,
    changeValue,
    addInfo,
    removeInfo,
    availableToAdd,
    addAttributeId,
    setAddAttributeId,
    projectModal,
    setProjectModal,
    editingProject,
    setEditingProject,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    displayName,
    deleteProject,
    load,
  };
}
