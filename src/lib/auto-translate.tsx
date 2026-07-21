import { useEffect, useRef, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { usePrefs, type Lang } from "./preferences";
import { translateBatch } from "./translate.functions";

/**
 * Auto-translate any English text nodes / placeholders / titles / aria-labels
 * to the active language (fr/ar) using Lovable AI, with a persistent
 * localStorage cache so we only pay per unique phrase once.
 */

const CACHE_VERSION = "v1";
const cacheKey = (lang: Lang) => `atlas.i18n.${lang}.${CACHE_VERSION}`;

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "KBD", "SAMP", "TEXTAREA", "INPUT", "SVG", "PATH", "CANVAS", "IFRAME",
]);
const ATTR_TARGETS = ["placeholder", "title", "aria-label"] as const;

// Skip strings that shouldn't be translated: pure numbers, URLs, emails, single symbols, brand-only, currency codes
const SKIP_RE = /^(?:\s*|[\d\s.,:%/+\-–—×x]+|https?:\/\/\S+|[\w.+-]+@[\w.-]+\.\w+|[.·•●○◆▪️→←↑↓★☆…]+)$/;
// Detect if a string plausibly contains English letters (heuristic — otherwise assume translated)
const HAS_LATIN = /[A-Za-z]{2,}/;
const HAS_ARABIC = /[\u0600-\u06FF]/;
// French heuristic: presence of diacritics or common French tokens
const FR_HINT = /[àâçéèêëîïôùûüÿœæÀÂÇÉÈÊËÎÏÔÙÛÜŸŒÆ]|\b(le|la|les|de|des|du|un|une|et|est|pour|avec|sans|dans|sur|vous|votre|nos|par|aux?)\b/i;

function isTranslatable(text: string, lang: Lang): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  if (SKIP_RE.test(t)) return false;
  if (!HAS_LATIN.test(t)) return false; // already non-latin (arabic/emoji/etc.)
  if (lang === "fr" && FR_HINT.test(t) && !/[A-Za-z]{4,}/.test(t.replace(FR_HINT, ""))) {
    // Looks already French
    return false;
  }
  if (lang === "ar" && HAS_ARABIC.test(t)) return false;
  return true;
}

function shouldSkipElement(el: Element | null): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (SKIP_TAGS.has(cur.tagName)) return true;
    if (cur.getAttribute?.("data-noi18n") !== null && cur.getAttribute?.("data-noi18n") !== undefined) return true;
    if (cur.getAttribute?.("contenteditable") === "true") return true;
    cur = cur.parentElement;
  }
  return false;
}

type Cache = Record<string, string>;

function loadCache(lang: Lang): Cache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(cacheKey(lang));
    if (!raw) return {};
    return JSON.parse(raw) as Cache;
  } catch {
    return {};
  }
}

function saveCache(lang: Lang, cache: Cache) {
  try {
    window.localStorage.setItem(cacheKey(lang), JSON.stringify(cache));
  } catch {}
}

export function AutoTranslateProvider({ children }: { children: ReactNode }) {
  const { lang } = usePrefs();
  const translate = useServerFn(translateBatch);
  const cacheRef = useRef<Cache>({});
  const originalsRef = useRef<WeakMap<Node, string>>(new WeakMap());
  const originalAttrsRef = useRef<WeakMap<Element, Record<string, string>>>(new WeakMap());
  const pendingRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Set<string>>(new Set());
  const scheduledRef = useRef<number | null>(null);
  const langRef = useRef<Lang>(lang);

  useEffect(() => {
    langRef.current = lang;
    if (typeof document === "undefined") return;

    // Reset: restore any originals so we start clean on lang change
    const restore = () => {
      // Text nodes
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let n: Node | null;
      while ((n = walker.nextNode())) nodes.push(n as Text);
      for (const tn of nodes) {
        const orig = originalsRef.current.get(tn);
        if (orig !== undefined && tn.nodeValue !== orig) tn.nodeValue = orig;
      }
      // Attributes
      const all = document.body.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]");
      all.forEach((el) => {
        const orig = originalAttrsRef.current.get(el);
        if (!orig) return;
        for (const [k, v] of Object.entries(orig)) {
          if (el.getAttribute(k) !== v) el.setAttribute(k, v);
        }
      });
    };

    if (lang === "en") {
      restore();
      return;
    }

    cacheRef.current = loadCache(lang);

    // Apply cached translations + collect unknowns
    const applyAndCollect = (root: Node) => {
      const activeLang = langRef.current;
      const cache = cacheRef.current;

      // Text nodes
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = (node as Text).parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const tn = node as Text;
        const raw = tn.nodeValue ?? "";
        const trimmed = raw.trim();
        if (!isTranslatable(trimmed, activeLang)) continue;

        if (!originalsRef.current.has(tn)) originalsRef.current.set(tn, raw);
        const original = originalsRef.current.get(tn)!;
        const key = original.trim();
        const cached = cache[key];
        if (cached) {
          const lead = original.match(/^\s*/)?.[0] ?? "";
          const trail = original.match(/\s*$/)?.[0] ?? "";
          const newVal = lead + cached + trail;
          if (tn.nodeValue !== newVal) tn.nodeValue = newVal;
        } else if (!inflightRef.current.has(key)) {
          pendingRef.current.add(key);
        }
      }

      // Attributes
      const elWithAttrs = (root instanceof Element ? root : document.body)
        .querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]");
      elWithAttrs.forEach((el) => {
        if (shouldSkipElement(el)) return;
        for (const attr of ATTR_TARGETS) {
          const cur = el.getAttribute(attr);
          if (!cur) continue;
          const trimmed = cur.trim();
          if (!isTranslatable(trimmed, activeLang)) continue;
          const store = originalAttrsRef.current.get(el) ?? {};
          if (store[attr] === undefined) store[attr] = cur;
          originalAttrsRef.current.set(el, store);
          const key = (store[attr] ?? cur).trim();
          const cached = cache[key];
          if (cached) {
            if (el.getAttribute(attr) !== cached) el.setAttribute(attr, cached);
          } else if (!inflightRef.current.has(key)) {
            pendingRef.current.add(key);
          }
        }
      });
    };

    const flush = async () => {
      scheduledRef.current = null;
      if (pendingRef.current.size === 0) return;
      const activeLang = langRef.current;
      if (activeLang === "en") { pendingRef.current.clear(); return; }
      // Take up to 50 keys per batch
      const batch: string[] = [];
      const it = pendingRef.current.values();
      for (let i = 0; i < 50; i++) {
        const nx = it.next();
        if (nx.done) break;
        batch.push(nx.value);
      }
      batch.forEach((k) => { pendingRef.current.delete(k); inflightRef.current.add(k); });

      try {
        const res = await translate({ data: { lang: activeLang, texts: batch } });
        const cache = cacheRef.current;
        res.translations.forEach((t, i) => { cache[batch[i]] = t; });
        saveCache(activeLang, cache);
        // Re-apply to the whole body so newly cached strings get swapped in
        applyAndCollect(document.body);
      } catch (e) {
        console.warn("[auto-translate] batch failed", e);
      } finally {
        batch.forEach((k) => inflightRef.current.delete(k));
        // If more remain, schedule next flush
        if (pendingRef.current.size > 0) schedule();
      }
    };

    const schedule = () => {
      if (scheduledRef.current !== null) return;
      scheduledRef.current = window.setTimeout(flush, 250) as unknown as number;
    };

    // Initial pass
    applyAndCollect(document.body);
    if (pendingRef.current.size > 0) schedule();

    // Observe subsequent DOM mutations
    const observer = new MutationObserver((mutations) => {
      let touched = false;
      for (const m of mutations) {
        if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
          const tn = m.target as Text;
          // If we set the value, ignore
          const orig = originalsRef.current.get(tn);
          if (orig === tn.nodeValue) continue;
          // React may have replaced content; refresh original
          originalsRef.current.set(tn, tn.nodeValue ?? "");
          touched = true;
        } else if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
          m.addedNodes.forEach((added) => {
            if (added.nodeType === Node.ELEMENT_NODE || added.nodeType === Node.TEXT_NODE) {
              try { applyAndCollect(added); touched = true; } catch {}
            }
          });
        } else if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
          const el = m.target as Element;
          const name = m.attributeName;
          if (!name) continue;
          if (!ATTR_TARGETS.includes(name as (typeof ATTR_TARGETS)[number])) continue;
          touched = true;
          try { applyAndCollect(el); } catch {}
        }
      }
      if (touched && pendingRef.current.size > 0) schedule();
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTR_TARGETS],
    });

    return () => {
      observer.disconnect();
      if (scheduledRef.current !== null) {
        clearTimeout(scheduledRef.current);
        scheduledRef.current = null;
      }
    };
  }, [lang, translate]);

  return <>{children}</>;
}
