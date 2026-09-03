# Capacitor — Art Style Overlay
<!-- engine: capacitor -->

Read `docs/ART_STYLE.md` first — this narrows that root policy for a
Capacitor (web-tech, native-shell) app. Owned by: Designer. Does not
restate the root policy; only adds/constrains where an app/web project
needs concrete rules the root doc can't assume.

## style_profile_version
`1.0.0`

## Visual system consistency
- Define the design system tokens once (see Spacing & tokens below) and
  require every screen/component brief to reference them by name rather
  than restating raw values — this is what keeps screens generated in
  separate passes looking like one app.
- Any new UI pattern (card, sheet, modal) must be briefed against an
  existing pattern's tokens before it's treated as a new primitive.

## Typography
- One type scale (family + a fixed set of sizes/weights/line-heights) for
  the whole app. Record it here (or link to a shared tokens file) so
  briefs for icons/illustrations that include text-adjacent shapes match
  it.
- Respect platform conventions where Capacitor renders native chrome
  (status bar, native alerts) — don't restyle what the OS renders.

## Spacing & tokens
- Fixed spacing scale (e.g. 4/8/12/16/24/32px) — briefs must not invent
  arbitrary spacing values.
- Fixed corner-radius and elevation/shadow tokens, applied consistently
  across cards, buttons, and sheets.
- Record breakpoints/safe-area insets so generated illustrations/icons
  are briefed with the right aspect ratio for how they'll actually be
  laid out (notch/home-indicator safe areas included).

## Iconography
- Single icon style (line weight, corner radius, filled vs. outline,
  optical size) for the whole icon set. Brief new icons against at least
  one existing icon in the set as a reference image (see
  `reference_images` in `docs/ASSETS.md`), not from scratch.
- App icon and any adaptive/platform icon variants follow the same
  palette/shape language as in-app icons — an app icon that doesn't match
  the in-app icon set is a style-conformance defect.

## Accessibility-relevant style constraints
- Minimum contrast ratio for text/icon-on-background pairs must meet
  WCAG AA (4.5:1 for normal text, 3:1 for large text/icons) — record the
  approved color pairs so briefs don't need contrast math per asset.
- Do not rely on color alone to convey state (error/success/warning) —
  pair color with shape/icon/label.
- Illustrations/icons must remain legible at the smallest size they're
  actually rendered at (e.g. tab bar icon, list row icon), not just at
  the size they were generated.

## Audio direction
- Audio assets must support the product's intended pace and mood without
  masking alerts or interaction feedback; brief loop points and loudness
  targets explicitly.

## Motion / video
- Motion follows the app's component transitions and respects reduced-motion
  settings; video framing must preserve the same spacing and visual hierarchy
  as the screen where it appears.

## Applies on top of
`docs/ART_STYLE.md` (root policy, cohesion rules, style profile version,
external-skill compliance) and `engines/capacitor/conventions.md`
(technical stack conventions).
