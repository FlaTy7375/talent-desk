import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { enumLabel } from "../../../shared/i18n/labels";

export default function PositionsSidebar({
  canManage,
  canCreateCv,
  accessFilter,
  setAccessFilter,
  filters,
  filteredPositions,
  levelCounts,
  focusedPosition,
  selected,
  onOpenCreate,
  onOpenEdit,
  onDuplicate,
  onRemove,
  onCreateOrOpenCv,
}) {
  const { t } = useTranslation();

  return (
    <aside className="positions-board__rail">
      <div className="positions-board__intro">
        <p className="positions-board__kicker">{t("positions.kicker")}</p>
        <h1>{t("positions.title")}</h1>
        <p>{t(canManage ? "positions.subtitle" : "positions.subtitleBrowse")}</p>
      </div>

      {canManage && (
        <div className="positions-board__filters" role="tablist" aria-label={t("positions.access")}>
          {filters.map((filter) => (
            <button
              type="button"
              key={filter.id}
              role="tab"
              aria-selected={accessFilter === filter.id}
              className={accessFilter === filter.id ? "is-active" : undefined}
              onClick={() => setAccessFilter(filter.id)}
            >
              <span>{filter.label}</span>
              <strong>{filter.count}</strong>
            </button>
          ))}
        </div>
      )}

      {!canManage && (
        <div className="positions-board__guide">
          <div className="positions-board__stat">
            <strong>{filteredPositions.length}</strong>
            <span>{t("positions.openings")}</span>
          </div>
          <ul className="positions-board__levels">
            {["JUNIOR", "MIDDLE", "SENIOR", "C_LEVEL"].map((level) => (
              <li key={level}>
                <span>{enumLabel(t, "positionLevels", level)}</span>
                <strong>{levelCounts[level]}</strong>
              </li>
            ))}
          </ul>
          <ol>
            {(canCreateCv
              ? ["pick", "create", "publish"]
              : ["browse", "signIn", "apply"]
            ).map((step) => (
              <li key={step}>{t(`positions.guide.${step}`)}</li>
            ))}
          </ol>
        </div>
      )}

      {focusedPosition && (
        <div className="positions-board__focus">
          <p className="positions-board__focus-label">{t("positions.selectedFocus")}</p>
          <strong>{focusedPosition.title}</strong>
          <small>
            {focusedPosition.company || "—"}
            {" · "}
            {enumLabel(t, "positionLevels", focusedPosition.level)}
          </small>
          {focusedPosition.shortDescription && (
            <p
              className="positions-board__focus-desc"
              title={focusedPosition.shortDescription}
            >
              {focusedPosition.shortDescription}
            </p>
          )}
        </div>
      )}

      {canManage && (
        <>
          <div className="positions-board__spacer" aria-hidden="true" />
          <div className="positions-board__actions">
            <button type="button" className="btn btn-primary" onClick={onOpenCreate}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              {t("positions.create")}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={selected.length !== 1}
              onClick={onOpenEdit}
            >
              <i className="bi bi-pencil" aria-hidden="true" />
              {t("positions.edit")}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={selected.length !== 1}
              onClick={onDuplicate}
            >
              <i className="bi bi-copy" aria-hidden="true" />
              {t("positions.duplicate")}
            </button>
            <button
              type="button"
              className="btn btn-outline-danger"
              disabled={!selected.length}
              onClick={onRemove}
            >
              <i className="bi bi-trash3" aria-hidden="true" />
              {t("positions.delete")}
              {selected.length > 0 && (
                <span className="count-badge">{selected.length}</span>
              )}
            </button>
            {selected.length > 0 && (
              <p className="positions-board__selection">
                {t("positions.selected", { count: selected.length })}
              </p>
            )}
          </div>
        </>
      )}

      {canCreateCv && (
        <div className="positions-board__pin">
          <div className="positions-board__cta">
            <p>
              {focusedPosition
                ? t("positions.createCvReady")
                : t("positions.createCvHint")}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!focusedPosition}
              onClick={onCreateOrOpenCv}
            >
              <i className="bi bi-file-earmark-person" aria-hidden="true" />
              {focusedPosition?.existingCv
                ? t("positions.openCv")
                : t("positions.createCv")}
            </button>
          </div>
        </div>
      )}

      {!canManage && !canCreateCv && (
        <div className="positions-board__pin">
          <div className="positions-board__cta">
            <p>{t("positions.guestHint")}</p>
            <Link className="btn btn-primary" to="/login">
              <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
              {t("nav.login")}
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
