import { useLanguage } from "../i18n/useLanguage.js";
import { parseLocalDate } from "../domain/dates.js";
import Card from "./Card.jsx";
import WeekdayStrip from "./WeekdayStrip.jsx";

export default function WeeklyProgressCard({ progress, error }) {
  const { t, locale } = useLanguage();
  const weekLabel = progress
    ? [progress.weekStart, progress.weekEnd]
        .map((date) =>
          parseLocalDate(date).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        )
        .join(" – ")
    : "";
  return (
    <Card className="weekly-progress" aria-labelledby="progress-heading">
      <h2 id="progress-heading">{t("Weekly progress")}</h2>
      {!progress ? (
        <p className="card__description" role="status">
          {error
            ? t(
                "Weekly progress is unavailable until your schedule can be loaded and saved.",
              )
            : t("Loading weekly progress…")}
        </p>
      ) : (
        <>
          <p className="weekly-progress__dates">{weekLabel}</p>
          <div
            className="weekly-progress__summary"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="weekly-progress__number">
              <span aria-hidden="true">
                {progress.completed} / {progress.scheduled}
              </span>
              <span className="sr-only">
                {t("{completed} of {scheduled}", {
                  completed: progress.completed,
                  scheduled: progress.scheduled,
                })}
              </span>
            </p>
            <p className="card__description">{t("workouts completed")}</p>
            <p className="weekly-progress__consistency">
              {progress.consistency === null
                ? t("No workouts scheduled")
                : t("{percent}% consistency", {
                    percent: progress.consistency,
                  })}
            </p>
          </div>
          <WeekdayStrip days={progress.days} />
          <ul
            className="weekly-progress__legend"
            aria-label={t("Workout state symbols")}
          >
            <li>
              <span data-state="completed" aria-hidden="true">
                ✓
              </span>
              {t("Completed")}
            </li>
            <li>
              <span data-state="missed" aria-hidden="true">
                ×
              </span>
              {t("Missed")}
            </li>
            <li>
              <span data-state="pending" aria-hidden="true">
                ○
              </span>
              {t("Pending")}
            </li>
            <li>
              <span aria-hidden="true">·</span>
              {t("Future")}
            </li>
            <li>
              <span aria-hidden="true">—</span>
              {t("Rest / not tracked")}
            </li>
          </ul>
        </>
      )}
    </Card>
  );
}
