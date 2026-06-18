/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface Props {
  recipientName?: string
  clientName?: string
  caregiverName?: string
  visitDate?: string
  startTime?: string
  endTime?: string
}

const VisitReminder = ({ recipientName, clientName, caregiverName, visitDate, startTime, endTime }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Upcoming visit on {visitDate ?? 'soon'} at {startTime ?? ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Upcoming visit reminder</Heading>
        <Text style={text}>
          Hi{recipientName ? ` ${recipientName}` : ''}, this is a friendly reminder of an upcoming
          visit{clientName ? ` for ${clientName}` : ''}.
        </Text>
        <Section style={card}>
          <Text style={kv}><strong>Date:</strong> {visitDate ?? '—'}</Text>
          <Text style={kv}><strong>Time:</strong> {startTime ?? '—'} – {endTime ?? '—'}</Text>
          <Text style={kv}><strong>Caregiver:</strong> {caregiverName ?? 'To be assigned'}</Text>
        </Section>
        <Text style={footer}>Sent by {SITE_NAME}. Reply to your care coordinator with any changes.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VisitReminder,
  subject: (d: Record<string, any>) =>
    `Reminder: visit on ${d.visitDate ?? 'soon'} at ${d.startTime ?? ''}`.trim(),
  displayName: 'Client visit reminder',
  previewData: {
    recipientName: 'Sarah',
    clientName: 'John D.',
    caregiverName: 'Maria S.',
    visitDate: '2026-05-06',
    startTime: '09:00',
    endTime: '11:00',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(203, 24%, 12%)', margin: '0 0 18px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 35%)', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: 'hsl(210, 40%, 96%)', borderRadius: '8px', padding: '16px 18px', margin: '0 0 22px' }
const kv = { fontSize: '14px', color: 'hsl(203, 24%, 18%)', margin: '0 0 6px' }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '24px 0 0' }