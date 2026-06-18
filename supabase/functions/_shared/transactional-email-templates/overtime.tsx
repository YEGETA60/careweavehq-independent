/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface Props {
  caregiverName?: string
  weekStart?: string
  verifiedHours?: number
  threshold?: number
}

const Overtime = ({ caregiverName, weekStart, verifiedHours, threshold }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Overtime warning: {caregiverName ?? 'caregiver'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Overtime threshold reached</Heading>
        <Text style={text}>
          {caregiverName ?? 'A caregiver'} has logged{' '}
          <strong>{verifiedHours ?? '—'} EVV-verified hours</strong> for the week starting{' '}
          <strong>{weekStart ?? '—'}</strong>, exceeding the {threshold ?? 40}-hour threshold.
        </Text>
        <Section style={card}>
          <Text style={kv}><strong>Caregiver:</strong> {caregiverName ?? '—'}</Text>
          <Text style={kv}><strong>Week of:</strong> {weekStart ?? '—'}</Text>
          <Text style={kv}><strong>Verified hours:</strong> {verifiedHours ?? '—'}</Text>
          <Text style={kv}><strong>Threshold:</strong> {threshold ?? 40}h</Text>
        </Section>
        <Text style={footer}>Automated payroll alert from {SITE_NAME}. Based on EVV-verified hours only.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Overtime,
  subject: (d: Record<string, any>) =>
    `Overtime: ${d.caregiverName ?? 'caregiver'} at ${d.verifiedHours ?? '?'}h this week`,
  displayName: 'Overtime alert',
  previewData: { caregiverName: 'Maria S.', weekStart: '2026-05-04', verifiedHours: 42.5, threshold: 40 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(35, 90%, 35%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 35%)', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: 'hsl(38, 90%, 95%)', borderRadius: '8px', padding: '16px 18px', margin: '0 0 22px' }
const kv = { fontSize: '14px', color: 'hsl(203, 24%, 18%)', margin: '0 0 6px' }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '24px 0 0' }
