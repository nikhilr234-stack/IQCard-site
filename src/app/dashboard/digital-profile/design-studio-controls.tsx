'use client'

import {
  applyColorPalette,
  applyTheme,
  COLOR_PALETTES,
  DESIGN_PRESET_OPTIONS,
  DESIGN_PRESETS,
  hasLowTextContrast,
  normalizeDesign,
  resetDesignSection,
  resetProfileDesign,
  TEMPLATE_CAPABILITIES,
} from '@/lib/profile/design'
import { useRef } from 'react'
import type { ProfileDesign, ProfileTemplate } from '@/lib/profile/types'

type Choice<T extends string> = { value: T; label: string }

function Segmented<T extends string>({
  legend,
  value,
  choices,
  onChange,
  disabledValues = [],
}: {
  legend: string
  value: T
  choices: Choice<T>[]
  onChange: (value: T) => void
  disabledValues?: T[]
}) {
  return <fieldset className="design-segmented">
    <legend>{legend}</legend>
    <div>{choices.map((choice) => <button
      key={choice.value}
      type="button"
      aria-label={`${legend} ${choice.label}`}
      aria-pressed={value === choice.value}
      aria-disabled={disabledValues.includes(choice.value) || undefined}
      disabled={disabledValues.includes(choice.value)}
      title={disabledValues.includes(choice.value) ? `${choice.label} is not supported by this template` : undefined}
      onClick={() => onChange(choice.value)}
    >{choice.label}</button>)}</div>
  </fieldset>
}

const resetNames = {
  color: 'Color', typography: 'Typography', profile: 'Profile', links: 'Links', buttons: 'Buttons', footer: 'Footer',
} as const

export function DesignStudioControls({
  design,
  template,
  onChange,
}: {
  design: ProfileDesign
  template: ProfileTemplate
  onChange: (design: ProfileDesign) => void
}) {
  const customColorInput = useRef<HTMLInputElement>(null)
  const update = <Section extends keyof ProfileDesign>(section: Section, value: ProfileDesign[Section]) => {
    onChange({ ...design, [section]: value })
  }
  const updateBackground = (key: keyof ProfileDesign['background'], value: string) => {
    update('background', { ...design.background, [key]: value })
  }
  const updateTypography = <Key extends keyof ProfileDesign['typography']>(key: Key, value: ProfileDesign['typography'][Key]) => {
    update('typography', { ...design.typography, [key]: value })
  }
  const updateProfile = <Key extends keyof ProfileDesign['profile']>(key: Key, value: ProfileDesign['profile'][Key]) => {
    update('profile', { ...design.profile, [key]: value })
  }
  const updateLinks = <Key extends keyof ProfileDesign['links']>(key: Key, value: ProfileDesign['links'][Key]) => {
    update('links', { ...design.links, [key]: value })
  }
  const updateButtons = <Key extends keyof ProfileDesign['buttons']>(key: Key, value: ProfileDesign['buttons'][Key]) => {
    update('buttons', { ...design.buttons, [key]: value })
  }
  const capability = TEMPLATE_CAPABILITIES[template]
  const lowContrast = design.background.text !== 'auto' && hasLowTextContrast(design.background.text, design.background.color)

  return <section className="digital-profile-panel digital-profile-design" aria-labelledby="digital-profile-design-title">
    <div className="digital-profile-panel-head">
      <span>03 · DESIGN STUDIO</span>
      <div className="digital-profile-design-heading"><div><h2 id="digital-profile-design-title">Make it yours.</h2><p>A shared visual system, tuned without changing your profile content.</p></div>
        <button type="button" className="digital-profile-reset-all" onClick={() => onChange(resetProfileDesign())}>Reset design</button>
      </div>
    </div>

    <section className="digital-profile-presets" aria-labelledby="digital-profile-presets-title">
      <div><span>START WITH A DIRECTION</span><h3 id="digital-profile-presets-title">Presets</h3></div>
      <div className="digital-profile-preset-grid">{DESIGN_PRESET_OPTIONS.map((preset) => <button key={preset.id} type="button" aria-label={preset.label} onClick={() => onChange(normalizeDesign(DESIGN_PRESETS[preset.id]))}><span className={`design-preset-swatch design-preset-swatch--${preset.id}`} aria-hidden="true" />{preset.label}</button>)}</div>
    </section>

    <details className="digital-profile-design-section" open>
      <summary><span>01</span><strong>Color</strong><small>Palette, text and accent</small></summary>
      <div className="digital-profile-design-body">
        <Segmented legend="Theme" value={design.theme} choices={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={(value) => onChange(applyTheme(design, value))} />
        <div className="digital-profile-palette">
          <span>Palette</span><div>{Object.entries(COLOR_PALETTES).map(([key, colors]) => <button key={key} type="button" aria-label={key === 'warmGrey' ? 'Warm Grey' : key[0].toUpperCase() + key.slice(1)} aria-pressed={design.background.color === colors.color} onClick={() => onChange(applyColorPalette(design, key as keyof typeof COLOR_PALETTES))}><i style={{ backgroundColor: colors.color, borderColor: colors.accent }} />{key === 'warmGrey' ? 'Warm Grey' : key[0].toUpperCase() + key.slice(1)}</button>)}<button type="button" aria-label="Custom" onClick={() => customColorInput.current?.click()}><i className="design-palette-custom" />Custom</button></div>
        </div>
        <div className="digital-profile-color-fields">
          <label>Background<input ref={customColorInput} aria-label="Background color" type="color" value={design.background.color} onChange={(event) => updateBackground('color', event.currentTarget.value.toUpperCase())} /></label>
          <fieldset><legend>Text</legend><div className="design-text-control"><Segmented legend="Text color" value={design.background.text === 'auto' ? 'auto' : 'manual'} choices={[{ value: 'auto', label: 'Auto' }, { value: 'manual', label: 'Manual' }]} onChange={(value) => updateBackground('text', value === 'auto' ? 'auto' : design.background.text === 'auto' ? '#111111' : design.background.text)} /><input aria-label="Text color" type="color" value={design.background.text === 'auto' ? '#000000' : design.background.text} disabled={design.background.text === 'auto'} onChange={(event) => updateBackground('text', event.currentTarget.value.toUpperCase())} /></div>{lowContrast ? <small className="digital-profile-contrast-warning" role="status">Low contrast — text may be difficult to read.</small> : null}</fieldset>
          <label>Accent<input aria-label="Accent color" type="color" value={design.background.accent} onChange={(event) => updateBackground('accent', event.currentTarget.value.toUpperCase())} /></label>
        </div>
        <button type="button" className="digital-profile-reset-section" aria-label="Reset Color" onClick={() => onChange(resetDesignSection(design, 'color'))}>Reset section</button>
      </div>
    </details>

    <details className="digital-profile-design-section">
      <summary><span>02</span><strong>Typography</strong><small>Voice and scale</small></summary>
      <div className="digital-profile-design-body">
        <Segmented legend="Font style" value={design.typography.family} choices={[{ value: 'neo', label: 'Neo Grotesk' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }, { value: 'humanist', label: 'Humanist' }]} onChange={(value) => updateTypography('family', value)} />
        <Segmented legend="Scale" value={design.typography.scale} choices={[{ value: 'compact', label: 'Compact' }, { value: 'balanced', label: 'Balanced' }, { value: 'large', label: 'Large' }]} onChange={(value) => updateTypography('scale', value)} />
        <Segmented legend="Weight" value={design.typography.weight} choices={[{ value: 'regular', label: 'Regular' }, { value: 'medium', label: 'Medium' }, { value: 'bold', label: 'Bold' }]} onChange={(value) => updateTypography('weight', value)} />
        <button type="button" className="digital-profile-reset-section" aria-label="Reset Typography" onClick={() => onChange(resetDesignSection(design, 'typography'))}>Reset section</button>
      </div>
    </details>

    <details className="digital-profile-design-section">
      <summary><span>03</span><strong>Profile</strong><small>Portrait treatment</small></summary>
      <div className="digital-profile-design-body">
        <Segmented legend="Photo shape" value={design.profile.photoShape} choices={[{ value: 'circle', label: 'Circle' }, { value: 'rounded', label: 'Rounded' }, { value: 'square', label: 'Square' }]} onChange={(value) => updateProfile('photoShape', value)} />
        <Segmented legend="Photo size" value={design.profile.photoSize} choices={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} onChange={(value) => updateProfile('photoSize', value)} />
        <Segmented legend="Alignment" value={design.profile.alignment} choices={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]} onChange={(value) => updateProfile('alignment', value)} />
        <button type="button" className="digital-profile-reset-section" aria-label="Reset Profile" onClick={() => onChange(resetDesignSection(design, 'profile'))}>Reset section</button>
      </div>
    </details>

    <details className="digital-profile-design-section">
      <summary><span>04</span><strong>Links</strong><small>Layout and logos</small></summary>
      <div className="digital-profile-design-body">
        <Segmented legend="Links" value={design.links.style} choices={[{ value: 'icons', label: 'Icons' }, { value: 'pills', label: 'Pills' }, { value: 'rows', label: 'Rows' }, { value: 'cards', label: 'Cards' }]} disabledValues={(['icons', 'pills', 'rows', 'cards'] as const).filter((style) => !capability.linkStyles.includes(style))} onChange={(value) => updateLinks('style', value)} />
        <label className="digital-profile-toggle"><span>Show logos</span><input type="checkbox" checked={design.links.showIcons} onChange={(event) => updateLinks('showIcons', event.currentTarget.checked)} /></label>
        <Segmented legend="Icon mode" value={design.links.iconStyle} choices={[{ value: 'brand', label: 'Brand' }, { value: 'mono', label: 'Monochrome' }]} onChange={(value) => updateLinks('iconStyle', value)} />
        <Segmented legend="Link corner" value={design.links.radius} choices={[{ value: 'square', label: 'Square' }, { value: 'soft', label: 'Soft' }, { value: 'round', label: 'Round' }]} onChange={(value) => updateLinks('radius', value)} />
        <Segmented legend="Density" value={design.links.density} choices={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }]} onChange={(value) => updateLinks('density', value)} />
        <p className="digital-profile-capability-note">{template === 'minimal' ? 'Cards are not available in Minimal.' : !capability.linkStyles.includes(design.links.style) ? 'The current layout is preserved in your design and uses a safe preview style here.' : null}</p>
        <button type="button" className="digital-profile-reset-section" aria-label="Reset Links" onClick={() => onChange(resetDesignSection(design, 'links'))}>Reset section</button>
      </div>
    </details>

    <details className="digital-profile-design-section">
      <summary><span>05</span><strong>Buttons</strong><small>Actions and shape</small></summary>
      <div className="digital-profile-design-body">
        <Segmented legend="Button style" value={design.buttons.style} choices={[{ value: 'solid', label: 'Solid' }, { value: 'outline', label: 'Outline' }, { value: 'soft', label: 'Soft' }]} onChange={(value) => updateButtons('style', value)} />
        <Segmented legend="Button shape" value={design.buttons.radius} choices={[{ value: 'square', label: 'Square' }, { value: 'soft', label: 'Soft' }, { value: 'pill', label: 'Pill' }]} onChange={(value) => updateButtons('radius', value)} />
        <button type="button" className="digital-profile-reset-section" aria-label="Reset Buttons" onClick={() => onChange(resetDesignSection(design, 'buttons'))}>Reset section</button>
      </div>
    </details>

    <details className="digital-profile-design-section">
      <summary><span>06</span><strong>Footer</strong><small>Closing details</small></summary>
      <div className="digital-profile-design-body">
        <label className="digital-profile-toggle"><span>Show “Made with iq”</span><input type="checkbox" checked={design.footer.showMadeWithIq} onChange={(event) => update('footer', { ...design.footer, showMadeWithIq: event.currentTarget.checked })} /></label>
        <label className="digital-profile-toggle"><span>Show category / professional label</span><input type="checkbox" checked={design.footer.showProfessionalLabel} onChange={(event) => update('footer', { ...design.footer, showProfessionalLabel: event.currentTarget.checked })} /></label>
        <button type="button" className="digital-profile-reset-section" aria-label="Reset Footer" onClick={() => onChange(resetDesignSection(design, 'footer'))}>Reset section</button>
      </div>
    </details>
  </section>
}
