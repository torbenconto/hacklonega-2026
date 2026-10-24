# Feature and UX roadmap

These are proposed product intentions, not implemented features or delivery
commitments. Priorities describe a suggested order; effort estimates are relative,
not deadlines. The audience is recreational anglers using the Georgia freshwater
demo, and contributors deciding what to build next.

## Current foundation

The frontend currently has Expo starter screens. The FastAPI backend supports
username-only demo access, persistent per-user catches, photo-based species
candidates, a species catalog, and statewide baseline regulation guidance.
Catches currently store free-text species, required weight and length, and a
server-generated creation timestamp. Usernames do not verify identity.

ML identification requires user confirmation. Regulation coverage is partial;
unreviewed entries and local exceptions remain unresolved. Descriptive season and
size parameters, where included in the rules dataset, are not automatically
evaluated by the regulation route. A saved catch is a journal entry, not evidence
that a fish was retained or that harvest was permitted.

## Scales: progression for logging catches

Scales are proposed nonmonetary points that grow as an angler logs catches. The
goal is to make progress visible and encourage continued fishing and journaling.
The following values are starting proposals to tune after demo feedback:

| Action | Proposed reward | Award condition |
| --- | --- | --- |
| Save a catch | 10 Scales | A distinct catch is successfully persisted |
| Log a species for the first time | 25 additional Scales | First active, user-confirmed catch for that catalog species |
| Reach 10, 25, or 50 logged catches | 50 additional Scales per milestone | Each threshold is earned once while the account remains above it |

Released and retained fish earn the same base reward. A user-confirmed manual
species selection is eligible; a prediction or photo upload alone earns nothing.
Logs without a resolved catalog species can earn the base reward, but their
first-species bonus waits for confirmation. Do not add multipliers for protected
species, rarity, fish weight, or retaining fish.

### Experience

- Show Scales beside catch count and unique species count on the home screen and profile.
- Celebrate a successful save with a small reward animation and a reduced-motion alternative.
- Show the next milestone and its remaining catch count without pressuring users into daily streaks.
- Provide a reward history that explains each credit, bonus, or reversal.
- Introduce badges and titles; later, offer profile themes and other cosmetic unlocks.
- Keep Scales free of cash value, purchases, transfers, and paid advantages initially.

### Implementation intentions

Use a server-owned reward ledger linked to stable user IDs and catch IDs. Persist
the catch and its reward atomically, and protect requests with idempotency keys so
retries cannot award twice. Offline drafts earn rewards only after synchronization.

Editing never earns another base reward. Correcting a species recalculates the
first-species bonus against the user's active catches, without accumulating
bonuses by repeatedly changing a record. Deleting a catch reverses its base award
and recalculates species and milestone eligibility. A milestone can have at most
one active bonus; dropping below and later reaching it again restores that bonus
rather than adding another lifetime credit. Use ledger adjustments to retain an
explainable history.

Start with progress totals; design cosmetic spending only after deciding how
reversals interact with redeemed rewards. Shared rankings should wait for stronger
identity and duplicate-report handling. Private demo progression can use the
existing username flow, with its limitations made clear.

## Prioritized backlog

Effort: **S** is a focused change, **M** spans several components or an API/model
extension, and **L** requires substantial coordination or infrastructure. Estimates
include the suggested behavior, not unrelated production hardening.

### P0: complete the core demo

| Idea | User benefit | Suggested implementation | Dependency | Effort |
| --- | --- | --- | --- | --- |
| Product home and navigation | Understand the app immediately | Replace starter screens with Log Catch, My Catches, and Profile destinations | Existing Expo navigation | M |
| Username onboarding | Reach a personal journal quickly | Explain demo access and create/reuse a username through login | Existing auth API | S |
| Camera and gallery capture | Log a fish from either source | Offer capture and library selection with permission recovery | Image picker and device permissions | M |
| Photo preview and retake | Fix a poor photo before uploading | Preview the selected photo with replace/retake actions | Capture flow | S |
| Species confirmation | Correct a model suggestion | Show candidates and require selection or manual confirmation | Prediction API and species catalog | M |
| Measurement guidance | Enter consistent measurements | Illustrate total length and label weight/length units next to inputs | Catch form | S |
| Save confirmation | Know a catch reached the journal | Show the saved record and a clear return-to-log action | Catch creation API | S |
| Catch history | Revisit previous catches | List the current user's saved catches newest first | Catch listing API | M |
| Catch detail view | Read a complete journal entry | Open a saved record from history with species and measurements | History data | S |

### P0: everyday usability

| Idea | User benefit | Suggested implementation | Dependency | Effort |
| --- | --- | --- | --- | --- |
| Loading and progress states | Understand upload and prediction delays | Show distinct uploading, identifying, and saving states | API integration | S |
| Actionable errors and retry | Recover without starting over | Retain inputs and offer an appropriate retry for each failed step | Request state handling | M |
| Helpful empty states | Know what to do before the first catch | Add a clear first-log action and brief examples | History and profile screens | S |
| Duplicate-submit prevention | Avoid accidental repeated catches | Disable pending saves and add server-side idempotency | Catch API extension | M |
| Metric and imperial units | Log familiar units | Convert centimeters/kilograms to canonical inches/pounds and preserve display preference | Shared conversion utilities | M |
| Accessible controls | Use the app with assistive technology | Add labels, contrast, large targets, and reduced-motion support | Product components | M |
| Keyboard-friendly forms | Finish entries on smaller screens | Keep fields visible and provide next/done actions | Catch and login forms | S |
| Remember active username | Resume the journal next launch | Persist the normalized username with a visible switch-user action | Local preferences | S |

### P1: better catch logging

| Idea | User benefit | Suggested implementation | Dependency | Effort |
| --- | --- | --- | --- | --- |
| Edit catches | Correct mistaken entries | Add owner-scoped updates and retain a modified timestamp | Catch API extension | M |
| Delete with undo | Remove mistakes confidently | Use reversible deletion before final removal | Deletion API and Scales adjustments | M |
| Actual catch date | Record yesterday's trip accurately | Store caught-at separately from created-at, with local time entry | Catch schema migration | M |
| Optional measurements | Log a catch without a scale or ruler | Allow missing values rather than invented zeros | Nullable fields and UI validation | M |
| Catch notes | Remember tackle and context | Add optional notes to save, edit, and detail views | Catch schema extension | S |
| Released or retained status | Keep a meaningful personal record | Store released, retained, or unspecified independently of legality | Catch schema extension | S |
| Saved photo attachments | Recognize catches visually | Persist an attachment reference and display thumbnails | Media storage and cleanup | L |
| Species search | Find a manually identified fish | Search common/scientific names and retain a stable catalog ID | Species selector and catch schema | M |
| History filters and sorting | Find a particular catch | Filter by species/date and sort measurements or catch time | Query parameters and indexed data | M |
| Personal bests | See individual progress | Summarize best confirmed lengths/weights per species | Stable species IDs and measurements | M |

### P1: Scales and collection

| Idea | User benefit | Suggested implementation | Dependency | Effort |
| --- | --- | --- | --- | --- |
| Scales balance and ledger | See and understand earned progress | Add server-owned awards, balance, and reward-history views | Catch idempotency and reward model | L |
| Species collection book | Discover what has been logged | Build a catalog with caught/unseen states and first-catch dates | Confirmed catalog IDs | M |
| Milestone badges | Celebrate cumulative achievements | Award count and collection badges from saved records | Achievement rules and Scales ledger | M |
| Personal goals | Choose a reason to keep journaling | Offer catch-count or collection goals with user-selected targets | Progress summaries | M |
| Weekly summary | Remember a fishing week | Show catches, species, and earned Scales in an in-app recap | Catch dates and aggregation | M |
| Profile customization | Make progress feel personal | Add an avatar, title, and later cosmetic themes | Profile storage and unlock decisions | M |

### P2: outdoor reliability

| Idea | User benefit | Suggested implementation | Dependency | Effort |
| --- | --- | --- | --- | --- |
| Offline drafts | Capture a memory without reception | Save unfinished entries and photos locally | Durable device storage | M |
| Queued synchronization | Finish logging when service returns | Retry queued saves with client-generated request IDs | Offline drafts and API idempotency | L |
| Upload compression | Use less bandwidth | Resize/compress a copy before uploading while preserving useful detail | Image processing and ML quality checks | M |
| Cached species information | Browse identification help offline | Cache versioned catalog data and selected descriptions | Species content endpoint | M |
| Connection status | Understand what will work outdoors | Show offline/pending states beside affected actions | Connectivity detection | S |
| Resumable logging | Recover after an interruption | Restore the last draft after closing or backgrounding the app | Draft persistence | M |
| Backend/model readiness feedback | Understand a slow first prediction | Surface availability and preparation states with retry guidance | Existing health endpoints | S |

### P2: discovery and context

| Idea | User benefit | Suggested implementation | Dependency | Effort |
| --- | --- | --- | --- | --- |
| Species detail pages | Learn about a confirmed catch | Add sourced descriptions and identification traits | Curated species content | M |
| Photography tips | Improve identification results | Offer concise framing, lighting, and fish-handling guidance | Capture and confirmation screens | S |
| Lookalike comparisons | Make a better manual choice | Compare distinctive traits of similar candidates | Curated comparison content | M |
| Fishing sessions | Group catches from one outing | Add a trip/session entity and attach catches | Catch schema and session APIs | M |
| Private catch locations | Remember a successful outing | Offer optional coarse/manual locations, private by default | Location preferences and storage | L |
| Trip statistics | Review an outing at a glance | Summarize catch count, species, and measurements per session | Sessions and aggregation | M |
| Data export | Keep a portable copy of the journal | Export CSV/JSON with a deliberate choice about photos and locations | Owner-scoped export endpoint | M |

### Later: regulation experience

| Idea | User benefit | Suggested implementation | Dependency | Effort |
| --- | --- | --- | --- | --- |
| Season and size information cards | Read applicable descriptive parameters | Display reviewed values and distinguish unused from unreviewed fields | Rules dataset exposure | M |
| Sourced rule detail cards | Inspect the basis of guidance | Link each displayed restriction to its official reference | Source metadata and rule presentation | S |
| Rule review dates | Recognize older information | Show snapshot dates and an explicit content refresh workflow | Versioned rules and content ownership | M |
| Waterbody selection | Request more relevant guidance | Add a curated lake/river selector with exact geographic scope | Waterbody catalog | L |
| Local rule overrides | Handle location-specific exceptions | Introduce scoped rules with precedence and boundary tests | Waterbody selection and verified rules | L |
| Retained-count tracking | Separate a journal from daily retained totals | Track user-confirmed retained fish by relevant regulation group | Catch date, disposition, and completeness prompts | L |

### Later: community and polish

| Idea | User benefit | Suggested implementation | Dependency | Effort |
| --- | --- | --- | --- | --- |
| Shareable catch cards | Share a memory conveniently | Render a card with optional measurements and no location by default | Saved catch detail and sharing support | M |
| Opt-in friend challenges | Enjoy friendly shared progress | Add private invitations and agreed count/collection goals | Verified identity and abuse handling | L |
| Cooperative goals | Make progress together | Let a small group contribute toward a shared journal milestone | Group identity and progress aggregation | L |
| Optional reminders | Remember to finish an entry | Offer user-controlled draft or recap reminders | Notification preferences and scheduling | M |
| Stronger account identity | Protect persistent and shared progress | Replace username-only selection with verified account access | Authentication migration and account linking | L |
| Account and data deletion | Control stored personal information | Provide deletion/export flows covering catches, media, and rewards | Stable ownership and storage lifecycle | L |
| Location-sharing controls | Decide exactly what is shared | Separate private coordinates from approximate public locations | Private locations and sharing model | M |

## Suggested delivery sequence

1. Complete the capture-to-log experience and everyday usability work.
2. Improve catch management, including stable species IDs, actual catch dates,
   optional measurements, and release/retention status.
3. Add private Scales progression, collection views, and explainable rewards.
4. Make draft capture and synchronization reliable outdoors.
5. Expand curated discovery content and regulation experiences, then consider
   optional community features after identity and privacy foundations mature.

The current catch model must evolve before first-species rewards, historical
summaries, retained-count features, or collection pages can be dependable. Plan
schema migrations and compatibility when fields become optional or new fields are
added. Media persistence, synchronization, and Scales require their own storage
and ownership design; a catalog prediction alone should never create a confirmed
collection entry.

## Future measures of usefulness

These are proposed measurement intentions, not existing analytics or targets:

- **Completed logs:** count successful saves and completion rate from starting an entry.
- **Abandoned forms:** identify the step where a draft is left unfinished, without collecting private notes or photos as analytics.
- **Duplicate saves:** monitor repeated submissions and idempotency conflicts to find confusing UI or retry behavior.
- **Repeat logging:** observe whether users return to log distinct catches after their first session.
- **Failure recovery:** measure whether failed uploads or saves are eventually completed without re-entering data.
- **Scales clarity:** collect feedback about reward explanations, reversals, and whether progression makes journaling more enjoyable.

Review these signals alongside user feedback. Optimize for an accurate, useful
journal rather than raw submission volume or notification engagement.
