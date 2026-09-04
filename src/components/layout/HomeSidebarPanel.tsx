import { useMemo } from "react";
import { useEditorStore } from "../../store/editorStore";
import { computeProjectStats } from "../../utils/projectStats";
import edutestLogo from "../../assets/edutest-logo.png";
import PreparePaperButton from "../forms/PreparePaperButton";
import SidebarActionButtons from "./SidebarActionButtons";

function LayoutDeskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export default function HomeSidebarPanel() {
  const questions = useEditorStore((s) => s.questions);
  const stats = useMemo(() => computeProjectStats(questions), [questions]);

  return (
    <>
      <div className="tq-dash-panel tq-dash-panel--scroll">
      <section className="tq-dash-section tq-dash-section--brand">
        <div className="tq-dash-brand">
          <div className="tq-dash-logo-orbit">
            <span className="tq-dash-logo-ring" aria-hidden />
            <div className="tq-dash-logo-disc">
              <img src={edutestLogo} alt="EduTest" className="tq-dash-logo" />
              <span className="tq-dash-logo__shine" aria-hidden />
            </div>
          </div>
          <blockquote className="tq-dash-slogan">
            <p className="tq-dash-slogan__text">Kendi testinin mimarı ol, farkını ortaya koy!</p>
          </blockquote>
        </div>
      </section>

      <section className="tq-dash-section tq-dash-section--stats">
        <div className="tq-dash-section-heading">
          <span className="tq-dash-section-heading__line" aria-hidden />
          <h3 className="tq-dash-section-heading__title">Test Bilgisi</h3>
          <span className="tq-dash-section-heading__line tq-dash-section-heading__line--right" aria-hidden />
        </div>
        <div className="tq-dash-stats">
          <div className="tq-dash-stat">
            <span className="tq-dash-stat__value tq-dash-stat__value--total">{stats.total}</span>
            <span className="tq-dash-stat__label">Toplam Soru</span>
          </div>
          <div className="tq-dash-stat">
            <span className="tq-dash-stat__value tq-dash-stat__value--answered">{stats.answered}</span>
            <span className="tq-dash-stat__label">Cevaplanmış</span>
          </div>
          <div className="tq-dash-stat">
            <span className="tq-dash-stat__value tq-dash-stat__value--unanswered">{stats.unanswered}</span>
            <span className="tq-dash-stat__label">Cevapsız</span>
          </div>
          <div className="tq-dash-stat">
            <span className="tq-dash-stat__value tq-dash-stat__value--group">{stats.testGroups}</span>
            <span className="tq-dash-stat__label">Test Grubu</span>
          </div>
        </div>
      </section>

      <SidebarActionButtons />
      </div>

      <section className="tq-dash-section tq-dash-section--prepare tq-dash-panel__footer">
        <PreparePaperButton variant="dash">
          <LayoutDeskIcon />
        </PreparePaperButton>
      </section>
    </>
  );
}
