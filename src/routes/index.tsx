import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareWeave HQ" },
      { name: "description", content: "CareWeave HQ — placeholder page. Codebase incoming via GitHub." },
      { property: "og:title", content: "CareWeave HQ" },
      { property: "og:description", content: "CareWeave HQ — placeholder page. Codebase incoming via GitHub." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Placeholder
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          CareWeave HQ
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This project is ready to receive its existing codebase through GitHub.
        </p>
      </div>
    </main>
  );
}
