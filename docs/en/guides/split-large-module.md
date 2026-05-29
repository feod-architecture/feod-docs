# How to Split a Large Module

```mermaid
flowchart LR
  large["large module"] --> seams["find subdomains"]
  seams --> submodules["submodules"]
  submodules --> index["parent public API"]
  index --> consumers["consumers without deep imports"]
```

## When to Use

Use this guide when a single module has become too large for review, testing, and navigation, but its responsibility cannot simply be moved to `common` or distributed across pages.

Signals that the module needs to be reviewed:

- Changes in different scenarios frequently conflict in the same files;
- The public API has grown beyond understanding;
   - inside the module, there are stable subareas with their own UI, model, API, or tests;
- Some code wants to be moved to `common`, but it still knows about the domain;
- New contributors cannot quickly understand where responsibility lies.

## Prerequisites

- The module already has an explicit `index.ts`.
- The team can name the main responsibility of the module.
- The primary consumers of the public API are known.
- There is an understanding of which parts of the module change together and which live almost independently.

If these conditions are not met, first describe the module through the guide [How to Design a Module](./design-module.md). Without clear boundaries, splitting will be mechanical.

## Steps

1. Pin down the current responsibility.

   Formulate what the module does for the product, and check if it combines several unrelated areas.

   Good:

   - `checkout` processes orders;
   - `notifications` manages notifications;
   - `admin-users` manages users in the admin panel.

   Bad:

   - `shared-tools`;
   - `user-and-billing`;
   - `dashboard-utils`.

2. Divide internal zones by reasons for change.

   Look for parts that change for different reasons:

   - Different user scenarios;
   - Different backend contracts;
   - Different groups of UI components;
   - Different state models;
   - Different owners or review paths.

   If two parts always change together, they do not need to be split just for symmetry.

3. Decide: submodule, separate module, or internal folder.

   Use the practical rule:

   - A submodule is needed if it's a stable part of the same responsibility;
   - A separate module is needed if a part has its own product responsibility and consumers;
   - An ordinary internal folder works well if the part is small and does not require its own contract.

   Good example:

   ```text
   modules/
     checkout/
       index.ts
       delivery/
         index.ts
         ui/DeliveryForm.tsx
         model/useDelivery.ts
       payment/
         index.ts
         ui/PaymentForm.tsx
         model/usePayment.ts
       model/useCheckout.ts
   ```

   Violation:

   ```text
   modules/
     checkout/
       delivery/
         payment/
           card/
             three-ds/
               ui/
   ```

   A depth of more than two or three levels usually means that the boundaries were chosen too late or the module is trying to contain a separate area.

4. Keep the external public API small.

   Splitting internals should not automatically inflate the `index.ts` of the parent module.

   Correct:

   ```ts
   // modules/checkout/index.ts
   export { CheckoutFlow } from "./ui/CheckoutFlow";
   export { startCheckout } from "./model/startCheckout";

   export type { CheckoutResult } from "./model/checkout.types";
   ```

   Incorrect:

   ```ts
   // modules/checkout/index.ts
   export * from "./delivery";
   export * from "./payment";
   export * from "./discounts";
   export * from "./api";
   ```

   Violation: internal zones become an external contract without a team decision.

5. Convert external deep imports to public API.

   Before splitting, find the imports within the module's internals. After splitting, do not move these imports to new internal paths.

   Was bad:

   ```ts
   import { PaymentForm } from "@/modules/checkout/ui/PaymentForm";
   ```

   Should become:

   ```ts
   import { CheckoutFlow } from "@/modules/checkout";
   ```

   If a consumer really needs an individual contract, add it to the root `index.ts` first and only then change the consumer.

6. Check candidates for moving to `common`.

   Only neutral technical code can be moved into `common`. Reuse does not make code common.

   Leave in the module:

   ```ts
   // knows about orders and checkout rules
   export function mapCheckoutPayload(draft: CheckoutDraft) {}
   ```

   Can move to `common`:

   ```ts
   // does not know about the domain
   export function formatDate(value: Date) {}
   ```

7. Add a README if the module has become large.

   After splitting, the README should explain:

   - The responsibility of the module;
   - The external public API;
   - What internal zones exist;
   - Which dependencies are considered acceptable;
   - What should not be imported from outside.

## Final Structure

```text
modules/
  checkout/
    README.md
    index.ts
    ui/
      CheckoutFlow.tsx
    delivery/
      index.ts
      ui/DeliveryForm.tsx
      model/useDelivery.ts
    payment/
      index.ts
      ui/PaymentForm.tsx
      model/usePayment.ts
    api/
      checkout-client.ts
    model/
      startCheckout.ts
      checkout.types.ts
```

## Checklist

- [ ] The module still describes a single responsibility.
- [ ] Internal zones are separated by reasons for change, not file size.
- [ ] Submodules do not become an external public API automatically.
- [ ] A depth of more than two or three levels is justified as an exception.
- [ ] Consumers use the module's root `index.ts`.
- [ ] Domain helpers are not moved to `common` just for reuse.
- [ ] The README is updated if boundaries have become unclear.

## Common Mistakes

- Splitting by file types without changing responsibility -> structure becomes deeper but does not become clearer.
- Exporting each submodule externally -> internal splitting turns into a public contract.
- Moving domain helpers to `common` -> the module loses its owner of logic.
- Creating multi-level nesting instead of a separate module -> navigation gets worse, and dependencies are less clear.
- Leaving old deep imports as "temporary" without an expiration date -> new structure locks in the old problem.

## Related Pages

- [How to Design a Module](./design-module.md)
- [How to Work with Submodules](./submodules.md)
- [How Not to Turn common into a Dumping Ground](./common-boundaries.md)
- [Public API](../reference/public-api.md)
