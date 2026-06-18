/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'

interface AdminInviteProps {
  inviteUrl?: string
  email?: string
  role?: string
  expiresAt?: string
  inviterName?: string
  token?: string
}

const AdminInviteEmail = ({ inviteUrl, email, role, expiresAt, inviterName, token }: AdminInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited as a Web Admin on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're invited to {SITE_NAME}</Heading>
        <Text style={text}>
          {inviterName ? `${inviterName} has` : 'An existing Web Admin has'} invited you
          {email ? ` (${email})` : ''} to join {SITE_NAME} as a
          <strong> {role ?? 'Web Admin'}</strong>.
        </Text>
        <Text style={text}>
          Click the button below to accept the invitation. You'll be asked to create an
          account (or sign in) using the exact email this invite was sent to.
        </Text>
        {inviteUrl && (
          <Button style={button} href={inviteUrl}>
            Accept invitation
          </Button>
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
        <Text style={footer}>
          This invite is single-use and {expiresAt ? `expires on ${expiresAt}` : 'expires in 7 days'}.
          If you weren't expecting it, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminInviteEmail,
  subject: `You've been invited as a Web Admin on ${SITE_NAME}`,
  displayName: 'Web Admin invite',
  previewData: {
    inviteUrl: 'https://careweave-hq.lovable.app/admin-signup?token=sample&email=reviewer%40example.com',
    email: 'reviewer@example.com',
    role: 'superadmin',
    expiresAt: 'May 27, 2026',
    inviterName: 'CareWeave Admin',
    token: 'sample-token',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(203, 24%, 12%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 35%)', lineHeight: '1.6', margin: '0 0 18px' }
const button = { backgroundColor: 'hsl(210, 100%, 45%)', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 22px', textDecoration: 'none' }
const smallLabel = { fontSize: '12px', color: 'hsl(203, 12%, 45%)', margin: '12px 0 4px' }
const mono = { fontSize: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'hsl(203, 24%, 20%)', wordBreak: 'break-all' as const, margin: '0 0 8px' }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '32px 0 0' }