import { redirect } from 'next/navigation'

/**
 * /settings root — redirect to first tab (Identity)
 * so navigating to /settings always lands somewhere useful.
 */
export default function SettingsRootPage() {
  redirect('/settings/identity')
}
