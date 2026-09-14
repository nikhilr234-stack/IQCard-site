type Contact = { fullName: string; phone: string; email: string; headline: string }
const clean = (value: string) => value.replace(/[\\;\n\r]/g, ' ')
export function createVCard(contact: Contact) {
  return ['BEGIN:VCARD','VERSION:3.0',`FN:${clean(contact.fullName)}`,`TITLE:${clean(contact.headline)}`,contact.phone ? `TEL;TYPE=CELL:${clean(contact.phone)}` : '',contact.email ? `EMAIL:${clean(contact.email)}` : '','END:VCARD',''].filter(Boolean).join('\r\n')
}
