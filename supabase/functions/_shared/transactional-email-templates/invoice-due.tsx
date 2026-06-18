/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface Props {
  recipientName?: string
  invoiceNumber?: string
  clientName?: string
  periodStart?: string
  periodEnd?: string
  amountDue?: string
  ageDays?: number
  dueDate?: string
  payUrl?: string
}

const InvoiceDue = ({ recipientName, invoiceNumber, clientName, periodStart, periodEnd, amountDue, ageDays, dueDate, payUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Invoice {invoiceNumber} — ${amountDue} due</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{ageDays && ageDays > 0 ? 'Past-due invoice reminder' : 'Invoice ready for payment'}</Heading>
        <Text style={text}>
          Hi{recipientName ? ` ${recipientName}` : ''}, this is a {ageDays && ageDays > 0 ? `reminder that invoice ${invoiceNumber} is ${ageDays} day${ageDays === 1 ? '' : 's'} past due` : `notice for invoice ${invoiceNumber}`}.
        </Text>
        <Section style={card}>
          <Text style={kv}><strong>Invoice:</strong> {invoiceNumber}</Text>
          <Text style={kv}><strong>Client:</strong> {clientName ?? '—'}</Text>
          <Text style={kv}><strong>Service period:</strong> {periodStart} → {periodEnd}</Text>
          <Text style={kv}><strong>Amount due:</strong> ${amountDue}</Text>
          <Text style={kv}><strong>Due date:</strong> {dueDate ?? '—'}</Text>
        </Section>
        {payUrl ? (
          <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
            <Button href={payUrl} style={btn}>View & pay invoice</Button>
          </Section>
        ) : null}
        <Text style={footer}>Sent by {SITE_NAME}. Please disregard if you've already paid.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceDue,
  subject: (d: Record<string, any>) =>
    d.ageDays && d.ageDays > 0
      ? `Past-due: Invoice ${d.invoiceNumber} — $${d.amountDue} (${d.ageDays}d)`
      : `Invoice ${d.invoiceNumber} ready — $${d.amountDue}`,
  displayName: 'Invoice due / past-due reminder',
  previewData: {
    recipientName: 'John',
    invoiceNumber: 'INV-001',
    clientName: 'John D.',
    periodStart: '2026-04-21',
    periodEnd: '2026-05-04',
    amountDue: '425.00',
    ageDays: 12,
    dueDate: '2026-05-15',
    payUrl: 'https://example.com/invoices/abc',
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