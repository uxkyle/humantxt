/** The starter file shown in the editor and installed by the extension. */
export const EXAMPLE = `# human.txt — https://humantxt.org
Version: 0.1
Updated: 2026-10-09

# Everyone gets this layer unless a more specific one is granted.
[*]
Language: en-US
Tracking: disallow
Data-Sale: disallow
AI-Training: disallow
AI-Summarize: allow
Contact: none

[commerce]
Applies-To: shops, marketplaces
Personalization: allow
Retention: 90d
Contact: email
Contact-Frequency: weekly

[ai-agents]
Applies-To: assistants, chatbots, support bots
Disclose-AI: required
Human-Escalation: required
Memory: session-only
Act-On-My-Behalf: ask-first
Tone: direct, concise
`;
