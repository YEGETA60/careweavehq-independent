/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface Props {
  caregiverName?: string
  clientName?: string
  scheduledStart?: string
  scheduledEnd?: string
  visitDate?: string
}

const MissedVisit = ({ caregiverName, clientName, scheduledStart, scheduledEnd, visitDate }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Missed visit: {clientName ?? 'client'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚨 Missed visit</Heading>
        <Text style={text}>
          A scheduled visit ended without an EVV clock-in. Please follow up immediately
          to ensure care continuity and reschedule if needed.
        </Text>
        <Section style={card}>
          <Text style={kv}><strong>Client:</strong> {clientName ?? '—'}</Text>
          <Text style={kv}><strong>Caregiver:</strong> {caregiverName ?? '—'}</Text>
          <Text style={kv}><strong>Date:</strong> {visitDate ?? '—'}</Text>
          <Text style={kv}><strong>Scheduled:</strong> {scheduledStart ?? '—'} – {scheduledEnd ?? '—'}</Text>
        </Section>
        <Text style={footer}>Automated EVV alert from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MissedVisit,
  subject: (d: Record<string, any>) =>
    `Missed visit: ${d.clientName ?? 'client'} on ${d.visitDate ?? 'today'}`,
  displayName: 'Missed visit alert',
  previewData: { caregiverName: 'Maria S.', clientName: 'John D.', scheduledStart: '09:00', scheduledEnd: '11:00', visitDate: '2026-05-05' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(0, 70%, 40%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 35%)', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: 'hsl(0, 70%, 96%)', borderRadius: '8px', padding: '16px 18px', margin: '0 0 22px' }
const kv = { fontSize: '14px', color: 'hsl(203, 24%, 18%)', margin: '0 0 6px' }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '24px 0 0' }