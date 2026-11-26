# Motion guidelines

## Shared tokens

Use the timing and easing values in `src/lib/motion.ts` rather than adding one-off durations:

- `duration.fast`: 180 ms for small control and status changes.
- `duration.base`: 320 ms for standard component transitions.
- `duration.slow`: 600 ms for larger, infrequent transitions.
- `duration.page`: 700 ms for page-level and reveal motion.
- `ease.outExpo`, `ease.outQuart` and `ease.inOutQuart` for the shared easing curves.

The preloader lifecycle is controlled by `PRELOADER_MS` and `PRELOADER_LEAVE_MS` in that file.
Keep reveal delays synchronized with it through `entryDelay()` and `setRevealAt()`.

## Page and content transitions

- Use `TransitionLink` for internal destinations in its supported `AppPath` set. It coordinates
  the page wipe, scroll reset and reveal timing. The provider navigates without a wipe when reduced
  motion is preferred.
- Use `Reveal` for content that should enter as it scrolls into view. It runs once per component
  and uses the shared page duration and reveal timing. Use its `delay` only for small, intentional
  staggers.
- Use `SplitHeading` for a short heading that benefits from a word stagger; avoid it for long
  paragraphs or frequently changing text.
- Keep initial animation properties stable between server rendering and the first client render.
  Apply reduced-motion preferences through zero-duration transitions and delays rather than
  conditional initial styles, which can cause hydration mismatches.

## Interaction motion

- Keep hover and press feedback subtle and brief. Use `duration.fast` for small responses.
- Use CSS `motion-safe` and `motion-reduce` variants for CSS-only movement, such as a hover scale.
- Avoid repeating or attention-seeking movement. Do not make meaning depend on animation.
- Keep interactive targets at least 44 px and preserve visible keyboard focus.
- Decorative motion elements should not add keyboard stops. Keep native controls keyboard
  accessible even when their motion is disabled.

## Reduced motion

Read the preference with Motion's `useReducedMotion()` where a component needs it. Set durations
and delays to zero and remove travel, scale, rotation and stagger effects where practical. The
preloader shortens its lifecycle when reduced motion is enabled; its content should also appear
without entrance movement.

When motion props affect generated DOM attributes, keep those attributes stable across server and
client renders. In particular, avoid conditionally removing hover props from decorative motion
spans without also keeping them out of the tab order.
