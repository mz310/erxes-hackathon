import { randomBytes } from "node:crypto";
import { aiStatus } from "../ai/service.ts";
import { renderIntakePage } from "./page.ts";

// Structural subset of express's Response: express is not a direct
// dependency of this package, and the handler only needs these members.
type HtmlResponse = {
  setHeader(name: string, value: string): unknown;
  status(code: number): { send(body: string): unknown };
};

// The public intake page is served by the plugin API itself so that it needs
// no erxes login and no separate hosting; the gateway proxies
// /pl:edu-tech-brave/intake here. A per-request nonce lets the page keep a
// strict Content-Security-Policy while still using inline script and style.
const serveIntake = (_req: unknown, res: HtmlResponse): void => {
  const nonce = randomBytes(16).toString("base64");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      `script-src 'nonce-${nonce}'`,
      `style-src 'nonce-${nonce}'`,
      "connect-src 'self'",
      "img-src 'self' data:",
      "form-action 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  res.status(200).send(renderIntakePage(nonce, { privacyCheck: aiStatus.publicPrivacyCheck }));
};

export const intakeHandlers: {
  method: "GET";
  path: string;
  resolver: (req: unknown, res: HtmlResponse) => void;
}[] = [
  { method: "GET", path: "/intake", resolver: serveIntake },
  { method: "GET", path: "/intake/", resolver: serveIntake },
];
