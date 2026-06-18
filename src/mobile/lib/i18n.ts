import { createContext, useContext } from "react";

export type Lang = "en" | "es";

const dict = {
  en: {
    today: "Today", schedule: "Schedule", messages: "Messages", me: "Me",
    no_visits: "No visits scheduled today. Enjoy your day off!",
    clock_in: "Clock In", clock_out: "Clock Out", clocking_in: "Clocking in…", clocking_out: "Clocking out…",
    care_tasks: "Care plan tasks", visit_notes: "Visit notes",
    visit_notes_ph: "What happened during the visit? Any concerns?",
    back: "Back", live: "Live", done: "Done", completed: "Completed",
    signed_in_as: "Signed in as", sign_out: "Sign out",
    week_view: "This week", no_visits_week: "No upcoming visits this week.",
    inbox: "Inbox", no_messages: "No messages yet.",
    type_message: "Type a message…", send: "Send",
    pending_sync: "%n change(s) waiting to sync",
    language: "Language",
  },
  es: {
    today: "Hoy", schedule: "Horario", messages: "Mensajes", me: "Yo",
    no_visits: "No hay visitas programadas hoy. ¡Disfruta tu día libre!",
    clock_in: "Iniciar Turno", clock_out: "Finalizar Turno", clocking_in: "Iniciando…", clocking_out: "Finalizando…",
    care_tasks: "Tareas del plan de cuidado", visit_notes: "Notas de la visita",
    visit_notes_ph: "¿Qué ocurrió durante la visita? ¿Alguna inquietud?",
    back: "Atrás", live: "En curso", done: "Hecho", completed: "Completada",
    signed_in_as: "Sesión iniciada como", sign_out: "Cerrar sesión",
    week_view: "Esta semana", no_visits_week: "No hay visitas próximas esta semana.",
    inbox: "Bandeja", no_messages: "Aún no hay mensajes.",
    type_message: "Escribe un mensaje…", send: "Enviar",
    pending_sync: "%n cambio(s) esperando sincronización",
    language: "Idioma",
  },
} as const;

export type TKey = keyof typeof dict["en"];

export const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey, vars?: Record<string, string | number>) => string }>({
  lang: "en", setLang: () => {}, t: (k) => k,
});

export function useI18n() { return useContext(I18nContext); }

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s: string = (dict[lang] as any)[key] ?? (dict.en as any)[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`%${k}`, String(v));
  return s;
}