import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeaveHQ'

interface ContactMessageProps {
  name?: string
  email?: string
  phone?: string
  message?: string
  submittedAt?: string
}

const ContactMessageEmail = ({ name, email, phone, message, submittedAt }: ContactMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New contact message from {name ?? 'a website visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New contact message</Heading>
        <Text style={text}>
          Someone just submitted the Contact form on {SITE_NAME}.
        </Text>
        <Section style={card}>
          <Text style={row}><strong>Name:</strong> {name ?? '—'}</Text>
          <Text style={row}><strong>Email:</strong> {email ?? '—'}</Text>
          {phone ? <Text style={row}><strong>Phone:</strong> {phone}</Text> : null}
          {submittedAt ? <Text style={row}><strong>Submitted:</strong> {submittedAt}</Text> : null}
          <Hr style={hr} />
          <Text style={messageStyle}>{message ?? ''}</Text>
        </Section>
        <Text style={footer}>— {SITE_NAME} website</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactMessageEmail,
  subject: (d: Record<string, any>) => `New contact message from ${d?.name ?? 'website visitor'}`,
  displayName: 'Contact form message',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 123 4567',
    message: 'Hi, I would love a demo of your platform.',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 16px' }
const card = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 18px' }
const row = { fontSize: '14px', color: '#0f172a', margin: '0 0 6px' }
const hr = { borderColor: '#e2e8f0', margin: '12px 0' }
const messageStyle = { fontSize: '14px', color: '#0f172a', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const, margin: 0 }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }