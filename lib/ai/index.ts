import { Trend } from "@/lib/types"
import { RedditPost } from "@/lib/reddit"
import * as anthropic from "./anthropic"
import * as openai from "./openai"

export type AIProvider = "anthropic" | "openai"

export async function fetchWebSearchTrends(topicClusters: string[], provider: AIProvider): Promise<Trend[]> {
  return provider === "openai"
    ? openai.fetchWebSearchTrends(topicClusters)
    : anthropic.fetchWebSearchTrends(topicClusters)
}

export async function analyzeRedditTrends(posts: RedditPost[], provider: AIProvider): Promise<Trend[]> {
  return provider === "openai"
    ? openai.analyzeRedditTrends(posts)
    : anthropic.analyzeRedditTrends(posts)
}

export async function generatePosts(systemPrompt: string, userPrompt: string, provider: AIProvider): Promise<string> {
  return provider === "openai"
    ? openai.generatePostsWithOpenAI(systemPrompt, userPrompt)
    : anthropic.generatePostsWithAnthropic(systemPrompt, userPrompt)
}

export async function extractPdf(file: File, provider: AIProvider): Promise<string> {
  return provider === "openai"
    ? openai.extractPdfWithOpenAI(file)
    : anthropic.extractPdfWithAnthropic(file)
}
