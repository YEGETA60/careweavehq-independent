/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface UserRow {
  name: string
  email?: string
  expired: number
  dueSoon: number
  missing: number
  courses: string[]
}

interface Props {
  recipientName?: string
  weekOf?: string
  totals?: { expired: number; dueSoon: number; missing: number; usersAffected: number }
  users?: UserRow[]
  appUrl?: string
}

const TrainingOverdueDigest = ({ recipientName, weekOf, totals, users = [], appUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Weekly training compliance digest</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Weekly training compliance digest</Heading>
        <Text style={text}>
          Hi{recipientName ? ` ${recipientName}` : ''}, here is the training & compliance
          status across your team{weekOf ? ` for the week of ${weekOf}` : ''}.
        </Text>
        {totals && (
          <Section style={card}>
            <Text style={kv}><strong>Staff affected:</strong> {totals.usersAffected}</Text>
            <Text style={kv}><strong>Expired certifications:</strong> {totals.expired}</Text>
            <Text style={kv}><strong>Expiring within 30 days:</strong> {totals.dueSoon}</Text>
            <Text style={kv}><strong>Never started:</strong> {totals.missing}</Text>
          </Section>
        )}
        <Heading as="h2" style={h2}>Staff requiring attention</Heading>
        <Section style={card}>
          {users.length === 0 ? (
            <Text style={kv}>Everyone is current. Great work!</Text>
          ) : (
            users.map((u, i) => (
              <Text key={i} style={kv}>
                <strong>{u.name}</strong>{u.email ? ` (${u.email})` : ''} —{' '}
                {u.expired} expired, {u.dueSoon} due soon, {u.missing} missing
                <br />
                <span style={muted}>{u.courses.join(' · ')}</span>
              </Text>
            ))
          )}
        </Section>
        <Text style={text}>
          Open the Training module in {SITE_NAME} to review assignments and follow up
          {appUrl ? `: ${appUrl}` : ''}.
        </Text>
        <Text style={footer}>Sent by {SITE_NAME} compliance reminders.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrainingOverdueDigest,
  subject: (d: Record<string, any>) => {
    const n = d.totals?.usersAffected ?? (d.users?.length ?? 0)
    return `Weekly training digest: ${n} staff need attention`
  },
  displayName: 'Training overdue — management digest',
  previewData: {
    recipientName: 'Pat',
    weekOf: '2026-05-04',
    totals: { expired: 3, dueSoon: 5, missing: 2, usersAffected: 4 },
    users: [
      { name: 'Maria Lopez', email: 'maria@example.com', expired: 2, dueSoon: 1, missing: 0, courses: ['HIPAA Privacy & Security', 'CPR & First Aid', 'Bloodborne Pathogens'] },
      { name: 'Ben Carter', email: 'ben@example.com', expired: 0, dueSoon: 2, missing: 1, courses: ['Dementia Care', 'Manual Handling', 'Sexual Harassment Prevention'] },
    ],
    appUrl: 'https://careweavehq.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '640px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(203, 24%, 12%)', margin: '0 0 18px' }
const h2 = { fontSize: '16px', fontWeight: 'bold' as const, color: 'hsl(203, 24%, 18%)', margin: '20px 0 10px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 35%)', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: 'hsl(210, 40%, 96%)', borderRadius: '8px', padding: '16px 18px', margin: '0 0 22px' }
const kv = { fontSize: '14px', color: 'hsl(203, 24%, 18%)', margin: '0 0 10px' }
const muted = { fontSize: '12px', color: 'hsl(203, 12%, 45%)' }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '24px 0 0' }