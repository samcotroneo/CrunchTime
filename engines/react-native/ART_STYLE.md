# React Native — Art Style Overlay
<!-- engine: react-native -->

Read `docs/ART_STYLE.md` first — this narrows that root policy for a
React Native app. Owned by: Designer. Does not restate the root policy;
only adds/constrains where an app project needs concrete rules the root
doc can't assume.

## Visual system consistency
- Define the design system tokens once (see Spacing & tokens below) and
  require every screen/component brief to reference them by name rather
  than restating raw values, so screens/components briefed independently
  (or across platforms, if targeting iOS + Android) still look like one
  app.
- Cross-platform note: where a screen intentionally diverges per platform
  (native navigation chrome, platform-specific components), record that
  divergence explicitly so it isn't mistaken for style drift.

## Typography
- One type scale (family + fixed sizes/weights/line-heights) for the
  whole app, consistent across iOS and Android targets unless a
  divergence is explicitly recorded.
- Respect platform text-scaling/accessibility settings (Dynamic Type /
  Android font scale) — illustrations with embedded text do not adapt,
  so avoid baking text into generated art; keep text in real components.

## Spacing & tokens
- Fixed spacing scale (e.g. 4/8/12/16/24/32px) shared across screens —
  briefs must not invent arbitrary spacing values.
- Fixed corner-radius and elevation/shadow tokens, applied consistently
  across cards, buttons, and sheets on both platforms.
- Record safe-area insets (notch, home indicator, Android nav bar) so
  generated illustrations/icons are briefed with the right aspect ratio
  for their actual layout.

## Iconography
- Single icon style (line weight, corner radius, filled vs. outline,
  optical size) for the whole icon set. Brief new icons against at least
  one existing icon in the set as a reference image (see
  `reference_images` in `docs/ASSETS.md`).
- App icon and adaptive icon (Android) / all required iOS icon sizes
  follow the same palette/shape language as in-app icons.

## Accessibility-relevant style constraints
- Minimum contrast ratio for text/icon-on-background pairs must meet
  WCAG AA (4.5:1 for normal text, 3:1 for large text/icons) — record the
  approved color pairs so briefs don't need contrast math per asset.
- Do not rely on color alone to convey state (error/success/warning) —
  pair color with shape/icon/label.
- Illustrations/icons must remain legible at the smallest size they're
  actually rendered at, not just at the size they were generated.

## Applies on top of
`docs/ART_STYLE.md` (root policy, cohesion rules, style profile version,
external-skill compliance) and `engines/react-native/conventions.md`
(technical stack conventions).
