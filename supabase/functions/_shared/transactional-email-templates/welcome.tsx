/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CareWeave'
const SITE_URL = 'https://careweavehq.com'

interface WelcomeEmailProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — your home care operations hub</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Welcome, ${name}!` : `Welcome to ${SITE_NAME}!`}
        </Heading>
        <Text style={text}>
          Thanks for joining {SITE_NAME}. You can now manage clients, caregivers,
          scheduling, EVV-verified visits, billing, and payroll — all in one place.
        </Text>
        <Button style={button} href={SITE_URL}>
          Open {SITE_NAME}
        </Button>
        <Text style={footer}>
          Need help getting started? Just reply to this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: `Welcome to ${SITE_NAME}`,
  displayName: 'Welcome email',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(203, 24%, 12%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(203, 12%, 45%)', lineHeight: '1.6', margin: '0 0 22px' }
const button = { backgroundColor: 'hsl(210, 100%, 45%)', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 22px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: 'hsl(203, 12%, 55%)', margin: '32px 0 0' }