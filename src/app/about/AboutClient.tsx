'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, Globe, Link2 } from 'lucide-react'
import type { TihemsCompanyInfo } from '@/types'

interface Props { info: TihemsCompanyInfo }

const SOCIALS: { key: keyof TihemsCompanyInfo; icon: React.ElementType; label: string }[] = [
  { key: 'linkedinUrl',  icon: Link2, label: 'LinkedIn' },
  { key: 'twitterUrl',   icon: Link2, label: 'Twitter / X' },
  { key: 'facebookUrl',  icon: Link2, label: 'Facebook' },
  { key: 'instagramUrl', icon: Link2, label: 'Instagram' },
]

export default function AboutClient({ info }: Props) {
  const pages = info.pages.length ? info.pages : []
  const [activeId, setActiveId] = useState(pages[0]?.id ?? '')
  const active = pages.find(pg => pg.id === activeId) ?? pages[0]

  const hasContact = info.email || info.phone || info.address || info.website
  const hasSocials = SOCIALS.some(s => info[s.key])

  return (
    <div className="min-h-screen" style={{ background: '#f0f7ff' }}>
      <nav className="border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ background: '#ffffff', borderColor: '#bfdbfe' }}>
        <div className="flex items-center gap-2.5">
          <Image src="/brand/tihems-icon.jpeg" alt={info.companyName} width={28} height={28} className="rounded-lg" />
          <span className="font-bold text-sm" style={{ color: '#0c1a2e' }}>{info.companyName}</span>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70" style={{ color: '#4b6a8f' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </nav>

      {/* Hero */}
      <div className="px-6 py-14 text-center" style={{ background: '#0c3460' }}>
        <Image src="/brand/tihems-logo-dark.jpeg" alt={info.companyName} width={120} height={120}
          className="mx-auto rounded-2xl mb-5" style={{ objectFit: 'contain' }} />
        <h1 className="text-3xl font-extrabold text-white">{info.companyName}</h1>
        {info.tagline && <p className="mt-2 text-base max-w-xl mx-auto" style={{ color: '#93c5fd' }}>{info.tagline}</p>}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {pages.length > 0 && (
          <>
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b pb-3" style={{ borderColor: '#bfdbfe' }}>
              {pages.map(pg => (
                <button key={pg.id} onClick={() => setActiveId(pg.id)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={active?.id === pg.id
                    ? { background: '#0284c7', color: 'white' }
                    : { background: '#ffffff', color: '#4b6a8f', border: '1px solid #bfdbfe' }}>
                  {pg.title}
                </button>
              ))}
            </div>

            {/* Active tab content */}
            {active && (
              <div className="rounded-2xl border p-8 mb-8" style={{ background: '#ffffff', borderColor: '#bfdbfe' }}>
                <h2 className="text-xl font-bold mb-4" style={{ color: '#0c1a2e' }}>{active.title}</h2>
                <div className="space-y-4">
                  {active.content.split(/\n\s*\n/).filter(Boolean).map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: '#334155' }}>{para}</p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Contact & socials */}
        {(hasContact || hasSocials) && (
          <div className="rounded-2xl border p-8" style={{ background: '#ffffff', borderColor: '#bfdbfe' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#0c1a2e' }}>Get in Touch</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              {info.email && (
                <a href={`mailto:${info.email}`} className="flex items-center gap-3 text-sm hover:opacity-70" style={{ color: '#334155' }}>
                  <Mail size={16} style={{ color: '#0284c7' }} /> {info.email}
                </a>
              )}
              {info.phone && (
                <div className="flex items-center gap-3 text-sm" style={{ color: '#334155' }}>
                  <Phone size={16} style={{ color: '#0284c7' }} /> {info.phone}
                </div>
              )}
              {info.address && (
                <div className="flex items-center gap-3 text-sm" style={{ color: '#334155' }}>
                  <MapPin size={16} style={{ color: '#0284c7' }} /> {info.address}
                </div>
              )}
              {info.website && (
                <a href={info.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:opacity-70" style={{ color: '#334155' }}>
                  <Globe size={16} style={{ color: '#0284c7' }} /> {info.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            {hasSocials && (
              <div className="flex flex-wrap gap-2 pt-4 border-t" style={{ borderColor: '#e0f2fe' }}>
                {SOCIALS.filter(s => info[s.key]).map(s => (
                  <a key={s.key} href={info[s.key] as string} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-70"
                    style={{ background: '#e0f2fe', color: '#0284c7' }}>
                    <s.icon size={13} /> {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: '#93a5bd' }}>
          © {new Date().getFullYear()} {info.companyName}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
