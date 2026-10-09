# A request outside the declared use never gets a QR code

A `birth_date` claim on an `is_over_18` use returns `403` and `ERR_CLAIM_OUTSIDE_INTENDED_USE`. No session is created. No QR code is returned.

This check runs before a session link exists. It does not depend on the wallet, and it does not wait for the 11 August 2028 registration-certificate check. It is a gateway control, not a Member State registration.

## What is refused

| Declared use | Requested | Result |
| --- | --- | --- |
| `is_over_18` | `is_over_18` | Session may be created |
| `is_over_18` | `is_over_18`, `birth_date` | `403`, no session, no QR |

A predicate is not a way around the use. If `birth_date` is not part of that use, asking for it is refused.

No session is billed. No claim is stored, because none was disclosed.

## Audit

The refusal returns `403` with `ERR_CLAIM_OUTSIDE_INTENDED_USE`. No session was created.

## Where the session sits

The gateway runs on Cloudflare, not AWS. Account, session and audit records are stored in Cloudflare D1 in the EU region. The controller is DALIBOR GOGIC PR DLBR, Serbia. EU-region storage does not register the company as a relying party, and it does not put a certificate in `x5c`.

## What this is not

The declared use is the tenant's intended use until a Member State register is in place. From 24 December 2026 a relying party registers where it is established. DLBR does not hold that registration certificate. A Serbian contract does not register you in Germany.

## Sandbox matrix

One row per wallet we have actually run. A country with no public sandbox stays empty.

| Country | Wallet | Request | Result | Error | Date |
| --- | --- | --- | --- | --- | --- |
| Germany | SPRIND sandbox | `is_over_18`, inside declared use | Not run | — | — |
| Netherlands | No public sandbox | — | Not tested | No wallet URL | — |
| Sweden | DIGG test platform not open | — | Not tested | No wallet URL | — |

Last run: not yet run. Secrets are removed before a row is published.
