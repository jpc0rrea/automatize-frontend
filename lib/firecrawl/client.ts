import Firecrawl from "@mendable/firecrawl-js";

if (!process.env.FIRECRAWL_API_KEY) {
  console.warn("FIRECRAWL_API_KEY is not set - extraction features will not work");
}

export const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY ?? "",
});

