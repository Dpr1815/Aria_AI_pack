import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
});

function HomePage() {
  useDocumentTitle("Home");

  return (
    <div className="mx-auto max-w-[var(--max-width-content)] px-[var(--spacing-page-x)] py-[var(--spacing-section)]">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Project Shell</h1>
        <p className="text-lg text-text-secondary leading-relaxed">
          A React project with Vite, Tailwind CSS v4, TanStack Router, TanStack
          Query, and Zustand. Tweak{" "}
          <code className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-sm text-primary">
            src/styles/index.css
          </code>{" "}
          to change the entire visual identity.
        </p>
        <div className="flex gap-3">
          <Button>Primary Action</Button>
          <Button variant="outline">Secondary Action</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>
    </div>
  );
}
