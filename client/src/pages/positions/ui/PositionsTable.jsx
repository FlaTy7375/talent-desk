import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { enumLabel } from "../../../shared/i18n/labels";

export default function PositionsTable({
  positions,
  selectedIds,
  canSelect,
  canManage,
  onToggle,
}) {
  const { t } = useTranslation();

  return (
    <div className="positions-board__table-wrap">
      <table className="positions-board-table">
        <thead>
          <tr>
            {canSelect && <th scope="col" aria-label="select" />}
            <th scope="col">{t("positions.fields.title")}</th>
            <th scope="col">{t("positions.fields.level")}</th>
            {canManage && <th scope="col">{t("positions.access")}</th>}
            <th scope="col">{t("positions.attributesCount")}</th>
            <th scope="col">{t("common.cv")}</th>
          </tr>
        </thead>
        <tbody>
          {!positions.length ? (
            <tr>
              <td colSpan={(canSelect ? 5 : 4) + (canManage ? 1 : 0)}>
                <div className="positions-board__empty">
                  <i className="bi bi-briefcase" aria-hidden="true" />
                  <span>{t("positions.empty")}</span>
                </div>
              </td>
            </tr>
          ) : (
            positions.map((position) => (
              <tr
                key={position.id}
                className={[
                  selectedIds.has(position.id) ? "is-selected" : "",
                  canManage
                    ? position.isPublic
                      ? "is-public"
                      : "is-restricted"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onToggle(position.id)}
              >
                {canSelect && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedIds.has(position.id)}
                      onChange={() => onToggle(position.id)}
                    />
                  </td>
                )}
                <td>
                  <div className="positions-board-job">
                    <span className="positions-board-job__mark" aria-hidden="true">
                      {position.imageUrl ? (
                        <img src={position.imageUrl} alt="" />
                      ) : (
                        (position.company || position.title).charAt(0).toUpperCase()
                      )}
                    </span>
                    <div>
                      <Link
                        to={`/positions/${position.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {position.title}
                      </Link>
                      <small
                        title={
                          [
                            position.company || "—",
                            position.shortDescription || "",
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        }
                      >
                        {position.company || "—"}
                        {position.shortDescription
                          ? ` · ${position.shortDescription}`
                          : ""}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="positions-board-level">
                    {enumLabel(t, "positionLevels", position.level)}
                  </span>
                </td>
                {canManage && (
                  <td>
                    <span
                      className={`positions-board-access ${
                        position.isPublic ? "is-public" : "is-restricted"
                      }`}
                      title={
                        position.isPublic
                          ? t("positions.public")
                          : t("positions.restricted")
                      }
                    >
                      <i
                        className={`bi ${
                          position.isPublic ? "bi-globe2" : "bi-lock"
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </td>
                )}
                <td>
                  <span className="positions-board-metric">
                    {position.attributes?.length || 0}
                  </span>
                </td>
                <td>
                  <span className="positions-board-metric is-accent">
                    {position.cvCount || 0}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
