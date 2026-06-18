/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface CourseItem {
  title: string
  status: string // "expired", "expires in 14 days", "not started"
  expiresOn?: string
  url?: string
}

interface Props {
  recipientName?: string
  courses?: CourseItem[]
  appUrl?: string
}

const TrainingExpiration = ({ recipientName, courses = [], appUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Action needed: training and compliance certifications</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Training & compliance update</Heading>
        <Text style={text}>
          Hi{recipientName ? ` ${recipientName}` : ''}, the following trainings need
          your attention to keep your compliance status current.
        </Text>
        <Section style={card}>
          {courses.length === 0 ? (
            <Text style={kv}>No items.</Text>
          ) : (
            courses.map((c, i) => (
              <Text key={i} style={kv}>
                <strong>{c.title}</strong> — {c.status}
                {c.expiresOn ? ` (expires ${c.expiresOn})` : ''}
              </Text>
            ))
          )}
        </Section>
        <Text style={text}>
          Open the Learning Home in {SITE_NAME} to renew or complete each course
          {appUrl ? `: ${appUrl}` : ''}.
        </Text>
        <Text style={footer}>Sent by {SITE_NAME} compliance reminders.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrainingExpiration,
  subject: (d: Record<string, any>) => {
    const n = (d.courses ?? []).length
    return `Training reminder: ${n} item${n === 1 ? '' : 's'} need attention`
  },
  displayName: 'Training expiration reminder',
  previewData: {
    recipientName: 'Maria',
    appUrl: 'https://careweavehq.com',
    courses: [
      { title: 'HIPAA Privacy & Security', status: 'expires in 14 days', expiresOn: '2026-05-19' },
      { title: 'Bloodborne Pathogens (OSHA)', status: 'expired', expiresOn: '2026-04-30' },
      { title: 'CPR & First Aid', status: 'not started' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(203, 24%, 12%)', margin: '0 0 18px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 35%)', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: 'hsl(210, 40%, 96%)', borderRadius: '8px', padding: '16px 18px', margin: '0 0 22px' }
const kv = { fontSize: '14px', color: 'hsl(203, 24%, 18%)', margin: '0 0 8px' }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '24px 0 0' }