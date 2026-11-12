import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { shareLink } from '../../lib/shareLink'
import EquipmentPicker from './EquipmentPicker'
import { cleanEquipment, BOX_PRESET, HOME_PRESET, type EquipmentId } from '../../lib/equipment'
import { fetchMyEquipment, saveMyEquipment } from '../../lib/profileRole'
import { getLocalUser } from '../../lib/currentUser'
import {
  createInvite, fetchMyCenter, fetchTeam, inviteUrl, isLead, isStaff, memberInviteToken,
  removeMember, setMemberRole, updateCenter, type CenterRole, type MyCenter, type StaffInviteRole, type TeamMember
} from '../../lib/center'

type Notice = (n: { kind: 'ok' | 'err'; text: string }) => void

/**
 * Réglages du centre : nom, équipement, équipe et invitations pour l'équipe ;
 * le centre et « quitter » pour un membre ; l'équipement de la maison pour
 * un compte sans centre.
 */
export default function CenterSettings({ onNotice }: { onNotice: Notice }) {
  const { t } = useTranslation('common')
  const [mine, setMine] = useState<MyCenter | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [equipment, setEquipment] = useState<EquipmentId[]>([])
  const [savedEquipment, setSavedEquipment] = useState<EquipmentId[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [busy, setBusy] = useState(false)

  const apply = useCallback((m: MyCenter | null, members: TeamMember[], own: EquipmentId[]) => {
    setMine(m)
    setTeam(members)
    const list = m ? m.center.equipment : own
    if (m) setName(m.center.name)
    setEquipment(list)
    setSavedEquipment(list)
  }, [])

  const fetchState = useCallback(async () => {
    const m = await fetchMyCenter()
    const members = m && isStaff(m.role) ? await fetchTeam(m.center.id) : []
    const own = m ? [] : cleanEquipment(await fetchMyEquipment())
    return [m, members, own] as const
  }, [])

  const load = async () => apply(...(await fetchState()))

  useEffect(() => {
    let alive = true
    fetchState()
      .then((state) => { if (alive) apply(...state) })
      .catch(() => { if (alive) setMine(null) })
    return () => { alive = false }
  }, [fetchState, apply])

  const fail = (err: unknown) => onNotice({ kind: 'err', text: err instanceof Error ? err.message : t('errors.generic') })

  async function share(token: string, title: string) {
    const url = inviteUrl(token)
    const outcome = await shareLink({ title, text: title, url })
    if (outcome === 'copied') onNotice({ kind: 'ok', text: t('center.link_copied') })
    else if (outcome === 'failed') onNotice({ kind: 'ok', text: url })
  }

  async function run(action: () => Promise<void>, okText?: string) {
    setBusy(true)
    try {
      await action()
      if (okText) onNotice({ kind: 'ok', text: okText })
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  if (mine === undefined) return null

  const equipmentChanged = equipment.join() !== savedEquipment.join()
  const equipmentBlock = (canEdit: boolean, preset: EquipmentId[], presetLabel: string, save: () => Promise<void>) => (
    <Row label={t('center.equipment')} hint={canEdit ? t('center.equipment_hint') : t('center.equipment_readonly')}>
      {canEdit ? (
        <>
          <EquipmentPicker value={equipment} onChange={setEquipment} preset={preset} presetLabel={presetLabel} />
          <button type="button" className="wb-btn wb-btn--secondary" disabled={busy || !equipmentChanged} onClick={() => { void run(async () => { await save(); setSavedEquipment(equipment) }, t('center.equipment_saved')) }}>
            {t('center.save')}
          </button>
        </>
      ) : (
        <p className="wb-equip-list">
          {equipment.length ? equipment.map((e) => t(`equipment.items.${e}`)).join(' · ') : t('equipment.bodyweight_hint')}
        </p>
      )}
    </Row>
  )

  // Sans centre : l'équipement de la maison.
  if (!mine) {
    return (
      <Section title={t('center.my_equipment')}>
        {equipmentBlock(true, HOME_PRESET, t('equipment.preset_home'), () => saveMyEquipment(equipment))}
        <Row label={t('center.no_center')} hint={t('center.no_center_hint')}><span /></Row>
      </Section>
    )
  }

  const { center, role } = mine
  const lead = isLead(role)
  const owner = role === 'owner'

  // Membre : son centre, l'équipement en lecture, et quitter.
  if (!isStaff(role)) {
    return (
      <Section title={t('center.my_center')}>
        <Row label={center.name} hint={t('center.member_hint')}><span /></Row>
        {equipmentBlock(false, BOX_PRESET, '', async () => {})}
        <Row label={t('center.leave')}>
          <button
            type="button"
            className="wb-btn wb-btn--danger"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(t('center.leave_confirm', { name: center.name }))) return
              void run(async () => {
                const { data } = await getLocalUser()
                if (data.user) await removeMember(center.id, data.user.id)
                await load()
              }, t('center.left'))
            }}
          >
            {t('center.leave')}
          </button>
        </Row>
      </Section>
    )
  }

  const staffRoles: StaffInviteRole[] = owner ? ['head_coach', 'coach'] : ['coach']

  return (
    <>
      <Section title={t('center.my_center')}>
        <Row label={t('center.name')} hint={t(`center.role_${role}`)}>
          {lead ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="wb-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              <button
                type="button"
                className="wb-btn wb-btn--secondary"
                disabled={busy || name.trim().length < 2 || name.trim() === center.name}
                onClick={() => { void run(async () => { await updateCenter(center.id, { name: name.trim() }); await load() }, t('center.name_saved')) }}
              >
                {t('center.save')}
              </button>
            </div>
          ) : (
            <span>{center.name}</span>
          )}
        </Row>
        {equipmentBlock(lead, BOX_PRESET, t('equipment.preset_box'), () => updateCenter(center.id, { equipment }))}
      </Section>

      <Section title={t('center.team')}>
        <Row label={t('center.invite_members')} hint={t('center.invite_members_hint')}>
          <button
            type="button"
            className="wb-btn wb-btn--primary"
            disabled={busy}
            onClick={() => { void run(async () => share(await memberInviteToken(center.id), t('center.share_member_title', { name: center.name }))) }}
          >
            {t('center.share_link')}
          </button>
        </Row>
        <Row label={t('center.invite_staff')} hint={t('center.invite_staff_hint')}>
          {lead ? (
            <div className="wb-welcome-chips">
              {staffRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="wb-chip"
                  disabled={busy}
                  onClick={() => { void run(async () => share(await createInvite(center.id, r), t('center.share_staff_title', { name: center.name }))) }}
                >
                  {t(`center.invite_as_${r}`)}
                </button>
              ))}
            </div>
          ) : (
            <span className="wb-set-hint">{t('center.invite_staff_lead_only')}</span>
          )}
        </Row>

        <ul className="wb-list wb-team">
          {team.map((m) => (
            <li key={m.user_id} className="wb-row wb-team-row">
              <span className="wb-team-avatar" aria-hidden="true">
                {m.avatar_url ? <img src={m.avatar_url} alt="" /> : (m.full_name ?? '?').trim().charAt(0).toUpperCase()}
              </span>
              <span className="wb-team-name">{m.full_name || t('center.unnamed')}</span>
              {owner && m.role !== 'owner' ? (
                <span className="wb-team-actions">
                  <select
                    className="wb-input wb-team-role"
                    value={m.role}
                    aria-label={t('center.role_of', { name: m.full_name || t('center.unnamed') })}
                    disabled={busy}
                    onChange={(e) => {
                      const next = e.target.value as Exclude<CenterRole, 'owner'>
                      void run(async () => { await setMemberRole(center.id, m.user_id, next); await load() }, t('center.role_saved'))
                    }}
                  >
                    {(['head_coach', 'coach', 'member'] as const).map((r) => <option key={r} value={r}>{t(`center.role_${r}`)}</option>)}
                  </select>
                  <button
                    type="button"
                    className="wb-btn wb-btn--danger wb-btn--sm"
                    disabled={busy}
                    aria-label={t('center.remove_of', { name: m.full_name || t('center.unnamed') })}
                    onClick={() => {
                      if (!window.confirm(t('center.remove_confirm', { name: m.full_name || t('center.unnamed') }))) return
                      void run(async () => { await removeMember(center.id, m.user_id); await load() }, t('center.removed'))
                    }}
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <span className="wb-chip wb-team-badge">{t(`center.role_${m.role}`)}</span>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="wb-home-sec">
      <div className="wb-sec"><h2>{title}</h2></div>
      <div className="wb-card wb-set-card">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="wb-set-row">
      <span className="wb-set-label">{label}</span>
      {children}
      {hint && <span className="wb-set-hint">{hint}</span>}
    </div>
  )
}
