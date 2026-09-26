'use client'

import { useState } from 'react'
import { updateGiftDetails } from '@/app/actions/gifts'

type Details = { profileId: string; fullName: string; role: string; tagline: string; phone: string; whatsapp: string; location: string; linkedin: string; instagram: string; website: string }

export function GiftDetailsForm({ details }: { details: Details }) {
  const [notice, setNotice] = useState('')
  async function submit(form: FormData) {
    setNotice('')
    const result = await updateGiftDetails(form)
    if (!result.ok) { setNotice(result.error); return }
    setNotice('Details saved and published.')
  }
  return <form action={submit} className="gift-form">
    <input type="hidden" name="profileId" value={details.profileId} />
    <label>Full name *<input name="fullName" defaultValue={details.fullName} required maxLength={161} /></label>
    <label>Role *<input name="role" defaultValue={details.role} required /></label>
    <label>Tagline<input name="tagline" defaultValue={details.tagline} /></label><label>Phone<input name="phone" defaultValue={details.phone} /></label><label>WhatsApp<input name="whatsapp" defaultValue={details.whatsapp} /></label><label>Location<input name="location" defaultValue={details.location} /></label>
    <label>LinkedIn<input name="linkedin" type="url" defaultValue={details.linkedin} /></label><label>Instagram<input name="instagram" type="url" defaultValue={details.instagram} /></label><label>Website<input name="website" type="url" defaultValue={details.website} /></label>
    {notice ? <p role="status">{notice}</p> : null}<button type="submit">SAVE &amp; PUBLISH DETAILS</button>
  </form>
}
