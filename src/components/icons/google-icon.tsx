/** The standard multi-color Google "G" mark, used on "Continue with Google" buttons. */
export function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.1C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.32A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.58.38-2.32v-3.1H1.3A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.3 5.42l4.01-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.58l4.01 3.1c.94-2.83 3.58-4.93 6.69-4.93z"
      />
    </svg>
  );
}
