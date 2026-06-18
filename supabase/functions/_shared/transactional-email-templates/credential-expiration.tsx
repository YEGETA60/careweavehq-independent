/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface CredItem {
  caregiver?: string
  type: string
  number?: string
  status: string // "expired", "expires in 14 days"
  expiresOn?: string
}

interface Props {
  recipientName?: string
  audience?: 'caregiver' | 'admin'
  credentials?: CredItem[]
  appUrl?: string
}

const CredentialExpiration = ({ recipientName, audience = 'caregiver', credentials = [], appUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Action needed: license & credential expirations</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>License & credential alert</Heading>
        <Text style={text}>
          Hi{recipientName ? ` ${recipientName}` : ''}, the following credentials
          {audience === 'admin' ? ' across your team ' : ' on your record '}
          require attention. Expired credentials may block scheduling and billing.
        </Text>
        <Section style={card}>
          {credentials.length === 0 ? (
            <Text style={kv}>No items.</Text>
          ) : credentials.map((c, i) => (
            <Text key={i} style={kv}>
              {c.caregiver ? <><strong>{c.caregiver}</strong> — </> : null}
              <strong>{c.type}</strong>
              {c.number ? ` (#${c.number})` : ''} — {c.status}
              {c.expiresOn ? ` (expires ${c.expiresOn})` : ''}
            </Text>
          ))}
        </Section>
        <Text style={text}>
          Open {SITE_NAME} to renew or upload an updated certificate
          {appUrl ? `: ${appUrl}` : ''}.
        </Text>
        <Text style={footer}>Sent by {SITE_NAME} compliance reminders.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CredentialExpiration,
  subject: (d: Record<string, any>) => {
    const n = (d.credentials ?? []).length
    return `Credential alert: ${n} item${n === 1 ? '' : 's'} need attention`
  },
  displayName: 'Credential expiration alert',
  previewData: {
    recipientName: 'Maria',
    audience: 'caregiver',
    appUrl: 'https://careweavehq.com',
    credentials: [
      { type: 'CPR', status: 'expires in 7 days', expiresOn: '2026-05-14' },
      { type: 'TB Test', status: 'expired', expiresOn: '2026-04-30' },
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