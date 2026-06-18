/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface ReviewerInviteProps {
  inviteUrl?: string
  email?: string
  expiresAt?: string
  inviterName?: string
  token?: string
  notes?: string
}

const ReviewerInviteEmail = ({
  inviteUrl, email, expiresAt, inviterName, token, notes,
}: ReviewerInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been granted 15-day enterprise review access to {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Enterprise Review Access</Heading>
        <Text style={text}>
          {inviterName ? `${inviterName} has` : 'A CareWeave administrator has'} invited you
          {email ? ` (${email})` : ''} to review the full <strong>enterprise tier</strong> of
          {' '}{SITE_NAME} for <strong>15 days</strong>.
        </Text>
        <Text style={text}>
          Click the button below to accept and activate your reviewer account. You'll need to
          sign up (or sign in) using the exact email this invite was sent to.
        </Text>
        {inviteUrl && (
          <Button style={button} href={inviteUrl}>Activate review access</Button>
        )}
        {inviteUrl && (
          <Section style={{ margin: '24px 0 0' }}>
            <Text style={smallLabel}>Or paste this link into your browser:</Text>
            <Text style={mono}>{inviteUrl}</Text>
          </Section>
        )}
        {token && (
          <Section>
            <Text style={smallLabel}>Invite token (if asked):</Text>
            <Text style={mono}>{token}</Text>
          </Section>
        )}
        {notes && (
          <Section style={noteBox}>
            <Text style={smallLabel}>Note from your host:</Text>
            <Text style={text}>{notes}</Text>
          </Section>
        )}
        <Text style={footer}>
          Your access {expiresAt ? `expires on ${expiresAt}` : 'expires in 15 days'} and may be
          revoked at any time. If you weren't expecting this invite, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReviewerInviteEmail,
  subject: `Your 15-day enterprise review access to ${SITE_NAME}`,
  displayName: 'Reviewer invite (15-day)',
  previewData: {
    inviteUrl: 'https://careweave-hq.lovable.app/reviewer-access?token=sample&email=reviewer%40example.com',
    email: 'reviewer@example.com',
    expiresAt: 'June 4, 2026',
    inviterName: 'CareWeave Admin',
    token: 'sample-token',
    notes: 'Looking forward to your feedback on the EVV and billing flows.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(203, 24%, 12%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 35%)', lineHeight: '1.6', margin: '0 0 18px' }
const button = { backgroundColor: 'hsl(210, 100%, 45%)', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 22px', textDecoration: 'none' }
const smallLabel = { fontSize: '12px', color: 'hsl(203, 12%, 45%)', margin: '12px 0 4px' }
const mono = { fontSize: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'hsl(203, 24%, 20%)', wordBreak: 'break-all' as const, margin: '0 0 8px' }
const noteBox = { background: 'hsl(210, 30%, 97%)', border: '1px solid hsl(210, 30%, 90%)', borderRadius: '8px', padding: '12px 16px', margin: '8px 0 16px' }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '32px 0 0' }