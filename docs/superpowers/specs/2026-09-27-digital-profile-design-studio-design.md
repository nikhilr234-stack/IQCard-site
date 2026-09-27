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

The type may make `design` optional at untrusted/legacy input boundaries, but normalized presentation values supplied to editor and renderers must have complete safe defaults. Missing or malformed `background.text` normalizes to `'auto'`. No arbitrary font uploads are supported.

## Design Studio UI

On `/dashboard/digital-profile`, place a shared DESIGN area after template selection. The sections are:

1. **Color:** theme (Light, Dark, Auto), background, text (`Auto` or manual), accent; quick palette choices Ivory, Graphite, Black, Warm Grey, Sand, and Custom. A low-contrast manual text selection displays a warning without silently changing the color.
2. **Typography:** Neo Grotesk, Serif, Mono, Humanist; scale and weight controls. Font choices map to built-in/local font stacks; arbitrary uploads are prohibited.
3. **Profile:** photo shape, size, and alignment.
4. **Links:** Icons, Pills, Rows, Cards; show-logos toggle; brand-color or monochrome icon style; corner style and density.
5. **Buttons:** Solid, Outline, Soft; Square, Soft, Pill radius.
6. **Footer:** show/hide “Made with iq” and the category/professional label.

Every setting change updates the existing preview immediately. Nothing publishes automatically. Save Draft stores customization in the draft presentation; Publish uses the existing draft-to-published path. The owner editor uses collapsible sections on mobile so controls do not become a single long wall.

Section reset returns only that section to IQ defaults. Reset design returns every shared setting to the shipped IQ design defaults, independent of the currently selected template. A preset overwrites shared design settings only; it does not change template, profile content, links, or other presentation structure. After preset application, all supported controls remain editable.

Switching templates preserves shared design settings. If a setting is unsupported by a template, its control is hidden or disabled; it is not silently rewritten. Capability filtering affects available controls and effective rendering only.

## Presets

Provide six coordinated design presets: Editorial, Monochrome, Warm Luxury, Dark Performance, Studio, and Minimal Tech. Each supplies palette, typography, links, buttons, radius, and density values within the shared design object. Presets do not replace the template or profile content and may be fine-tuned after application.

Quick color palettes only change the background/text/accent portion of the design. Choosing a background color sets text to Auto unless the user then selects a manual text color.

All preset values pass through the same template capability map as manual controls. An unsupported option is disabled/hidden in the editor and rendered using the template-safe presentation behavior, without mutating stored user values as a side effect of switching templates.

## Template capability and rendering rules

Keep template structure and existing compositions. Use a centralized capability definition keyed by the six template identifiers. Initial supported link layouts/defaults:

| Template | Supported link styles | Safe default |
| --- | --- | --- |
| Cover | Icons, Pills, Rows, Cards | Pills |
| Studio | Pills, Rows, Cards | Cards |
| Executive | Pills, Rows, Cards | Rows |
| Signal | Icons, Pills, Rows | Rows |
| Index | Icons, Pills, Rows | Rows |
| Minimal | Icons, Pills, Rows | Rows |

All other shared controls are available across templates unless an existing composition cannot safely support them; any such restrictions must also be declared centrally, surfaced as disabled/hidden controls, and covered by tests. Template renderers consume normalized presentation plus the resolved effective design settings and CSS variables. They must not each implement their own preset, persistence, normalization, or contrast logic.

Use `--profile-bg`, `--profile-text`, `--profile-accent`, `--profile-radius`, `--profile-font`, and `--profile-density` for runtime visual variation. These variables style shared visual details while existing per-template structure remains intact.

## Link icons

Add a local helper such as `src/lib/profile/link-icons.ts` with `getLinkIcon(label: string, url: string)`. Recognize LinkedIn, Instagram, X, Facebook, YouTube, GitHub, Behance, Dribbble, Pinterest, TikTok, Spotify, Apple Music, WhatsApp, Email, Phone, Website, Portfolio, Medium, and Substack. Match label and URL safely; unknown or unrecognized links use a generic external-link icon. Icons are local package components, not remote resources or persisted SVG data. `showIcons` controls visibility, and `iconStyle` selects brand or monochrome treatment.

## Compatibility and security boundaries

- Do not add database schema or migration changes.
- Do not change normal customer onboarding, profile ownership/security rules, or the existing draft/publish contract.
- Keep the six templates and their visual composition intact.
- Normalize older or partial presentation values deterministically to IQ defaults.
- Manual text colors are not auto-corrected; show a contrast warning when needed.
- Auto text contrast is computed from the selected background and must produce readable text for supported color inputs.
- Link icon selection uses only label/URL metadata and does not fetch external resources.

## Verification requirements

Add or update tests proving:

- legacy presentation normalizes safely, including absent text becoming `'auto'`;
- Auto text chooses high-contrast output; manual text overrides Auto and low contrast warns;
- color, typography, photo shape, link layout, icon visibility/style, and presets update preview/design state;
- template switching preserves shared settings and applies capability filtering without mutation;
- section reset and full design reset reset exactly their declared scopes;
- draft saves preserve customization and publish preserves draft settings in published presentation;
- all six templates render with normalized defaults and preserve their composition;
- recognized link labels/URLs select the expected icon and unknown links use the fallback;
- mobile editor sections are collapsible and remain usable;
- no migration/schema changes are introduced.

Run the repository test suite, lint, typecheck, and production build. Do not deploy.
