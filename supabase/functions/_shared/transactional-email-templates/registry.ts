/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as lateClockIn } from './late-clock-in.tsx'
import { template as missedVisit } from './missed-visit.tsx'
import { template as overtime } from './overtime.tsx'
import { template as dailySchedule } from './daily-schedule.tsx'
import { template as visitReminder } from './visit-reminder.tsx'
import { template as trainingExpiration } from './training-expiration.tsx'
import { template as trainingOverdueDigest } from './training-overdue-digest.tsx'
import { template as credentialExpiration } from './credential-expiration.tsx'
import { template as timesheetSigningReminder } from './timesheet-signing-reminder.tsx'
import { template as invoiceDue } from './invoice-due.tsx'
import { template as prebillOverrideAlert } from './prebill-override-alert.tsx'
import { template as adminInvite } from './admin-invite.tsx'
import { template as reviewerInvite } from './reviewer-invite.tsx'
import { template as contactMessage } from './contact-message.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'late-clock-in': lateClockIn,
  'missed-visit': missedVisit,
  'overtime': overtime,
  'daily-schedule': dailySchedule,
  'visit-reminder': visitReminder,
  'training-expiration': trainingExpiration,
  'training-overdue-digest': trainingOverdueDigest,
  'credential-expiration': credentialExpiration,
  'timesheet-signing-reminder': timesheetSigningReminder,
  'invoice-due': invoiceDue,
  'prebill-override-alert': prebillOverrideAlert,
  'admin-invite': adminInvite,
  'reviewer-invite': reviewerInvite,
  'contact-message': contactMessage,
}