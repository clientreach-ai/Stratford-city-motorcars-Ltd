#!/usr/bin/env node
/**
 * Content regression check.
 *
 * Fails if copy the client intake rejected finds its way back into the site:
 * vehicle hire, the fabricated testimonials, the old opening hours and sat-nav
 * postcode, unconfirmed finance/broker claims, "included"/AA warranty claims,
 * blanket HPI claims, the old legal boilerplate, links to the old £12k/£16k
 * vehicle pages,
 * the "every car has a full service and MOT" guarantee, unqualified 24-hour,
 * same-day and five-minute response promises, "competitive valuations",
 * business identities the client has not confirmed (motor group, marque or
 * prestige specialist, commission-free), the legacy site's contradictory
 * contact details and stock photography.
 *
 * Inventory rules (price range, photography gate, featured-only homepage) are
 * behavioural and checked separately by scripts/check-inventory.mjs.
 *
 *   node scripts/check-content.mjs                     # scan src/
 *   node scripts/check-content.mjs .next/server/app    # also scan built HTML
 *
 * Source files are scanned with block comments and comment-only lines removed,
 * so explanatory comments that name a removed claim do not trip the check.
 * "Hire Purchase" (a finance product the client confirmed) is allowed.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RULES = [
  // Vehicle hire — the client does not offer it.
  { group: "hire", pattern: /\bhir(e|es|ed|ing)\b(?!\s+purchase)/i },
  { group: "hire", pattern: /\/hire\b/ },
  { group: "hire", pattern: /\brental\b/i },
  { group: "hire", pattern: /£39|per day/i },

  // Fabricated reviews.
  {
    group: "fake reviews",
    pattern: /Michael Thompson|James Mitchell|Rachel Phillips|David Chen|Sarah Johnson|Emma Wilson/,
  },
  { group: "fake reviews", pattern: /what our customers say|this side of £60,000/i },

  // Old opening hours (confirmed hours are Mon–Fri 12pm–5pm) and postcode.
  { group: "old hours", pattern: /\b(9am|6pm|10am|4pm)\b|\b(0?9|18|10|16):00\b|Mon[–-]Sat|Sun 10/ },
  { group: "old postcode", pattern: /E15 2BX/ },

  // Finance claims the client has not confirmed.
  {
    group: "finance claims",
    pattern:
      /credit broker|several FCA|multiple FCA|same-day approval|within hours|pre-approval|competitive interest rates|lending partners?|quick approvals/i,
  },

  // Warranty is sold separately through an unnamed third party.
  { group: "warranty claims", pattern: /AA warranty|months? included/i },

  // Not every car is history checked.
  { group: "HPI claims", pattern: /every (car|vehicle)[^.<"]{0,20}HPI|HPI clear certification|multi-point/i },

  // Old legal boilerplate and stale price bands.
  { group: "legal boilerplate", pattern: /September 2024|£99|non-refundable/i },
  { group: "stale pricing", pattern: /Up to £15,000|Up to £60,000|London area/i },

  // The old £16k Jaguar XF and £12k ML63 AMG are below the stock range and
  // must never be linked or rendered. Matched by URL rather than price: stock
  // filter bands can legitimately read £12,000 or £16,000. The price rule
  // itself is checked behaviourally by scripts/check-inventory.mjs.
  { group: "old inventory", pattern: /\/vehicles\/(jaguar-xf-2012|mercedes-benz-ml63-amg-2006)\b/ },

  // Preparation is not a published guarantee: the intake does not confirm
  // "every car has a full service and MOT before sale".
  { group: "preparation guarantee", pattern: /every (car|vehicle)[^.<"]{0,40}\b(full service|MOT)\b/i },

  // Response times. The only confirmed turnaround is part-exchange valuations
  // "usually, on weekdays" within 24 hours — so 24 hours must carry both
  // qualifiers. Same-day and five-minute promises are not confirmed.
  {
    group: "response-time promise",
    pattern: /within 24 hours(?! on weekdays)|(?<!usually[^.]{0,40})within 24 hours|\b24-hour\b|usually the same day|5[- ]minute response|within 5 minutes/i,
  },

  // Part-exchange valuations are an initial guide, confirmed on inspection.
  { group: "valuation claims", pattern: /competitive valuations?|confirmed, not revised|quietly revise|top prices paid/i },

  // Positioning: a small family-owned business trading in sports and luxury
  // cars. The client approved "a small, independent showroom", but not a
  // motor group, a marque or prestige specialism, or commission claims.
  {
    group: "unsupported identity",
    pattern: /\bon commission\b|commission[- ]free|no commission|(Rolls-Royce|prestige|classic[- ]car) specialists?|dealer group|motor group|premier motor/i,
  },
  { group: "retired positioning", pattern: /prestige used cars|prestige,? performance|prestige (&|and) classic/i },

  // The legacy site's contradictory contact details and hire schema.
  {
    group: "legacy contact details",
    pattern: /Unit 12|Stratford Business Park|0000 000000|stratfordcitymotorcars\.co\.uk/i,
  },
  { group: "hire", pattern: /CarRental/ },

  // Stock photography must never stand in for a dealer's car.
  { group: "stock imagery", pattern: /images\.unsplash\.com|unsplash\.com\/photos/i },
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
// fileURLToPath decodes percent-escapes (a space in the checkout path arrives
// as %20 in the URL) and strips the leading slash from Windows drive paths.
const root = fileURLToPath(new URL("..", import.meta.url));
const targets = [join(root, "src"), ...process.argv.slice(2).map((dir) => join(root, dir))];

for (const target of targets) {
  if (!existsSync(target)) {
    console.error(`Content check cannot run: ${target} does not exist.`);
    process.exit(2);
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

/** Removes block comments and comment-only lines, keeping line numbers intact. */
function stripComments(text) {
  const withoutBlocks = text.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
  return withoutBlocks
    .split("\n")
    .map((line) => (/^\s*\/\//.test(line) ? "" : line))
    .join("\n");
}

const failures = [];

for (const target of targets) {
  for (const file of walk(target)) {
    const ext = extname(file);
    const isSource = SOURCE_EXTENSIONS.has(ext);
    if (!isSource && ext !== ".html") continue;

    const text = readFileSync(file, "utf8");
    const scanned = isSource ? stripComments(text) : text;
    const lines = scanned.split("\n");

    lines.forEach((line, index) => {
      for (const rule of RULES) {
        const match = line.match(rule.pattern);
        if (match) {
          failures.push(`${relative(root, file)}:${index + 1}  [${rule.group}]  "${match[0]}"`);
        }
      }
    });
  }
}

if (failures.length > 0) {
  console.error(`Content check failed — ${failures.length} rejected claim(s) found:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`Content check passed (${targets.map((t) => relative(root, t)).join(", ")}).`);
