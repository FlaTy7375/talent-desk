import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../features/auth";
import { apiFetch } from "../../../shared/api/api";
import PositionFormModal from "../../../features/position-form/ui/PositionFormModal";
import LoadingState from "../../../shared/ui/LoadingState";
import { enumLabel } from "../../../shared/i18n/labels";

export default function PositionsPage() {
  const { t } = useTranslation();
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
    if (!window.confirm(t("positions.confirmDelete", { count: selected.length }))) return;
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

  const filters = [
    { id: "all", label: t("positions.filters.all"), count: filterCounts.all },
    {
      id: "public",
      label: t("positions.public"),
      count: filterCounts.public,
    },
    {
      id: "restricted",
      label: t("positions.restricted"),
      count: filterCounts.restricted,
    },
  ];

  return (
    <div
      className={`positions-board${canSelect ? " positions-board--selectable" : ""}${
        canManage ? " positions-board--manage" : " positions-board--browse"
      }`}
    >
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
              <p>{focusedPosition.shortDescription}</p>
            )}
          </div>
        )}

        {canManage && (
          <>
            <div className="positions-board__spacer" aria-hidden="true" />
            <div className="positions-board__actions">
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                <i className="bi bi-plus-lg" aria-hidden="true" />
                {t("positions.create")}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={selected.length !== 1}
                onClick={openEdit}
              >
                <i className="bi bi-pencil" aria-hidden="true" />
                {t("positions.edit")}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={selected.length !== 1}
                onClick={duplicate}
              >
                <i className="bi bi-copy" aria-hidden="true" />
                {t("positions.duplicate")}
              </button>
              <button
                type="button"
                className="btn btn-outline-danger"
                disabled={!selected.length}
                onClick={remove}
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
                onClick={createOrOpenCv}
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

      <section className="positions-board__main">
        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <LoadingState rows={6} />
        ) : (
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
                {!filteredPositions.length ? (
                  <tr>
                    <td colSpan={(canSelect ? 5 : 4) + (canManage ? 1 : 0)}>
                      <div className="positions-board__empty">
                        <i className="bi bi-briefcase" aria-hidden="true" />
                        <span>{t("positions.empty")}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((position) => (
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
                      onClick={() => toggle(position.id)}
                    >
                      {canSelect && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.has(position.id)}
                            onChange={() => toggle(position.id)}
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
        )}
      </section>

      {canManage && (
        <PositionFormModal
          show={showForm}
          initial={editing}
          attributes={attributes}
          token={accessToken}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
