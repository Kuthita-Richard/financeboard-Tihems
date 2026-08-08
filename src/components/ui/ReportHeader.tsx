import type { OrgSettings } from '@/types'

interface Props {
  settings: OrgSettings
  title: string
  subtitle?: string
}

const Logo = ({ src, alt, size = 36 }: { src: string; alt: string; size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URLs; plain <img> is more reliable for print than next/image
  <img src={src} alt={alt} style={{ height: size, width: 'auto', objectFit: 'contain' }} />
)

export function ReportHeader({ settings, title, subtitle }: Props) {
  const rightLogo =
    (settings.logoPositionSecondary === 'Right' && settings.logoUrlSecondary) ||
    (settings.logoPositionTertiary === 'Right' && settings.logoUrlTertiary) || ''
  const upperCenterLogo =
    (settings.logoPositionSecondary === 'Upper Center' && settings.logoUrlSecondary) ||
    (settings.logoPositionTertiary === 'Upper Center' && settings.logoUrlTertiary) || ''
  const extraLeftLogo =
    (settings.logoPositionSecondary === 'Left' && settings.logoUrlSecondary) ||
    (settings.logoPositionTertiary === 'Left' && settings.logoUrlTertiary) || ''

  return (
    <div className="mb-4 pb-4 border-b" style={{ borderColor: '#bfdbfe' }}>
      {upperCenterLogo && (
        <div className="flex justify-center mb-2">
          <Logo src={upperCenterLogo} alt="" size={40} />
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {settings.logoUrlLight && <Logo src={settings.logoUrlLight} alt={settings.orgName} />}
          {extraLeftLogo && <Logo src={extraLeftLogo} alt="" size={30} />}
          <div>
            <p className="text-sm font-bold" style={{ color: '#0c1a2e' }}>{settings.orgName}</p>
            <p className="text-xs" style={{ color: '#4b6a8f' }}>
              {title}{subtitle ? ` — ${subtitle}` : ''}
            </p>
          </div>
        </div>
        {rightLogo && <Logo src={rightLogo} alt="" size={30} />}
      </div>
    </div>
  )
}
