import type { IconType } from 'react-icons'
import {
  FaBehance,
  FaDribbble,
  FaFacebook,
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaMedium,
  FaPinterest,
  FaSpotify,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6'
import { SiApplemusic, SiSubstack } from 'react-icons/si'
import { LuBriefcaseBusiness, LuExternalLink, LuGlobe, LuMail, LuPhone } from 'react-icons/lu'

type LinkIconDefinition = { key: string; Icon: IconType; brandColor: string }

const ICONS: Record<string, LinkIconDefinition> = {
  linkedin: { key: 'linkedin', Icon: FaLinkedin, brandColor: '#0A66C2' },
  instagram: { key: 'instagram', Icon: FaInstagram, brandColor: '#E4405F' },
  x: { key: 'x', Icon: FaXTwitter, brandColor: '#111111' },
  facebook: { key: 'facebook', Icon: FaFacebook, brandColor: '#0866FF' },
  youtube: { key: 'youtube', Icon: FaYoutube, brandColor: '#FF0000' },
  github: { key: 'github', Icon: FaGithub, brandColor: '#181717' },
  behance: { key: 'behance', Icon: FaBehance, brandColor: '#1769FF' },
  dribbble: { key: 'dribbble', Icon: FaDribbble, brandColor: '#EA4C89' },
  pinterest: { key: 'pinterest', Icon: FaPinterest, brandColor: '#BD081C' },
  tiktok: { key: 'tiktok', Icon: FaTiktok, brandColor: '#111111' },
  spotify: { key: 'spotify', Icon: FaSpotify, brandColor: '#1DB954' },
  applemusic: { key: 'applemusic', Icon: SiApplemusic, brandColor: '#FA243C' },
  whatsapp: { key: 'whatsapp', Icon: FaWhatsapp, brandColor: '#25D366' },
  email: { key: 'email', Icon: LuMail, brandColor: '#73777F' },
  phone: { key: 'phone', Icon: LuPhone, brandColor: '#73777F' },
  website: { key: 'website', Icon: LuGlobe, brandColor: '#73777F' },
  portfolio: { key: 'portfolio', Icon: LuBriefcaseBusiness, brandColor: '#73777F' },
  medium: { key: 'medium', Icon: FaMedium, brandColor: '#000000' },
  substack: { key: 'substack', Icon: SiSubstack, brandColor: '#FF6719' },
  external: { key: 'external', Icon: LuExternalLink, brandColor: 'currentColor' },
}

const LABELS: Record<string, string> = {
  linkedin: 'linkedin', instagram: 'instagram', x: 'x', twitter: 'x', facebook: 'facebook',
  youtube: 'youtube', github: 'github', behance: 'behance', dribbble: 'dribbble',
  pinterest: 'pinterest', tiktok: 'tiktok', spotify: 'spotify', applemusic: 'applemusic',
  whatsapp: 'whatsapp', email: 'email', mail: 'email', phone: 'phone', call: 'phone',
  website: 'website', web: 'website', portfolio: 'portfolio', medium: 'medium', substack: 'substack',
}

const HOSTS: Array<[string, string]> = [
  ['linkedin.com', 'linkedin'], ['instagram.com', 'instagram'], ['x.com', 'x'], ['twitter.com', 'x'],
  ['facebook.com', 'facebook'], ['youtu.be', 'youtube'], ['youtube.com', 'youtube'], ['github.com', 'github'],
  ['behance.net', 'behance'], ['dribbble.com', 'dribbble'], ['pinterest.com', 'pinterest'],
  ['tiktok.com', 'tiktok'], ['spotify.com', 'spotify'], ['music.apple.com', 'applemusic'],
  ['whatsapp.com', 'whatsapp'], ['wa.me', 'whatsapp'], ['medium.com', 'medium'], ['substack.com', 'substack'],
]

function labelKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function urlKey(url: string): string | undefined {
  if (/^mailto:/i.test(url)) return 'email'
  if (/^tel:/i.test(url)) return 'phone'
  try {
    const { hostname } = new URL(url)
    return HOSTS.find(([domain]) => hostname === domain || hostname.endsWith(`.${domain}`))?.[1]
  } catch {
    return undefined
  }
}

export function getLinkIcon(label: string, url: string): LinkIconDefinition {
  const key = LABELS[labelKey(label)] ?? urlKey(url) ?? 'external'
  return ICONS[key] ?? ICONS.external
}
