/**
 * principles.ts
 * --------------
 * Nielsen's 10 Usability Heuristics + supporting cognitive laws.
 *
 * This string is injected directly into the usability agent's system prompt.
 * No RAG needed — ~1,500 tokens, fits easily in any modern LLM context window.
 *
 * Source: UXM Co-Pilot PRD v1.0, Appendix A.1 + A.2
 */

export const NIELSEN_PRINCIPLES = `
=== NIELSEN'S 10 USABILITY HEURISTICS ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Visibility of System Status
   Meaning: Always keep users informed about what is happening via timely feedback.
   Flag when: Loading/progress/saved-state feedback is missing on any async action.
   Severity guide: P0 if user can't tell if their action worked; P1 if just slow/unclear.

2. Match Between System and the Real World
   Meaning: Speak the user's language. Follow real-world conventions and natural ordering.
   Flag when: System jargon, technical terms, or unnatural orderings appear.
   Severity guide: P1 if confusing to a typical user; P2 if minor phrasing issue.

3. User Control and Freedom
   Meaning: Users make mistakes. Provide clearly marked emergency exits, undo, and redo.
   Flag when: Destructive actions have no undo; flows have no cancel or back option.
   Severity guide: P0 if data loss possible; P1 if user is stuck without exit.

4. Consistency and Standards
   Meaning: Same thing = same word, same look, same behaviour. Follow platform norms.
   Flag when: The same action or concept uses inconsistent labels, icons, or patterns.
   Severity guide: P1 if likely to confuse; P2 if minor visual inconsistency.

5. Error Prevention
   Meaning: Better to prevent problems than to show good error messages.
   Flag when: Easy-to-make mistakes have no guard (confirmation, constraint, warning).
   Severity guide: P0 for irreversible destructive actions; P1 for recoverable mistakes.

6. Recognition Over Recall
   Meaning: Minimize memory load. Make options and actions visible.
   Flag when: Users must remember information across screens to complete a task.
   Severity guide: P1 if it significantly slows task completion; P2 if minor.

7. Flexibility and Efficiency of Use
   Meaning: Accelerators for experts; let users tailor frequent actions.
   Flag when: No shortcuts, bulk actions, or faster paths exist for experienced users.
   Severity guide: P2 usually, unless the audience is power users.

8. Aesthetic and Minimalist Design
   Meaning: No irrelevant or rarely-needed information should compete for attention.
   Flag when: Visual clutter, competing CTAs, or low signal-to-noise ratio appears.
   Severity guide: P1 if it hides primary actions; P2 if just noisy.

9. Help Users Recognize, Diagnose, and Recover From Errors
   Meaning: Error messages in plain language, stating the problem and a solution.
   Flag when: Cryptic error codes appear; errors offer no recovery path.
   Severity guide: P0 if user is completely blocked; P1 if confusing but workable.

10. Help and Documentation
    Meaning: Provide easy-to-search, task-focused help where needed.
    Flag when: Complex flows have no inline guidance, tooltip, or help affordance.
    Severity guide: P2 usually, unless the flow is genuinely impossible without help.

=== SUPPORTING COGNITIVE LAWS (use these to strengthen findings) ===
These are NOT heuristics but can be cited alongside a Nielsen principle.

- Fitts's Law: Targets must be large enough and close enough to hit reliably.
  Use when: Tap/click targets are clearly too small or too far from related content.

- Hick's Law: Decision time grows with the number of choices presented.
  Use when: The screen presents too many options at once with no clear default.

- Miller's Law: Working memory holds roughly 7 (±2) items.
  Use when: Lists, forms, or steps are unchunked and visually overwhelming.

- Goal-Gradient Effect: Motivation drops when users can't see how close they are to done.
  Use when: Multi-step flows hide progress or don't show how many steps remain.

- Doherty Threshold: Responses slower than ~400ms break the user's flow.
  Use when: There is no loading indicator bridging a slow action.
`;
