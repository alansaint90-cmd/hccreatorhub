import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="wordmark hs-wordmark" aria-label="HC Agency — início">
      <span className="hs-brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="currentColor">
          <path d="M8 8h7v24H8zM30 8a12 12 0 0 0 0 24V8Z" />
        </svg>
      </span>
      <span className="hs-brand-name">
        HC Agency<span>CREATOR PLATFORM</span>
      </span>
    </Link>
  );
}
