/** @vitest-environment jsdom */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import ts from 'typescript'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PublicProfileMenu } from '@/components/public-profile-menu'
import { trapDialogFocus } from './focus-trap'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function tabEvent(shiftKey = false) {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Tab',
    shiftKey,
  })
}

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function parseTsx(path: string) {
  return ts.createSourceFile(path, readSource(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

function jsxName(node: ts.JsxOpeningLikeElement) {
  return node.tagName.getText()
}

function jsxAttribute(node: ts.JsxOpeningLikeElement, name: string) {
  return node.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute => ts.isJsxAttribute(attribute) && attribute.name.getText() === name,
  )
}

function collectOpeningElements(sourceFile: ts.SourceFile) {
  const elements: ts.JsxOpeningLikeElement[] = []
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) elements.push(node)
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return elements
}

describe('trapDialogFocus', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('wraps Tab from the final control to the first control', () => {
    document.body.innerHTML = '<section><button>Close</button><a href="/next">Next</a></section>'
    const container = document.querySelector('section')!
    const controls = container.querySelectorAll<HTMLElement>('button, a')
    controls[1].focus()
    const event = tabEvent()

    trapDialogFocus(container, event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(controls[0])
  })

  it('wraps Shift+Tab from the first control to the final control', () => {
    document.body.innerHTML = '<section><button>Close</button><a href="/next">Next</a></section>'
    const container = document.querySelector('section')!
    const controls = container.querySelectorAll<HTMLElement>('button, a')
    controls[0].focus()
    const event = tabEvent(true)

    trapDialogFocus(container, event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(controls[1])
  })

  it('keeps focus on the dialog when it has no focusable controls', () => {
    document.body.innerHTML = '<button>Outside</button><section tabindex="-1"><p>Empty</p></section>'
    const outside = document.querySelector<HTMLElement>('button')!
    const container = document.querySelector<HTMLElement>('section')!
    outside.focus()
    const event = tabEvent()

    trapDialogFocus(container, event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(container)
  })
})

describe('dialog and form accessibility contracts', () => {
  it('leaves Escape closing to both overlay components and keeps the backdrop out of the tab order', () => {
    const menu = readSource('src/components/public-profile-menu.tsx')
    const ownerCenter = readSource('src/app/dashboard/live-owner-center.tsx')

    expect(menu).toContain("event.key === 'Escape'")
    expect(menu).toContain('trapDialogFocus')
    expect(menu).toContain('tabIndex={-1}')
    expect(ownerCenter).toContain("event.key === 'Escape'")
    expect(ownerCenter).toContain('trapDialogFocus')
  })

  it.each([
    'src/app/onboarding/onboarding-wizard.tsx',
  ])('%s gives every form control an ID and every label an explicit target', (path) => {
    const elements = collectOpeningElements(parseTsx(path))
    const controls = elements.filter((element) => ['input', 'textarea'].includes(jsxName(element)))
    const labels = elements.filter((element) => jsxName(element) === 'label')
    const literalIds = controls
      .map((control) => jsxAttribute(control, 'id')?.initializer)
      .filter((initializer): initializer is ts.StringLiteral => Boolean(initializer && ts.isStringLiteral(initializer)))
      .map((initializer) => initializer.text)

    expect(controls.length).toBeGreaterThan(0)
    expect(controls.every((control) => Boolean(jsxAttribute(control, 'id')))).toBe(true)
    expect(labels.every((label) => Boolean(jsxAttribute(label, 'htmlFor')))).toBe(true)
    expect(new Set(literalIds).size).toBe(literalIds.length)
  })

  it('keeps the owner dashboard free of the retired embedded setup form', () => {
    const elements = collectOpeningElements(parseTsx('src/app/dashboard/profile-editor.tsx'))
    const controls = elements.filter((element) => ['input', 'textarea'].includes(jsxName(element)))

    expect(controls).toHaveLength(0)
  })

  it('does not nest contact or visibility labels', () => {
    for (const path of [
      'src/app/onboarding/onboarding-wizard.tsx',
      'src/app/dashboard/profile-editor.tsx',
    ]) {
      const sourceFile = parseTsx(path)
      const labels = collectOpeningElements(sourceFile).filter((element) => jsxName(element) === 'label')

      for (const label of labels) {
        const parentLabel = label.parent.parent
        expect(ts.isJsxElement(parentLabel) && jsxName(parentLabel.openingElement) === 'label').toBe(false)
      }
    }
  })
})

describe('PublicProfileMenu focus restoration', () => {
  it('restores focus to the clicked trigger even when pointer activation did not focus it', async () => {
    document.body.innerHTML = '<button id="previous">Previously focused</button><div id="root"></div>'
    const previous = document.querySelector<HTMLElement>('#previous')!
    const host = document.querySelector<HTMLElement>('#root')!
    const root = createRoot(host)
    previous.focus()

    await act(async () => root.render(createElement(PublicProfileMenu, { slug: 'ada' })))
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Open profile menu"]')!
    expect(document.activeElement).toBe(previous)

    await act(async () => trigger.click())
    expect(document.activeElement).toBe(host.querySelector('[aria-label="Close profile menu"]:not(.public-menu-backdrop)'))

    await act(async () => host.querySelector<HTMLButtonElement>('.public-menu-close')!.click())
    expect(document.activeElement).toBe(trigger)

    await act(async () => root.unmount())
  })

  it('does not try to restore a trigger that disconnected while the menu was open', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const host = document.querySelector<HTMLElement>('#root')!
    const root = createRoot(host)
    await act(async () => root.render(createElement(PublicProfileMenu, { slug: 'ada' })))
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Open profile menu"]')!

    await act(async () => trigger.click())
    const focus = vi.spyOn(trigger, 'focus')
    await act(async () => root.unmount())

    expect(trigger.isConnected).toBe(false)
    expect(focus).not.toHaveBeenCalled()
  })
})
