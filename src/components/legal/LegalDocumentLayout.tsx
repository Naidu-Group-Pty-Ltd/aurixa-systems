import { useEffect, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { HeroBackground } from "../HeroBackgrounds";
import { useRouteMetadata } from "../../lib/pageMetadata";
import type { LegalDocumentKind, LegalSectionDefinition } from "../../lib/legal";
import { LegalDocumentMeta } from "./LegalDocumentMeta";
import { LegalHeroVisual } from "./LegalHeroVisual";
import { PrivacyLifecycleVisual } from "./PrivacyLifecycleVisual";
import { LegalTableOfContents } from "./LegalTableOfContents";
import { LegalSection } from "./LegalSection";
import { LegalChapterHeader } from "./LegalChapterHeader";
import { LEGAL_CHAPTERS, LEGAL_THEMES } from "./legalChapters";

type Props = { kind: LegalDocumentKind; eyebrow: string; title: string; introduction: string; summary: ReactNode; summaryTitle?: string; caption: string; sections: LegalSectionDefinition[]; related: { label: string; to: string }[] };
export function LegalDocumentLayout(props: Props) {
  // Title and description used to be props duplicated at each call site. Both
  // legal routes are in the route registry, so the path is enough — and the
  // sitemap, the canonical tag and the tab title can no longer disagree.
  useRouteMetadata(useLocation().pathname);
  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const page = document.querySelector<HTMLElement>(`.legal-page--${props.kind}`);
      if (!page) return;
      const distance = Math.max(1, page.offsetHeight - window.innerHeight);
      const progress = Math.min(100, Math.max(0, ((window.scrollY - page.offsetTop) / distance) * 100));
      page.style.setProperty("--page-progress", `${progress}%`);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(updateProgress); };
    updateProgress();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); if (frame) window.cancelAnimationFrame(frame); };
  }, [props.kind]);
  const chapters = LEGAL_CHAPTERS[props.kind];
  return <div className={`marketing-page legal-page legal-page--${props.kind} w-full bg-marketing-page`}>
    <div className="legal-mobile-progress" aria-hidden="true" />
    <header className="legal-hero">
      <HeroBackground variant="platform" />
      <div className="legal-container legal-hero__grid">
        <div className="legal-hero__copy relative z-10"><div className="legal-eyebrow"><span/>{props.eyebrow}</div><h1>{props.title}</h1><p>{props.introduction}</p><div className="legal-hero__theme"><i aria-hidden="true" />{LEGAL_THEMES[props.kind]}</div></div>
        {props.kind === "privacy" ? <PrivacyLifecycleVisual/> : <LegalHeroVisual kind={props.kind} caption={props.caption}/>}
      </div>
    </header>
    <main className="legal-main">
      <div className="legal-container"><LegalDocumentMeta kind={props.kind}/><section className="legal-summary" aria-labelledby="document-summary"><div className="legal-summary__index" aria-hidden="true">00</div><div className="legal-summary__content"><p className="legal-eyebrow">Document overview</p><h2 id="document-summary">{props.summaryTitle ?? "A clear framework for responsible use."}</h2><div>{props.summary}</div></div><div className="legal-summary__signal" aria-hidden="true"><i/><i/><i/><span/></div></section>
        <div className="legal-document-grid"><LegalTableOfContents kind={props.kind} sections={props.sections}/><article className="legal-document">{chapters.map((chapter, chapterIndex) => <section className="legal-chapter-group" key={chapter.title} aria-labelledby={`chapter-${chapterIndex + 1}`}><LegalChapterHeader kind={props.kind} number={chapterIndex} title={chapter.title}/><div>{props.sections.slice(chapter.start, chapter.end).map((section, offset) => <div key={section.id}><LegalSection kind={props.kind} section={section} index={chapter.start + offset}/></div>)}</div></section>)}</article></div>
        <section className="legal-related" aria-labelledby="related-governance"><div><p className="legal-eyebrow">Connected governance</p><h2 id="related-governance">Related documents and enquiries</h2></div><div>{props.related.map((item, index) => <Link key={item.to} to={item.to}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}<ArrowRight aria-hidden="true"/></Link>)}</div></section>
        <Link to="/compliance" className="legal-back"><ArrowLeft aria-hidden="true"/> Back to Compliance</Link>
      </div>
    </main>
  </div>;
}
