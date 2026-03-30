// Config
// ------------
// Description: The configuration file for the website.

export interface Logo {
  src: string
  srcDark: string
  alt: string
}

export type Mode = 'auto' | 'light' | 'dark'

export interface Config {
  siteTitle: string
  siteDescription: string
  ogImage: string
  logo: Logo
  canonical: boolean
  noindex: boolean
  mode: Mode
  scrollAnimations: boolean
}

export const configData: Config = {
  siteTitle: 'PulseNote | Source-backed release communication',
  siteDescription:
    'PulseNote helps product teams turn release context into reviewable, approval-ready public communication with claim checks and publish-pack export.',
  ogImage: '',
  logo: {
    src: '/brand-mark.svg',
    srcDark: '/brand-mark.svg',
    alt: 'PulseNote logo'
  },
  canonical: true,
  noindex: false,
  mode: 'light',
  scrollAnimations: true
}
