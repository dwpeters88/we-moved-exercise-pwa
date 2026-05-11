export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:m-0 focus:inline-block focus:rounded-md focus:bg-surface-high focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:text-ink focus:underline focus:decoration-accent focus:decoration-2 focus:underline-offset-4 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
    >
      Skip to main content
    </a>
  );
}
