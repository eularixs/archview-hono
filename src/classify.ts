// Layer + module classification from package/folder naming (port of the Go logic).
const KEYWORDS: Record<string, string[]> = {
  controller: ["controller", "controllers", "handler", "handlers", "route", "routes", "delivery", "rest", "transport", "graphql", "web", "interface", "interfaces", "api"],
  service: ["service", "services", "usecase", "usecases", "use_case", "interactor", "interactors", "application", "logic", "core"],
  repository: ["repository", "repositories", "repo", "repos", "store", "stores", "dao", "persistence", "gateway", "db", "database", "prisma", "drizzle", "postgres", "postgresql", "mysql", "mongo", "mongodb", "sqlite", "supabase"],
};
const GENERIC = new Set(["modules", "module", "internal", "app", "pkg", "src", "cmd", "features", "feature", "components", "component", "domain", "adapter", "adapters", "port", "ports", "inbound", "outbound", "infra", "infrastructure", "lib"]);

export class Classifier {
  private kw: Record<string, string[]>;
  constructor(extra?: Record<string, string[]>) {
    this.kw = { controller: [...KEYWORDS.controller], service: [...KEYWORDS.service], repository: [...KEYWORDS.repository] };
    if (extra) for (const [l, ks] of Object.entries(extra)) this.kw[l] = [...(this.kw[l] ?? []), ...ks];
  }
  classify(pkgPath: string): { layer: string; module: string } {
    const segs = pkgPath.split("/").filter(Boolean);
    for (let i = segs.length - 1; i >= 0; i--) {
      const m = this.matchLayer(segs[i].toLowerCase());
      if (m) {
        if (m.base) return { layer: m.layer, module: m.base };
        return { layer: m.layer, module: moduleFor(segs, i) };
      }
    }
    return { layer: "other", module: moduleFor(segs, segs.length) };
  }
  private matchLayer(seg: string): { layer: string; base: string } | null {
    for (const [layer, ks] of Object.entries(this.kw)) {
      for (const k of ks) {
        if (seg === k) return { layer, base: "" };
        if (seg.endsWith(k) && seg.length > k.length) return { layer, base: seg.slice(0, seg.length - k.length).replace(/[_\-.]+$/, "") };
      }
    }
    return null;
  }
}
function fromPrev(segs: string[], i: number): string { for (let j = i - 1; j >= 0; j--) { const s = segs[j].toLowerCase(); if (s && !GENERIC.has(s)) return segs[j]; } return ""; }
function fromNext(segs: string[], i: number): string { for (let j = i + 1; j < segs.length; j++) { const s = segs[j].toLowerCase(); if (s && !GENERIC.has(s)) return segs[j]; } return ""; }
function moduleFor(segs: string[], i: number): string {
  const p = fromPrev(segs, i); if (p) return p;
  const n = fromNext(segs, i); if (n) return n;
  if (i - 1 >= 0) return segs[i - 1];
  if (i + 1 < segs.length) return segs[i + 1];
  return "";
}
