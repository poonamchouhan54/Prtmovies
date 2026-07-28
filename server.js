const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  const originalJsonUrl = "https://black-sea-7b13.poonamchouhan076.workers.dev/";

  try {
    const response = await fetch(originalJsonUrl);
    const jsonData = await response.json();

    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      return res.status(400).json({ error: "Invalid JSON structure" });
    }

    const movies = jsonData.data;
    const batchSize = 10; // Ek baar me 10 links fetch honge
    let updatedData = [];

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      
      const batchResult = await Promise.all(
        batch.renderMap(async (movie) => { // Fixed typo to map
          try {
            if (!movie.href) return movie;

            const pageRes = await fetch(movie.href);
            const htmlText = await pageRes.text();

            let targetEmbedId = null;
            const iframeMatches = [...htmlText.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
            
            if (iframeMatches.length > 0) {
              let selectedIframeUrl = iframeMatches[0][1];

              // 1080p ya 720p tab check karna
              if (htmlText.includes("HD 1080p")) {
                const match1080Tab = htmlText.match(/href=["'](#[^"']+)["'][^>]*>\s*HD 1080p/i);
                if (match1080Tab) {
                  const tabId = match1080Tab[1];
                  const tabDivRegex = new RegExp(`<div[^>]+id=["']${tabId.replace('#', '')}["'][^>]*>([\\s\\S]*?)<\/div>`, 'i');
                  const tabDivMatch = htmlText.match(tabDivRegex);
                  if (tabDivMatch) {
                    const iframeInTab = tabDivMatch[1].match(/src=["']([^"']+)["']/i);
                    if (iframeInTab) selectedIframeUrl = iframeInTab[1];
                  }
                }
              } else if (htmlText.includes("HD 720p")) {
                const match720Tab = htmlText.match(/href=["'](#[^"']+)["'][^>]*>\s*HD 720p/i);
                if (match720Tab) {
                  const tabId = match720Tab[1];
                  const tabDivRegex = new RegExp(`<div[^>]+id=["']${tabId.replace('#', '')}["'][^>]*>([\\s\\S]*?)<\/div>`, 'i');
                  const tabDivMatch = htmlText.match(tabDivRegex);
                  if (tabDivMatch) {
                    const iframeInTab = tabDivMatch[1].match(/src=["']([^"']+)["']/i);
                    if (iframeInTab) selectedIframeUrl = iframeInTab[1];
                  }
                }
              }

              // Embed ID extract karna
              const idMatch = selectedIframeUrl.match(/(?:embed-)?([a-zA-Z0-9]+)\.html/i);
              if (idMatch && idMatch[1]) {
                targetEmbedId = idMatch[1];
              }
            }

            let finalHref = movie.href;
            if (targetEmbedId) {
              finalHref = `https://speedostream1.com/${targetEmbedId}.html`; 
            }

            return {
              ...movie,
              href: finalHref
            };

          } catch (err) {
            return movie;
          }
        })
      );

      updatedData.push(...batchResult);
    }

    const finalResult = {
      status: jsonData.status || "success",
      total: updatedData.length,
      data: updatedData
    };

    // CORS headers aur JSON response
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.json(finalResult);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
