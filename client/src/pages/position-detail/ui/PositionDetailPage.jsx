import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import LoadingState from "../../../shared/ui/LoadingState";
import PositionHero from "./PositionHero";
import CvListSection from "./CvListSection";
import DiscussionSection from "./DiscussionSection";
import PositionSidebar from "./PositionSidebar";

function exportCsv(cvs, position, id) {
  const escape = (value) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const rows = [
    ["name", "email", "likes", "updatedAt", "position"].map(escape).join(","),
    ...cvs.map((cv) =>
      [
        cv.candidate?.name || "",
        cv.candidate?.email || "",
        cv.likes ?? 0,
        cv.updatedAt || "",
        position?.title || "",
      ]
        .map(escape)
        .join(",")
    ),
  ];
  const blob = new Blob(["\uFEFF" + rows.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `position-${id}-cvs.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PositionDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user, accessToken } = useAuth();
  const manager = user?.role === "RECRUITER" || user?.role === "ADMIN";

  const [position, setPosition] = useState(null);
  const [posts, setPosts] = useState([]);
  const [cvs, setCvs] = useState([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [likingId, setLikingId] = useState(null);

  const loadPosts = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await apiFetch(`/api/positions/${id}/discussion`, {
        token: accessToken,
      });
      setPosts(data.posts || []);
    } catch (err) {
      if (err.status === 401) return;
      setError(err.message);
    }
  }, [id, accessToken]);

  useEffect(() => {
    async function initialLoad() {
      try {
        const requests = [
          apiFetch(`/api/positions/${id}/view`, {
            token: accessToken || undefined,
          }),
          accessToken
            ? apiFetch(`/api/positions/${id}/discussion`, { token: accessToken })
            : Promise.resolve({ posts: [] }),
        ];
        if (manager) {
          requests.push(apiFetch(`/api/cvs/position/${id}`, { token: accessToken }));
        }
        const [positionData, postData, cvData] = await Promise.all(requests);
        setPosition(positionData.position);
        setPosts(postData.posts || []);
        setCvs(cvData?.cvs || []);
      } catch (err) {
        setError(err.message);
      }
    }
    initialLoad();
  }, [id, accessToken, manager]);

  useEffect(() => {
    if (!accessToken) return undefined;
    const timer = setInterval(loadPosts, 3000);
    return () => clearInterval(timer);
  }, [loadPosts, accessToken]);

  async function submit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/api/positions/${id}/discussion`, {
        method: "POST",
        token: accessToken,
        body: { body },
      });
      setBody("");
      await loadPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function toggleCvLike(cv) {
    if (!accessToken || !manager || likingId) return;
    const currentlyLiked = Boolean(cv.likedByMe);
    const previousLikes = cv.likes ?? 0;
    const optimistic = {
      likedByMe: !currentlyLiked,
      likes: Math.max(0, previousLikes + (currentlyLiked ? -1 : 1)),
    };
    setLikingId(cv.id);
    setCvs((previous) =>
      previous.map((item) => (item.id === cv.id ? { ...item, ...optimistic } : item))
    );
    try {
      const data = await apiFetch(`/api/cvs/${cv.id}/like`, {
        method: currentlyLiked ? "DELETE" : "POST",
        token: accessToken,
      });
      setCvs((previous) =>
        previous.map((item) =>
          item.id === cv.id
            ? { ...item, likedByMe: data.liked, likes: data.likes }
            : item
        )
      );
    } catch (err) {
      setCvs((previous) =>
        previous.map((item) =>
          item.id === cv.id
            ? { ...item, likedByMe: currentlyLiked, likes: previousLikes }
            : item
        )
      );
      setError(err.message);
    } finally {
      setLikingId(null);
    }
  }

  if (error && !position) return <div className="alert alert-danger">{error}</div>;
  if (!position) return <LoadingState rows={4} />;

  return (
    <div className="position-detail">
      <Link to="/positions" className="back-link">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        {t("discussion.back")}
      </Link>

      <PositionHero position={position} manager={manager} />

      <div className="position-layout">
        <main className="position-main">
          {manager && (
            <CvListSection
              cvs={cvs}
              position={position}
              likingId={likingId}
              onToggleLike={toggleCvLike}
              onExportCsv={() => exportCsv(cvs, position, id)}
            />
          )}

          <DiscussionSection
            posts={posts}
            user={user}
            manager={manager}
            body={body}
            sending={sending}
            onBodyChange={setBody}
            onSubmit={submit}
          />
        </main>

        <PositionSidebar position={position} />
      </div>
    </div>
  );
}
