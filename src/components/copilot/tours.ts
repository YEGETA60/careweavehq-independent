import type { ComponentType } from "react";
import { UserPlus, UserCheck, CalendarPlus, Receipt } from "lucide-react";

export type TourStep = {
  id: string;
  module: string; // dispatched via cw:navigate
  target: string; // data-tour="..." value
  title: string;
  body: string;
  /** If true, completing this step requires the user to click the target. Otherwise the user clicks "Next". */
  awaitClick?: boolean;
};

export type Tour = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  steps: TourStep[];
};

export const TOURS: Tour[] = [
  {
    id: "addFirstClient",
    title: "Add your first client",
    description: "Create a client profile so you can schedule visits and bill.",
    icon: UserPlus,
    steps: [
      { id: "open", module: "clients", target: "clients-add-btn", title: "Open the Add Client dialog", body: "Click **Add Client** to start a new profile.", awaitClick: true },
      { id: "name", module: "clients", target: "clients-name-input", title: "Enter the client's name", body: "Fill in the full legal name." },
      { id: "address", module: "clients", target: "clients-address-input", title: "Add an address", body: "We use this for caregiver routing and EVV geofencing." },
      { id: "save", module: "clients", target: "clients-save-btn", title: "Save the client", body: "Click **Add Client** to create the record. You can edit details later.", awaitClick: true },
    ],
  },
  {
    id: "addFirstCaregiver",
    title: "Add your first caregiver",
    description: "Onboard a caregiver and capture their credentials.",
    icon: UserCheck,
    steps: [
      { id: "open", module: "caregivers", target: "caregivers-add-btn", title: "Open the Add Caregiver dialog", body: "Click **Add Caregiver** to start.", awaitClick: true },
      { id: "name", module: "caregivers", target: "caregivers-name-input", title: "Enter the caregiver's name", body: "Full legal name as it appears on their license." },
      { id: "skills", module: "caregivers", target: "caregivers-skills-input", title: "List their skills", body: "Comma-separated. Used by the matcher when assigning visits." },
      { id: "save", module: "caregivers", target: "caregivers-save-btn", title: "Save the caregiver", body: "Click **Add Caregiver**. Add credentials next from the Credentials module.", awaitClick: true },
    ],
  },
  {
    id: "scheduleFirstVisit",
    title: "Schedule your first visit",
    description: "Assign a caregiver to a client for a date and time.",
    icon: CalendarPlus,
    steps: [
      { id: "open", module: "scheduling", target: "scheduling-add-btn", title: "Open Schedule Visit", body: "Click **Schedule Visit** to begin.", awaitClick: true },
      { id: "client", module: "scheduling", target: "scheduling-client-select", title: "Pick the client", body: "Choose the client you just created." },
      { id: "caregiver", module: "scheduling", target: "scheduling-caregiver-select", title: "Pick a caregiver", body: "We recommend caregivers based on skills and availability." },
      { id: "save", module: "scheduling", target: "scheduling-save-btn", title: "Save the visit", body: "Click **Schedule Visit**. EVV will track clock-in/out automatically.", awaitClick: true },
    ],
  },
  {
    id: "runFirstInvoice",
    title: "Run your first invoice",
    description: "Generate an invoice from verified EVV hours.",
    icon: Receipt,
    steps: [
      { id: "open", module: "billing", target: "billing-header", title: "Go to Billing & Invoicing", body: "Unbilled visits are grouped by client at the top of the page." },
      { id: "generate", module: "billing", target: "billing-generate-btn", title: "Generate an invoice", body: "Click **Generate Invoice** next to a client to create one from their verified hours.", awaitClick: true },
    ],
  },
];

export const getTour = (id: string) => TOURS.find((t) => t.id === id);