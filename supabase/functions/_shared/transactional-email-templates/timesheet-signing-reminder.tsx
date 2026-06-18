/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface Props {
  recipientName?: string
  role?: string
  clientName?: string
  caregiverName?: string
  periodStart?: string
  periodEnd?: string
  evvHours?: string
  approvedHours?: string
  variance?: string
  mismatchCount?: number
  signUrl?: string
}

const TimesheetSigningReminder = ({
  recipientName, role, clientName, caregiverName, periodStart, periodEnd,
  evvHours, approvedHours, variance, mismatchCount, signUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Timesheet awaiting your signature ({role})</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Timesheet awaiting your signature</Heading>
        <Text style={text}>
          Hi{recipientName ? ` ${recipientName}` : ''}, please review and e-sign the timesheet below as the
          <strong> {role ?? 'signer'}</strong>. Audit retention requires all three signatures (caregiver, client/representative, supervisor).
        </Text>
        <Section style={card}>
          <Text style={kv}><strong>Client:</strong> {clientName ?? '—'}</Text>
          <Text style={kv}><strong>Caregiver:</strong> {caregiverName ?? '—'}</Text>
          <Text style={kv}><strong>Period:</strong> {periodStart} → {periodEnd}</Text>
          <Text style={kv}><strong>EVV hours:</strong> {evvHours} &nbsp;•&nbsp; <strong>Approved:</strong> {approvedHours} &nbsp;•&nbsp; <strong>Variance:</strong> {variance}</Text>
          {mismatchCount && mismatchCount > 0 ? (
            <Text style={{ ...kv, color: '#b91c1c' }}>
              ⚠ {mismatchCount} EVV/Sandata mismatch{mismatchCount === 1 ? '' : 'es'} detected — please review before signing.
            </Text>
          ) : (
            <Text style={{ ...kv, color: '#15803d' }}>✓ EVV reconciled with Sandata.</Text>
          )}
        </Section>
        {signUrl ? (
          <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
            <Button href={signUrl} style={btn}>Open & sign</Button>
          </Section>
        ) : null}
        <Text style={footer}>Sent by {SITE_NAME}. You will continue to receive reminders until the timesheet is fully signed.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TimesheetSigningReminder,
  subject: (d: Record<string, any>) =>
    `Action required: e-sign timesheet (${d.role ?? 'signer'}) — ${d.periodStart} to ${d.periodEnd}`,
  displayName: 'Timesheet signing reminder',
  previewData: {
    recipientName: 'Maria',
    role: 'caregiver',
    clientName: 'John D.',
    caregiverName: 'Maria S.',
    periodStart: '2026-04-21',
    periodEnd: '2026-05-04',
    evvHours: '42.50',
    approvedHours: '42.75',
    variance: '-0.25',
    mismatchCount: 0,
    signUrl: 'https://example.com/timesheets/abc',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(203, 24%, 12%)', margin: '0 0 18px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 35%)', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: 'hsl(210, 40%, 96%)', borderRadius: '8px', padding: '16px 18px', margin: '0 0 22px' }
const kv = { fontSize: '14px', color: 'hsl(203, 24%, 18%)', margin: '0 0 6px' }
const btn = { backgroundColor: 'hsl(203, 76%, 38%)', color: '#fff', padding: '12px 22px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '24px 0 0' }