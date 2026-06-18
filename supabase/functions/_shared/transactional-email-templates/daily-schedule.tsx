/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface VisitItem {
  startTime: string
  endTime: string
  clientName: string
  address?: string
}
interface Props {
  caregiverName?: string
  date?: string
  visits?: VisitItem[]
}

const DailySchedule = ({ caregiverName, date, visits = [] }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your schedule for {date ?? 'today'} — {visits.length} visit{visits.length === 1 ? '' : 's'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Good morning{caregiverName ? `, ${caregiverName}` : ''} 👋</Heading>
        <Text style={text}>
          Here is your schedule for <strong>{date ?? 'today'}</strong>. You have{' '}
          <strong>{visits.length}</strong> visit{visits.length === 1 ? '' : 's'} scheduled.
        </Text>
        {visits.map((v, i) => (
          <Section key={i} style={card}>
            <Text style={kvTitle}>{v.startTime} – {v.endTime} · {v.clientName}</Text>
            {v.address ? <Text style={kv}>{v.address}</Text> : null}
          </Section>
        ))}
        {visits.length === 0 ? (
          <Text style={text}>No visits today. Enjoy your day off!</Text>
        ) : null}
        <Text style={footer}>Sent by {SITE_NAME}. Open the app to clock in when you arrive.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DailySchedule,
  subject: (d: Record<string, any>) =>
    `Your schedule for ${d.date ?? 'today'} (${(d.visits?.length ?? 0)} visit${(d.visits?.length ?? 0) === 1 ? '' : 's'})`,
  displayName: 'Caregiver daily schedule',
  previewData: {
    caregiverName: 'Maria',
    date: '2026-05-05',
    visits: [
      { startTime: '09:00', endTime: '11:00', clientName: 'John D.', address: '123 Oak St' },
      { startTime: '13:00', endTime: '15:00', clientName: 'Helen R.', address: '88 Pine Ave' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(203, 24%, 12%)', margin: '0 0 18px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 35%)', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: 'hsl(210, 40%, 96%)', borderRadius: '8px', padding: '14px 16px', margin: '0 0 12px' }
const kvTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 100%, 35%)', margin: '0 0 4px' }
const kv = { fontSize: '13px', color: 'hsl(203, 24%, 25%)', margin: '0' }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '24px 0 0' }