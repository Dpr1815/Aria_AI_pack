import { useLabels, t } from "@/i18n";

export function Footer() {
  const { layout: l } = useLabels();

  return (
    <footer className="border-t border-border py-6">
      <div className="mx-auto max-w-[var(--max-width-content)] px-[var(--spacing-page-x)]">
        <p className="text-sm text-text-muted">
          &copy; {t(l.footer.copyright, { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
