addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const targetUrl = "https://server-iota-nine-71.vercel.app/api/filmyfy3";
  
  try {
    // 1. Original playlist fetch karo
    const response = await fetch(targetUrl);
    let m3uText = await response.text();
    
    // 2. M3U entries ko parse karo (#EXTINF aur URL)
    let lines = m3uText.split('\n');
    let newLines = ["#EXTM3U"]; // Header add karo
    
    let currentExtinf = "";
    let movieCount = 0; // Movie count track karne ke liye

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Header skip karo agar pehle se hai
      if (line.startsWith('#EXTM3U')) continue;
      
      if (line.startsWith('#EXTINF')) {
        currentExtinf = line;
      } else if (line.startsWith('http')) {
        // Limit check: Agar 49 movies ho chuki hain, toh loop break kar do
        if (movieCount >= 49) {
          break; 
        }
        
        let originalLink = line;
        let bestLink = await getBestQualityLink(originalLink);
        
        if (currentExtinf) {
          // Group title ko update karke "✨ Filmyfly HD" kar do
          let updatedExtinf = currentExtinf.replace(/group-title="[^"]*"/, 'group-title="✨ Filmyfly HD"');
          newLines.push(updatedExtinf);
        }
        
        newLines.push(bestLink);
        currentExtinf = "";
        movieCount++; // Count badhao
      } else if (line !== "") {
        newLines.push(line);
      }
    }
    
    let modifiedM3u = newLines.join('\n');
    
    // 3. Updated aur limited M3U playlist return karo
    return new Response(modifiedM3u, {
      headers: {
        'Content-Type': 'audio/x-mpegurl; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    return new Response("Error processing playlist: " + err.message, { status: 500 });
  }
}

// Function jo linkmake.in page ko khol kar best quality link nikalega
async function getBestQualityLink(pageUrl) {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    
    const regex = /<a\s+href="([^"]+)"[^>]*>\s*<div\s+class="dll">([^<]+)<\/div>\s*<\/a>/g;
    
    let match;
    let links = [];
    
    while ((match = regex.exec(html)) !== null) {
      links.push({
        url: match[1],
        text: match[2].trim()
      });
    }
    
    if (links.length === 0) return pageUrl;
    
    let chosenLink = links[0].url; 
    
    for (let item of links) {
      let t = item.text.toLowerCase();
      if (t.includes('1080p') || t.includes('3.1gb')) {
        return item.url; 
      }
    }
    
    for (let item of links) {
      let t = item.text.toLowerCase();
      if (t.includes('720p')) {
        chosenLink = item.url;
      }
    }
    
    return chosenLink;

  } catch (e) {
    return pageUrl;
  }
}
