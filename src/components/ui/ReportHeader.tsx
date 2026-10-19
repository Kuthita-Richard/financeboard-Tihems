import type { OrgSettings } from '@/types'

interface Props {
  settings: OrgSettings
  title: string
  subtitle?: string
}

// Logo heights in px. The secondary/tertiary logos are 1.5× their previous
// sizes (flank logos 30 → 45, upper-centre logo 40 → 60). The primary logo
// keeps its previous 36 — it only changed position, not size.
const PRIMARY_H = 36
const FLANK_H = 45
const UPPER_CENTER_H = 60

const Logo = ({ src, alt, size }: { src: string; alt: string; size: number }) => (
  // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URLs; plain <img> is more reliable for print than next/image
  <img src={src} alt={alt} style={{ height: size, width: 'auto', objectFit: 'contain' }} />
)

/**
 * Layout: the primary logo sits top-centre with the organisation name and
 * report title stacked beneath it. The secondary/tertiary logos flank that
 * centre block. A 1fr / auto / 1fr grid keeps the centre block truly
 * centred even when only one side logo exists, and each side logo is
 * pushed toward the centre (rather than to the page edge) inside a
 * max-width container — previously `justify-between` threw the right-hand
 * logo to the far edge of the page, "too far away" from everything else.
 *
 * Shared by the on-screen header and the print-only repeating copy so the
 * two can never drift apart.
 */
function HeaderBlock({ settings, title, subtitle }: Props) {
  const rightLogo =
    (settings.logoPositionSecondary === 'Right' && settings.logoUrlSecondary) ||
    (settings.logoPositionTertiary === 'Right' && settings.logoUrlTertiary) || ''
  const upperCenterLogo =
    (settings.logoPositionSecondary === 'Upper Center' && settings.logoUrlSecondary) ||
    (settings.logoPositionTertiary === 'Upper Center' && settings.logoUrlTertiary) || ''
  const leftLogo =
    (settings.logoPositionSecondary === 'Left' && settings.logoUrlSecondary) ||
    (settings.logoPositionTertiary === 'Left' && settings.logoUrlTertiary) || ''

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {leftLogo && <Logo src={leftLogo} alt="" size={FLANK_H} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {(settings.logoUrlLight || upperCenterLogo) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 6 }}>
              {settings.logoUrlLight && <Logo src={settings.logoUrlLight} alt={settings.orgName} size={PRIMARY_H} />}
              {upperCenterLogo && <Logo src={upperCenterLogo} alt="" size={UPPER_CENTER_H} />}
            </div>
          )}
          <p style={{ color: '#0c1a2e', fontSize: 14, fontWeight: 700, margin: 0 }}>{settings.orgName}</p>
          <p style={{ color: '#4b6a8f', fontSize: 12, margin: 0 }}>
            {title}{subtitle ? ` — ${subtitle}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          {rightLogo && <Logo src={rightLogo} alt="" size={FLANK_H} />}
        </div>
      </div>
    </div>
  )
}

/**
 * Wraps a whole report. The header is the <thead> of a single-column frame
 * table and the report content is its <tbody>, which is the one technique
 * every browser honours for repeating content at the top of EVERY printed
 * page — including the last. (A position:fixed header was tried first and
 * measured against a real print engine: it can't be placed in the page
 * margin, gets relocated to the bottom of the page, and is dropped from the
 * final page.) On screen it simply looks like a header above the report.
 */
export function ReportFrame({ children, ...headerProps }: Props & { children: React.ReactNode }) {
  return (
    <table className="report-frame">
      <thead>
        <tr><td className="report-frame-head"><HeaderBlock {...headerProps} /></td></tr>
        <tr><td className="report-frame-gap" /></tr>
      </thead>
      <tbody>
        <tr><td>{children}</td></tr>
      </tbody>
    </table>
  )
}
