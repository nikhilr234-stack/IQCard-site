# Digital Profile Design Studio

## Goal

Upgrade the owner Digital Profile editor with premium, shared visual customization while preserving the six existing template compositions, profile data, publication behavior, and backward compatibility.

## Approved architecture

- The six existing templates—Cover, Studio, Executive, Signal, Index, and Minimal—remain the structural system.
- A shared design object is the visual system. Customization logic is centralized rather than duplicated per template.
- Design data lives only in the existing presentation JSON. No schema or migration changes are allowed.
- Existing draft and published presentation behavior remains: save persists the draft; publish copies draft to published.
- Legacy presentation JSON is normalized to safe IQ defaults and must render without a visual break.
- CSS custom properties drive runtime styling, including `--profile-bg`, `--profile-text`, `--profile-accent`, `--profile-radius`, `--profile-font`, and `--profile-density`.
- Presets are starting points. All controls remain available for fine-tuning after application.
- Link icons are derived from link label and URL and are never stored in the database. Use the approved `react-icons` library, with a generic external-link fallback for unknown links. Do not load remote logos.
- Text color supports `'auto'` (default) and manual override. Auto derives a high-contrast color from the background. A manual color is preserved and receives a contrast warning when it is insufficient.
- Templates may declare safe limits for shared controls. A central capability map controls availability and rendering; do not duplicate customization logic per template or redesign template compositions.

## Presentation model

Extend the existing presentation type with an optional/normalized `design` object:

```ts
design: {
  version: 1
  theme: 'light' | 'dark' | 'auto'
  background: {
    color: string
    text: string | 'auto'
    accent: string
  }
  typography: {
    family: 'neo' | 'serif' | 'mono' | 'humanist'
    scale: 'compact' | 'balanced' | 'large'
    weight: 'regular' | 'medium' | 'bold'
  }
  profile: {
    photoShape: 'circle' | 'rounded' | 'square'
    photoSize: 'small' | 'medium' | 'large'
    alignment: 'left' | 'center'
  }
  links: {
    style: 'icons' | 'pills' | 'rows' | 'cards'
    showIcons: boolean
    iconStyle: 'brand' | 'mono'
    radius: 'square' | 'soft' | 'round'
    density: 'compact' | 'comfortable'
  }
  buttons: {
    style: 'solid' | 'outline' | 'soft'
    radius: 'square' | 'soft' | 'pill'
  }
  footer: {
    showMadeWithIq: boolean
    showProfessionalLabel: boolean
  }
}
```

The type may make `design` optional at untrusted/legacy input boundaries, but normalized presentation values supplied to editor and renderers must have complete safe defaults. Normalization always sets `design.version` to `1`, including when design/version is absent or malformed. Missing or malformed `background.text` normalizes to `'auto'`. No arbitrary font uploads are supported.

All persisted manual colors (`background.color`, manual `background.text`, and `background.accent`) normalize to HEX `#RRGGBB` only. Malformed values fall back to the corresponding IQ default; arbitrary CSS strings must never be persisted. Auto text chooses exactly `#000000` or `#FFFFFF`, whichever has better contrast against the normalized background.

## Design Studio UI

On `/dashboard/digital-profile`, place a shared DESIGN area after template selection. The sections are:

1. **Color:** theme (Auto, Light, Dark), background, text (`Auto` or manual), accent; quick palette choices Ivory, Graphite, Black, Warm Grey, Sand, and Custom. A low-contrast manual text selection displays “Low contrast — text may be difficult to read.” without silently changing the color. Quick palettes change only background, text, and accent.
2. **Typography:** Neo Grotesk, Serif, Mono, Humanist; scale and weight controls. Font choices map to built-in/local font stacks; arbitrary uploads are prohibited.
3. **Profile:** photo shape, size, and alignment.
4. **Links:** Icons, Pills, Rows, Cards; show-logos toggle; brand-color or monochrome icon style; corner style and density.
5. **Buttons:** Solid, Outline, Soft; Square, Soft, Pill radius.
6. **Footer:** show/hide “Made with iq” and the category/professional label.

Every setting change updates the existing preview immediately without requiring save. Nothing publishes automatically. Save Draft persists `presentation.draft.design`; Publish copies draft design into `presentation.published.design` through the existing draft-to-published path. The owner editor uses collapsible sections on mobile so controls do not become a single long wall; preview remains easy to reach. On desktop, keep the live preview visible while editing where practical. Use restrained, editorial controls with whitespace and compact segmented controls/swatches rather than a generic settings-dashboard visual treatment.

Section reset returns only that section to IQ defaults. Reset design returns every shared setting to the shipped IQ design defaults, independent of the currently selected template. A preset overwrites shared design settings only; it does not change template, profile content, links, or other presentation structure. After preset application, all supported controls remain editable.

Switching templates preserves every shared design setting and does not mutate unsupported values. If a setting is unsupported by a template, its control is hidden or disabled; explain the limitation when useful. Capability filtering affects available controls and effective rendering only. The effective renderer uses a template-safe fallback without changing stored settings.

## Presets

Provide six coordinated design presets: Editorial, Monochrome, Warm Luxury, Dark Performance, Studio, and Minimal Tech. Each supplies palette, typography, links, buttons, radius, and density values within the shared design object. Presets do not replace the template or profile content and may be fine-tuned after application.

Quick color palettes only change the background/text/accent portion of the design. Choosing a background color sets text to Auto unless the user then selects a manual text color.

All preset values pass through the same template capability map as manual controls. An unsupported option is disabled/hidden in the editor and rendered with the template-safe effective fallback, without mutating stored user values as a side effect of applying a preset or switching templates.

## Template capability and rendering rules

Keep template structure and existing compositions. Use one canonical `src/lib/profile/design.ts` for `DEFAULT_PROFILE_DESIGN`, coordinated `DESIGN_PRESETS`, `TEMPLATE_CAPABILITIES`, `normalizeDesign()`, `resolveEffectiveDesign()`, contrast utilities, and color validation. Keep capabilities keyed by the six template identifiers. Initial supported link layouts/defaults:

| Template | Supported link styles | Safe default |
| --- | --- | --- |
| Cover | Icons, Pills, Rows, Cards | Pills |
| Studio | Pills, Rows, Cards | Cards |
| Executive | Pills, Rows, Cards | Rows |
| Signal | Icons, Pills, Rows | Rows |
| Index | Icons, Pills, Rows | Rows |
| Minimal | Icons, Pills, Rows | Rows |

All other shared controls are available across templates unless an existing composition cannot safely support them; any such restrictions must also be declared centrally, surfaced as disabled/hidden controls, and covered by tests. Template renderers consume normalized presentation plus the resolved effective design settings and CSS variables. They must not each implement their own preset, persistence, normalization, or contrast logic. The stored shared design survives template switching; only effective rendering uses safe fallback values.

Use `--profile-bg`, `--profile-text`, `--profile-accent`, `--profile-radius`, `--profile-font`, and `--profile-density` for runtime visual variation. These variables style shared visual details while existing per-template structure remains intact.

## Link icons

Add a local helper such as `src/lib/profile/link-icons.ts` with `getLinkIcon(label: string, url: string)`. Recognize LinkedIn, Instagram, X, Facebook, YouTube, GitHub, Behance, Dribbble, Pinterest, TikTok, Spotify, Apple Music, WhatsApp, Email, Phone, Website, Portfolio, Medium, and Substack by known label and URL hostname/protocol. Match safely; unknown or unrecognized links use a generic external-link icon. Icons are local package components, not remote resources or persisted SVG data. `showIcons` controls visibility, and `iconStyle` selects brand or monochrome treatment. Maintain brand colors in one local mapping; Brand mode uses mapped colors, while Mono mode uses profile text/accent styling. `react-icons` is approved and should be added only if needed; avoid overlapping icon/UI libraries and keep bundle impact reasonable.

## Compatibility and security boundaries

- Do not add database schema or migration changes.
- Do not change normal customer onboarding, profile ownership/security rules, or the existing draft/publish contract.
- Keep the six templates and their visual composition intact.
- Normalize older or partial presentation values deterministically to IQ defaults.
- Manual text colors are not auto-corrected; show a contrast warning when needed.
- Auto text contrast uses WCAG contrast calculation and selects the higher-contrast of pure black or white; normal text targets at least 4.5:1.
- Light applies the shipped light IQ palette, Dark applies the shipped dark IQ palette, and Auto may initialize/respect system preference. Theme must not fight manual colors: explicit background/text/accent choices win, and system theme changes do not continuously overwrite them.
- Quick color palettes affect only background/text/accent; presets affect only the shared design object.
- Link icon selection uses only label/URL metadata and does not fetch external resources.

## Verification requirements

Add or update tests proving:

- legacy presentation normalizes safely, including absent text becoming `'auto'`;
- design.version is 1 when missing and normalized design is complete;
- colors normalize to HEX only and malformed colors use safe defaults;
- Auto text chooses the better black/white contrast; WCAG contrast calculation works; manual text overrides Auto and low contrast warns without mutation;
- color, typography, photo shape, link layout, icon visibility/style, and presets update preview/design state;
- template switching preserves shared settings; unsupported stored settings remain unchanged while effective rendering uses a safe fallback;
- theme convenience behavior does not overwrite explicit manual palette values;
- section reset and full design reset reset exactly their declared scopes;
- draft saves preserve customization and publish preserves draft settings in published presentation;
- all six templates render with normalized defaults and preserve their composition;
- recognized link labels/URLs select the expected icon, URL hostname/protocol detection works, Brand/Mono treatments differ as specified, and unknown links use the fallback;
- mobile editor sections are collapsible and remain usable;
- no migration/schema changes are introduced.

Compatibility coverage must include legacy presentations containing only template/cover fields (such as `coverPath`, `overlay`, `focalY`, `alignment`, and `photoPathOverride`) and verify they still render. Do not rewrite legacy database rows merely to add design defaults. Existing Nikhil/Yatish public profiles must remain visually stable until design settings are explicitly changed and published.

Run relevant and full test suites, lint, typecheck, production build, and `git diff --check`. Report changed files, dependency changes, checks, compatibility issues, template-specific limitations, and confirm no schema/migration changes. Do not deploy or apply migrations.
