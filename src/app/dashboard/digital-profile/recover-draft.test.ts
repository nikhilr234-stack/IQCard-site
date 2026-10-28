import { expect, it } from 'vitest'
import { recoverDraft } from './recover-draft'

it('recovers only local edits while retaining separately saved media and normalized fields', () => {
  const baseline = { profile: { name: 'Ada ', headline: 'Math' }, cover: { path: 'old' }, links: [{ label: '', url: '' }] }
  const local = { ...baseline, profile: { ...baseline.profile, headline: 'Science' } }
  const current = { profile: { name: 'Ada', headline: 'Math' }, cover: { path: 'new' }, links: [] }
  expect(recoverDraft(current, baseline, local).value).toEqual({ profile: { name: 'Ada', headline: 'Science' }, cover: { path: 'new' }, links: [] })
})

it('flags overlapping server changes so the owner reviews the recovered local edit before saving', () => {
  expect(recoverDraft({ name: 'Remote' }, { name: 'Original' }, { name: 'Local' })).toEqual({ value: { name: 'Local' }, conflicts: true })
})
