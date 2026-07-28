import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

export default function TextField({ value, onChange, disabled, id }) {
  const { t } = useTranslation();

  return (
    <div className="markdown-field">
      <div className="markdown-field__pane">
        <div className="markdown-field__label">
          <i className="bi bi-markdown" aria-hidden="true" />
          {t("profile.markdown.editor")}
        </div>
        <textarea
          className="form-control"
          id={id}
          rows={5}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("profile.markdown.placeholder")}
          disabled={disabled}
        />
      </div>
      <div className="markdown-field__pane markdown-field__pane--preview">
        <div className="markdown-field__label">
          <i className="bi bi-eye" aria-hidden="true" />
          {t("profile.markdown.preview")}
        </div>
        <div className="markdown-preview">
          {value ? (
            <ReactMarkdown>{String(value)}</ReactMarkdown>
          ) : (
            <span className="markdown-preview__empty">
              {t("profile.markdown.emptyPreview")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
