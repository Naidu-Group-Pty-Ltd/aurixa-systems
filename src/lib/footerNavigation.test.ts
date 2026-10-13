import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FOOTER_NAVIGATION_STATE,
  isFooterNavigationState,
  resolveFooterNavigation,
} from "./footerNavigation";

const footer = FOOTER_NAVIGATION_STATE;

test("the marker is namespaced and recognised only in its exact form", () => {
  assert.equal(isFooterNavigationState(footer), true);
  // A structured-clone round trip, which is how the state comes back out of history.
  assert.equal(isFooterNavigationState(JSON.parse(JSON.stringify(footer))), true);
  for (const other of [null, undefined, "footer", 1, {}, { source: "footer" }, { aurixaNavigationSource: "header" }]) {
    assert.equal(isFooterNavigationState(other), false, JSON.stringify(other));
  }
});

test("a fresh footer click to a section scrolls to that section", () => {
  // Cross-page and same-page clicks are both PUSH; the pathname plays no part.
  assert.deepEqual(
    resolveFooterNavigation({ navigationType: "PUSH", state: footer, hash: "#serviceability" }),
    { kind: "section", id: "serviceability" },
  );
});

test("a repeated click on the same footer link is a REPLACE and still scrolls", () => {
  // React Router replaces rather than pushes when the target equals the current URL.
  assert.deepEqual(
    resolveFooterNavigation({ navigationType: "REPLACE", state: footer, hash: "#wealth-advisors" }),
    { kind: "section", id: "wealth-advisors" },
  );
});

test("footer page-top links scroll to the top, including on the page already open", () => {
  for (const navigationType of ["PUSH", "REPLACE"]) {
    assert.deepEqual(resolveFooterNavigation({ navigationType, state: footer, hash: "" }), { kind: "top" });
    assert.deepEqual(resolveFooterNavigation({ navigationType, state: footer, hash: "#" }), { kind: "top" });
  }
});

test("POP is never handled, so Back, Forward, first loads and refreshes keep browser restoration", () => {
  for (const hash of ["", "#serviceability"]) {
    assert.deepEqual(resolveFooterNavigation({ navigationType: "POP", state: footer, hash }), { kind: "ignore" });
  }
});

test("navigation without the footer marker is ignored (header, header logo, programmatic, query-only)", () => {
  for (const navigationType of ["PUSH", "REPLACE"]) {
    for (const state of [null, undefined, { other: true }]) {
      for (const hash of ["", "#serviceability"]) {
        assert.deepEqual(resolveFooterNavigation({ navigationType, state, hash }), { kind: "ignore" });
      }
    }
  }
});

test("an unknown navigation type is ignored", () => {
  assert.deepEqual(resolveFooterNavigation({ navigationType: "TRAVERSE", state: footer, hash: "#x" }), { kind: "ignore" });
});

test("fragments are decoded, and a malformed one falls back to the top instead of throwing", () => {
  assert.deepEqual(
    resolveFooterNavigation({ navigationType: "PUSH", state: footer, hash: "#caf%C3%A9" }),
    { kind: "section", id: "café" },
  );
  assert.deepEqual(resolveFooterNavigation({ navigationType: "PUSH", state: footer, hash: "#%E0%A4%A" }), { kind: "top" });
});
