# Cover Digital Profile Design

## Purpose

Add the approved `02 Cover` presentation to IQ Card while preserving the existing public professional profile as `01 Minimal`. Profile identity and content remain a single shared record; presentation is independent and can be switched without losing content or the other template's settings.

## Scope

- Owners select and edit their public presentation from a new Dashboard `Digital Profile` destination.
- Visitors see only the owner's published template. There is no public template switcher in V1.
- Cover uses the supplied reference's full-bleed, mobile-first editorial composition: persistent wallpaper, controlled dark overlay, lower-third identity, restrained actions, and a dominant Save Contact action.
- Minimal retains the current `PublicProfileCard` rendering and visual language.

## Data model and publication boundary

Add a one-to-one `profile_presentations` relation keyed by `profile_id`. It holds two JSONB settings objects and no identity/contact/link data:

```ts
type Template = 'minimal' | 'cover'

type CoverSettings = {
  coverPath: string | null
  overlay: number // clamped 0.15–0.70; default 0.38
  focalY: number // clamped 0–100; default 50
  alignment: 'lower-left' | 'center'
  photoPathOverride: string | null
}

type ProfilePresentation = {
  profile_id: string
  draft: { template: Template; cover: CoverSettings }
  published: { template: Template; cover: CoverSettings }
}
```

The profile table remains the source of truth for name, role, bio, contact fields, photo, and links. Presentation JSON is normalized in TypeScript before storage and constrained by the database RPC used for owner writes. The new migration adds owner-read access and security-definer RPCs for saving the draft and promoting it to published. A public reader receives only `published` settings when the associated profile is published.

`Save Draft` persists only the draft presentation. `Publish` first promotes the latest presentation draft, then uses the existing profile publication boundary. Existing `publishProfile` behavior continues to publish profile content; template changes reach a live profile only through the promotion RPC. This supports published profiles editing a next presentation without changing the live design.

## Media

Reuse the profile image validation, upload format, and signed delivery pattern. Add a dedicated `profile-covers` storage bucket and owner-bound API/action pair. A cover is selected through a visual thumbnail and `Change Cover` control; the native file input is visually hidden but remains accessible. Owners can replace or remove a draft cover. Cover assets are publicly readable only while referenced by a published Cover presentation.

The existing `photo_path` remains the shared profile photo. `photoPathOverride` is optional and Cover-only; when null, Cover uses the shared profile photo. Changing the shared photo does not change the selected template or other Cover settings.

## Rendering

Introduce a shared `PublicProfile` router component. It receives `Profile`, resolved presentation settings, and preview state:

- `minimal` renders the existing `PublicProfileCard` presentation unchanged.
- `cover` renders a new `CoverProfile` with a separate scoped stylesheet/component layer.

The published `[slug]` route resolves published presentation. The authenticated preview and dashboard phone preview resolve draft presentation. The preview uses the same `CoverProfile`/Minimal renderer and does not duplicate public markup. Preview mode disables the contact-download side effect but preserves layout and content.

Cover styles keep the wallpaper as the page-level background through content and footer, set `background-position` from `focalY`, and use a variable overlay. Identity alignment maps only to `lower-left` and `center`. The new presentation owns its CSS classes so current Minimal styles remain untouched.

## Dashboard experience

Add `/dashboard/digital-profile` and link it from both dashboard modes. It continues the current IQ dashboard language rather than introducing an unrelated admin UI.

The editor contains:

1. Template choices: `01 Minimal` and `02 Cover`.
2. Cover-only Appearance controls: cover thumbnail/Change Cover/Remove, profile photo workflow, overlay slider, vertical image position, and lower-left/centered alignment.
3. Content summary with links back to the existing owner profile fields; those values update the preview because they are shared profile data.
4. A sticky responsive phone preview rendered by the shared profile renderer.
5. `Save Draft` and `Publish` actions, including clear success/error state.

Template selection changes the preview immediately in client state. Selecting Minimal leaves all Cover settings in the draft JSON unchanged; selecting Cover restores the saved values. No font picker, theme palette, arbitrary positioning, or visitor controls are included.

## Error handling and compatibility

- Missing or invalid presentation rows resolve to normalized Minimal defaults, so existing published profiles render exactly as they do today.
- Missing Cover media falls back to a neutral gradient while retaining readable identity and controls.
- Upload, save, and publish failures report an accessible inline error and retain client edits for retry.
- Unauthorized requests cannot read owner drafts or cover media.

## Verification

Tests will cover normalization and clamping; preservation of Cover settings across template switches; migration/RPC contracts separating draft from published; public routing selecting published presentation; preview selecting draft presentation; Cover fallback and accessibility landmarks; and dashboard action wiring. Run targeted Vitest suites, lint, production build, and responsive browser checks at iPhone 15 and smaller iPhone dimensions.
