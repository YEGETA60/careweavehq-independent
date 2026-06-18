/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  trigger?: string
  actorName?: string
  reason?: string
  amount?: string
  notes?: string
  count?: number
  windowLabel?: string
  details?: string
}

const PrebillOverrideAlert = ({ trigger, actorName, reason, amount, notes, count, windowLabel, details }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Pre-bill override alert: {trigger}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Pre-bill override alert</Heading>
        <Text style={text}>
          A pre-bill validation override was just recorded that exceeds your configured thresholds.
        </Text>
        <Section style={card}>
          <Text style={kv}><strong>Trigger:</strong> {trigger ?? '—'}</Text>
          <Text style={kv}><strong>Approver:</strong> {actorName ?? '—'}</Text>
          <Text style={kv}><strong>Reason code:</strong> {reason ?? '—'}</Text>
          {amount ? <Text style={kv}><strong>Amount:</strong> ${amount}</Text> : null}
          {count != null ? <Text style={kv}><strong>Count {windowLabel ?? ''}:</strong> {count}</Text> : null}
          {notes ? <Text style={kv}><strong>Approver notes:</strong> {notes}</Text> : null}
          {details ? <Text style={kv}><strong>Details:</strong> {details}</Text> : null}
        </Section>
        <Text style={muted}>Review this override in Finance → Auto Billing → Pre-Bill Review Queue.</Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f6f9fc', fontFamily: 'system-ui, sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '40px auto', padding: '32px', maxWidth: '560px', borderRadius: '8px' }
const h1 = { color: '#0f172a', fontSize: '20px', fontWeight: 700 as const, margin: '0 0 12px' }
const text = { color: '#334155', fontSize: '14px', lineHeight: '22px' }
const muted = { color: '#64748b', fontSize: '12px', marginTop: '16px' }
const card = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', margin: '12px 0' }
const kv = { color: '#0f172a', fontSize: '13px', margin: '4px 0' }

export const template: TemplateEntry = {
  component: PrebillOverrideAlert,
  subject: (d) => `[Pre-bill] ${d.trigger ?? 'Override alert'} — ${d.actorName ?? 'admin'}`,
  displayName: 'Pre-bill override alert',
  previewData: { trigger: 'high_value', actorName: 'Jane Admin', reason: 'one_time_admin_approval', amount: '1250.00', notes: 'Payer exception approved verbally' },
}