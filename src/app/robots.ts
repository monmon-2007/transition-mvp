import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/onboarding/"],
      },
      // Explicitly allow major AI crawlers for LLM exposure
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/onboarding/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/api/", "/onboarding/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/api/", "/onboarding/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/onboarding/"],
      },
    ],
    sitemap: "https://www.novapivots.com/sitemap.xml",
  };
}
