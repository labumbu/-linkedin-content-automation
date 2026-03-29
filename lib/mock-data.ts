import { Trend, GeneratedPost } from "./types"

export const mockTrends: Trend[] = [
  {
    id: "1",
    title: "AI SDRs Are Replacing Human Outreach",
    summary: "Companies like 11x and Artisan are building AI sales reps that automate cold outreach entirely. The debate on quality vs. quantity is heating up.",
    source: "Twitter",
    relevanceScore: 9,
    velocity: "hot"
  },
  {
    id: "2",
    title: "Signal-Based Selling Goes Mainstream",
    summary: "Intent data platforms are seeing 200% growth. Sales teams are prioritizing accounts showing buying signals over spray-and-pray approaches.",
    source: "LinkedIn",
    relevanceScore: 8,
    velocity: "rising"
  },
  {
    id: "3",
    title: "The Death of the Cold Email",
    summary: "Open rates for generic cold emails have dropped below 5%. Personalization at scale is now table stakes for any outbound strategy.",
    source: "Reddit",
    relevanceScore: 7,
    velocity: "hot"
  },
  {
    id: "4",
    title: "Multi-Threading Deals in 2024",
    summary: "Top performers are engaging 5+ stakeholders per deal. Single-threaded opportunities are dying faster than ever in B2B sales.",
    source: "Web Search",
    relevanceScore: 6,
    velocity: "stable"
  },
  {
    id: "5",
    title: "RevOps Becoming a Board-Level Function",
    summary: "Revenue Operations leaders are now reporting directly to CEOs. The data-driven approach to sales is finally getting executive buy-in.",
    source: "LinkedIn",
    relevanceScore: 8,
    velocity: "rising"
  },
  {
    id: "6",
    title: "AI-Powered Conversation Intelligence",
    summary: "Gong, Chorus, and new entrants are adding generative AI to analyze calls. Real-time coaching during sales calls is becoming reality.",
    source: "Twitter",
    relevanceScore: 9,
    velocity: "hot"
  },
  {
    id: "7",
    title: "LinkedIn Cracking Down on Automation",
    summary: "Platform is rolling out new detection methods for automated connection requests. Authentic engagement is being rewarded with better reach.",
    source: "Reddit",
    relevanceScore: 5,
    velocity: "rising"
  },
  {
    id: "8",
    title: "The Rise of Vertical SaaS Sales",
    summary: "Industry-specific solutions are outperforming horizontal plays. Sales teams with deep vertical expertise are commanding premium prices.",
    source: "Web Search",
    relevanceScore: 4,
    velocity: "stable"
  }
]

export const mockPosts: GeneratedPost[] = [
  {
    id: "1",
    content: `Hot take: AI SDRs aren't replacing salespeople.

They're exposing which ones were never adding value in the first place.

The reps who just "dialed and smiled" without strategy? Yeah, a bot can do that.

But the reps who:
- Research accounts deeply
- Build genuine relationships
- Provide actual insights
- Navigate complex orgs

They're more valuable than ever.

The AI revolution in sales isn't about automation.

It's about amplification.

Use it to do MORE of what makes you irreplaceable, not to replace yourself.

Thoughts?`,
    characterCount: 523
  },
  {
    id: "2",
    content: `Unpopular opinion: Your AI SDR is probably hurting your brand.

I've received 47 "personalized" messages this month that were clearly AI-generated.

You know how I can tell? They all:
1. Mentioned my recent post (but got it wrong)
2. Used the exact same structure
3. Had zero actual insight about my company

Here's the thing:

Prospects can smell inauthenticity from a mile away.

The companies winning right now?

They're using AI to ENHANCE human outreach, not replace it.

Research? Let AI help.
Writing? AI for first draft.
Strategy? That's still 100% human.

What's your take on the AI SDR trend?`,
    characterCount: 567
  },
  {
    id: "3",
    content: `I asked 50 sales leaders about AI SDRs.

The results might surprise you:

- 72% have tested AI outreach tools
- Only 23% saw positive ROI
- 89% say hybrid approach works best

The pattern I noticed:

Companies failing with AI SDRs treat them as set-and-forget.

Companies succeeding?

They use AI for the tedious stuff:
- Initial research
- Data enrichment
- Scheduling

But keep humans for:
- Strategy
- Complex messaging
- Relationship building

The future isn't AI vs. human.

It's AI + human.

And the sales teams who figure this out first? They'll dominate the next decade.`,
    characterCount: 542
  }
]
