import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import UserAvatar from "../../../entities/user/ui/UserAvatar";

export default function DiscussionSection({ posts, user, manager, body, sending, onBodyChange, onSubmit }) {
  const { t } = useTranslation();

  return (
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
        <form className="discussion-form" onSubmit={onSubmit}>
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
                onChange={(e) => onBodyChange(e.target.value)}
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
  );
}
