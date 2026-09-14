# Physical Card Customizer Integration Design

**Date:** 2026-09-04  
**Status:** Approved for implementation

## Goal

Make the existing IQ Card Physical Atelier prototype the first step after the landing-page **Get your IQ Card** action, without requiring login, email or digital-profile setup.

## Product flow

The first slice establishes this path:

`Landing → /customize`

The customizer is a visual, guest-accessible product-design experience. It begins with `YOUR NAME`, lets the visitor configure the physical card, shows a provisional price, and preserves the design locally. The existing authentication and digital-profile dashboard remain available for returning owners, but they are not part of this purchase entry point.

## Recommended architecture

Port the self-contained Atelier prototype into a dedicated Next.js App Router route at `src/app/customize/`. Use a client component for the interactive card renderer and controls, with small focused modules for the design schema, pricing, local persistence and checkout handoff. This preserves the prototype's visual behavior while giving the production app a stable interface for the later details, payment and claim steps.

The prototype's current HTML/inline script is the visual source of truth, not a second production runtime. Its behaviors should be migrated into React rather than embedded in an iframe or left as a separately hosted static page.

## First-slice scope

Included:

- Guest-accessible `/customize` route.
- Atelier card stage with front/back inspection.
- Core, material, finish, name treatment, logo, composition, back layout and craft controls.
- Initial name placeholder `YOUR NAME`.
- Provisional INR quote updated from the selected configuration.
- Browser-local autosave and restore after refresh.
- **Save for later** action that stores a local design record without account creation.
- **Continue →** action that validates the design and stores a checkout-ready handoff locally for the next phase.
- Landing-page CTA wired to `/customize`.

Excluded from this slice:

- Email collection.
- Shipping details.
- Payment provider integration.
- Server-side order creation.
- URL claiming and uniqueness locks.
- Magic-link ownership account creation.
- Digital identity fields such as bio, photo, LinkedIn, portfolio or Spaces.

## Design data contract

The production customizer will expose one serializable design object with these fields:

```ts
type PhysicalCardDesign = {
  schemaVersion: '1.0';
  productFamily: 'classic';
  core: 'black' | 'white';
  material: string;
  finish: 'matte' | 'satin' | 'gloss';
  identity: {
    name: string;
    tone: 'dark' | 'light';
    composition: 'signature' | 'editorial' | 'minimal' | 'centered' | 'statement';
    fineTune: { nameScale: number; x: number; y: number; align: 'left' | 'center' | 'right' };
  };
  logo: { mode: 'none' | 'iq' | 'custom'; filename: string | null; mimeType: string | null; scale: number; x: number; y: number; align: 'left' | 'center' | 'right' };
  backLayout: 'pure' | 'branded' | 'identity' | 'custom';
  craft: 'engrave' | 'emboss' | 'deboss' | 'foil' | 'printed';
};
```

Binary logo data is not treated as a durable order asset in local storage. The UI may preview it for the current session; the future checkout phase must upload it to controlled storage before payment/order creation.

## Persistence and handoff

Use versioned browser-storage keys. Autosave should be debounced and resilient to malformed or unavailable storage. A saved design includes the design object, pricing version, quote snapshot and timestamp. The **Continue →** action validates required choices and writes a checkout handoff record; it does not imply that an order or payment exists.

## Error behavior

- Invalid or empty names are surfaced beside the relevant control before handoff.
- Unsupported configuration values cannot produce a checkout handoff.
- If browser storage is blocked or full, the design remains usable in memory and the UI shows a non-blocking save warning.
- Provisional pricing is clearly labeled until server-side pricing is introduced.
- Custom-logo designs explain when re-upload will be required for checkout.

## Testing and acceptance

- Unit tests cover design defaults, pricing, validation, serialization and storage recovery.
- Component tests cover name editing, option changes, autosave, refresh restore, Save for later and Continue handoff.
- Build, TypeScript, lint and the existing test suite must pass.
- The landing CTA must resolve to `/customize` without an authentication redirect.
- A production smoke test must confirm the route renders and a fake checkout handoff does not create an order or send email.

## Later integration seams

The customizer will hand off through a typed local design record first. The next phases can replace that handoff with a server endpoint, then add details, payment, post-payment URL claiming and magic-link account ownership without changing the card configuration UI.
