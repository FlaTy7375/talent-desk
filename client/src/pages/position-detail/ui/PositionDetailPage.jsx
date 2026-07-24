import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import LoadingState from "../../../shared/ui/LoadingState";
import UserAvatar from "../../../entities/user/ui/UserAvatar";
import { attributeLabel, enumLabel } from "../../../shared/i18n/labels";

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

  function exportCsv() {
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

  if (error && !position) return <div className="alert alert-danger">{error}</div>;
  if (!position) return <LoadingState rows={4} />;

  return (
    <div className="position-detail">
      <Link to="/positions" className="back-link">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        {t("discussion.back")}
      </Link>

      <header className="position-hero">
        <span className="position-hero__logo">
          {position.imageUrl ? (
            <img src={position.imageUrl} alt="" />
          ) : (
            (position.company || position.title).charAt(0).toUpperCase()
          )}
        </span>
        <div className="position-hero__content">
          <span className="position-hero__company">{position.company || "—"}</span>
          <h1>{position.title}</h1>
          <p className="position-hero__description">
            {position.shortDescription || t("positions.noDescription")}
          </p>
          <div className="position-meta">
            {position.level && (
              <span>
                <i className="bi bi-bar-chart" aria-hidden="true" />
                {enumLabel(t, "positionLevels", position.level)}
              </span>
            )}
            <span>
              <i className="bi bi-file-earmark-person" aria-hidden="true" />
              {position.cvCount} {t("common.cv")}
            </span>
            {manager && (
              <span
                title={
                  position.isPublic ? t("positions.public") : t("positions.restricted")
                }
              >
                <i
                  className={`bi ${position.isPublic ? "bi-globe2" : "bi-lock"}`}
                  aria-hidden="true"
                />
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="position-layout">
        <main className="position-main">
          {manager && (
            <section className="position-section">
              <div className="position-section__heading">
                <span>
                  <i className="bi bi-people" aria-hidden="true" />
                  <h2>{t("discussion.submittedCvs")}</h2>
                </span>
                <div className="d-flex align-items-center gap-2">
                  <span className="count-badge">{cvs.length}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={!cvs.length}
                    onClick={exportCsv}
                  >
                    <i className="bi bi-filetype-csv" aria-hidden="true" />
                    {t("positions.exportCsv")}
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover position-cv-table">
                  <thead>
                    <tr>
                      <th>{t("discussion.candidate")}</th>
                      <th>{t("discussion.updated")}</th>
                      <th>{t("discussion.likes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!cvs.length ? (
                      <tr>
                        <td colSpan={3} className="text-body-secondary">
                          {t("discussion.noCvs")}
                        </td>
                      </tr>
                    ) : (
                      cvs.map((cv) => (
                        <tr key={cv.id}>
                          <td>
                            <div className="candidate-cell">
                              <UserAvatar
                                url={cv.candidate.avatarUrl}
                                name={cv.candidate.name}
                                email={cv.candidate.email}
                              />
                              <div>
                                <Link to={`/users/${cv.candidate.id}`}>
                                  {cv.candidate.name || cv.candidate.email}
                                </Link>
                                <small>
                                  <Link to={`/cvs/${cv.id}`}>{t("positions.openCv")}</Link>
                                  {cv.candidate.name ? ` · ${cv.candidate.email}` : null}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <time className="date-badge" dateTime={cv.updatedAt}>
                              <i className="bi bi-clock" aria-hidden="true" />
                              {new Date(cv.updatedAt).toLocaleDateString()}
                            </time>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`likes-badge likes-badge--button ${
                                cv.likedByMe ? "is-liked" : ""
                              }`}
                              onClick={() => toggleCvLike(cv)}
                              disabled={likingId === cv.id}
                              aria-pressed={Boolean(cv.likedByMe)}
                              title={cv.likedByMe ? t("cv.unlike") : t("cv.like")}
                            >
                              <i
                                className={`bi ${
                                  cv.likedByMe ? "bi-heart-fill" : "bi-heart"
                                }`}
                                aria-hidden="true"
                              />
                              {cv.likes ?? 0}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="position-section discussion-section">
            <div className="position-section__heading">
              <span>
                <i className="bi bi-chat-left-text" aria-hidden="true" />
                <h2>{t("discussion.title")}</h2>
              </span>
              <span className="count-badge">{posts.length}</span>
            </div>

            <div className="discussion-list">
              {!posts.length ? (
                <div className="discussion-empty">
                  <i className="bi bi-chat" aria-hidden="true" />
                  <span>{t("discussion.empty")}</span>
                </div>
              ) : (
                posts.map((post) => (
                  <article className="discussion-post" key={post.id}>
                    <UserAvatar
                      className="discussion-post__avatar"
                      url={post.author.avatarUrl}
                      name={post.author.name}
                      email={post.author.email}
                    />
                    <div>
                      <header>
                        <strong>
                          {manager && post.author?.id ? (
                            <Link to={`/users/${post.author.id}`}>
                              {post.author.name || post.author.email}
                            </Link>
                          ) : (
                            post.author.name || post.author.email
                          )}
                        </strong>
                        <time>{new Date(post.createdAt).toLocaleString()}</time>
                      </header>
                      <ReactMarkdown>{post.body}</ReactMarkdown>
                    </div>
                  </article>
                ))
              )}
            </div>

            {user ? (
              <form className="discussion-form" onSubmit={submit}>
                <div className="markdown-field">
                  <div className="markdown-field__pane">
                    <label className="markdown-field__label" htmlFor="discussion-body">
                      <i className="bi bi-markdown" aria-hidden="true" />
                      {t("discussion.newPost")}
                    </label>
                    <textarea
                      id="discussion-body"
                      className="form-control"
                      rows={4}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={t("discussion.markdown")}
                      required
                    />
                  </div>
                  <div className="markdown-field__pane markdown-field__pane--preview">
                    <div className="markdown-field__label">
                      <i className="bi bi-eye" aria-hidden="true" />
                      {t("profile.markdown.preview")}
                    </div>
                    <div className="markdown-preview">
                      {body ? (
                        <ReactMarkdown>{body}</ReactMarkdown>
                      ) : (
                        <span className="markdown-preview__empty">
                          {t("profile.markdown.emptyPreview")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  <i className="bi bi-send" aria-hidden="true" />
                  {sending ? "…" : t("discussion.send")}
                </button>
              </form>
            ) : (
              <div className="guest-discussion">
                <i className="bi bi-lock" aria-hidden="true" />
                <span>{t("discussion.signInPrompt")}</span>
                <Link className="btn btn-primary btn-sm" to="/login">
                  <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                  {t("nav.login")}
                </Link>
              </div>
            )}
          </section>
        </main>

        <aside className="position-sidebar">
          <section className="position-side-card">
            <h2>{t("positions.templateData")}</h2>
            <dl>
              <div>
                <dt>{t("positions.fields.maxProjects")}</dt>
                <dd>{position.maxProjects}</dd>
              </div>
              <div>
                <dt>{t("positions.attributesCount")}</dt>
                <dd>{position.attributes.length}</dd>
              </div>
              <div>
                <dt>{t("common.cv")}</dt>
                <dd>{position.cvCount}</dd>
              </div>
            </dl>
          </section>

          <section className="position-side-card">
            <h2>{t("positions.fields.attributes")}</h2>
            <div className="detail-badges">
              {position.attributes.map((attribute) => (
                <span key={attribute.id}>
                  <i className="bi bi-check2" aria-hidden="true" />
                  {attributeLabel(t, attribute)}
                </span>
              ))}
            </div>
          </section>

          {position.projectTags?.length > 0 && (
            <section className="position-side-card">
              <h2>{t("positions.fields.tags")}</h2>
              <div className="tag-badges">
                {position.projectTags.map((tag) => (
                  <span className="tag-badge" key={tag.id}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
