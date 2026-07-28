const http = require('http');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const TARGET_URL = 'https://prmovies-domain-a250.poonamchouhan076.workers.dev/';

const server = http.createServer(async (req, res) => {
    // CORS headers add karna taaki kahin se bhi access ho sake
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');

    if (req.url === '/' || req.url === '/movies') {
        try {
            // Target Worker se HTML fetch karo
            const response = await axios.get(TARGET_URL);
            const htmlContent = response.data;

            const movies = [];
            const mlItems = htmlContent.split('class="ml-item"');

            mlItems.forEach((item, index) => {
                if (index === 0) return;

                const hrefMatch = item.match(/<a\s+href="([^"]+)"/);
                const imgMatch = item.match(/data-original="([^"]+)"/);
                const titleMatch = item.match(/<h2>([\s\S]*?)<\/h2>/);

                if (titleMatch && hrefMatch) {
                    movies.push({
                        title: titleMatch[1].trim(),
                        image: imgMatch ? imgMatch[1] : '',
                        href: hrefMatch[1]
                    });
                }
            });

            res.writeHead(200);
            res.end(JSON.stringify({ status: 'success', total: movies.length, data: movies }, null, 2));

        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ status: 'error', message: error.message }));
        }
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ status: 'error', message: 'Endpoint not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
