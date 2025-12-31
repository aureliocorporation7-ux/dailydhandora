const axios = require('axios');
const cheerio = require('cheerio');

// Target URL: Dainik Bhaskar Nagaur Section
const TARGET_URL = 'https://www.bhaskar.com/local/rajasthan/nagaur';

// Headers to mimic a real browser (Essential for Bhaskar)
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    'Referer': 'https://www.google.com/'
};

async function scrapeBhaskar() {
    console.log(`
🔍 [TEST] Starting Dainik Bhaskar Scraper...
`);
    console.log(`👉 Target: ${TARGET_URL}
`);

    try {
        // 1. Fetch the Listing Page
        const { data } = await axios.get(TARGET_URL, { headers: HEADERS });
        const $ = cheerio.load(data);
        
        const articles = [];

        // 2. Find Article Links
        // Bhaskar usually puts latest news in <li> tags or specific grid containers
        // We look for links that look like news slugs
        $('a').each((i, el) => {
            const link = $(el).attr('href');
            
            // Filter valid news links for Nagaur
            if (link && link.includes('/local/rajasthan/nagaur/news/') && !link.includes('/rss/')) {
                // Ensure full URL
                const fullLink = link.startsWith('http') ? link : `https://www.bhaskar.com${link}`;
                
                // Avoid duplicates
                if (!articles.find(a => a.url === fullLink)) {
                    articles.push({ url: fullLink });
                }
            }
        });

        console.log(`✅ Found ${articles.length} potential articles.`);
        
        // --- LOGIC TO FIND LATEST NEWS ---
        // Bhaskar URLs usually end with a numeric ID (e.g., ...-136822992.html)
        // We can extract this ID and sort by descending order to get the absolute latest.
        articles.sort((a, b) => {
            const getId = (url) => {
                const match = url.match(/-(\d+)\.html/);
                return match ? parseInt(match[1], 10) : 0;
            };
            return getId(b.url) - getId(a.url);
        });

        console.log(`👉 Sorted by ID (Latest First). Testing the top 3...\n`);

        // 3. Process top 3 articles (Deep Dive)
        for (const article of articles.slice(0, 3)) {
            console.log(`---------------------------------------------------
`);
            console.log(`📥 Fetching: ${article.url}`);
            
            try {
                const artRes = await axios.get(article.url, { headers: HEADERS });
                const $art = cheerio.load(artRes.data);

                // A. Extract Headline (h1 is standard)
                const headline = $art('h1').first().text().trim();

                // B. Extract Image (OG Image is most reliable)
                let imageUrl = $art('meta[property="og:image"]').attr('content');
                if (!imageUrl) {
                    // Fallback to finding img inside figure
                    imageUrl = $art('figure img').first().attr('src');
                }

                // C. Extract Body Text
                // Bhaskar often splits text into multiple <p> tags inside a specific div
                // We exclude "Also Read" links or ads
                let bodyText = '';
                
                // Strategy: Find the div with the most <p> tags
                let maxPTags = 0;
                let contentContainer = null;

                $art('div').each((i, div) => {
                    const pCount = $art(div).find('p').length;
                    if (pCount > maxPTags && pCount < 50) { // < 50 to avoid footer/header clumps
                        maxPTags = pCount;
                        contentContainer = div;
                    }
                });

                if (contentContainer) {
                    $art(contentContainer).find('p').each((i, p) => {
                        const text = $art(p).text().trim();
                        // Filter junk
                        if (text && !text.includes('App Download') && !text.includes('whatsapp')) {
                            bodyText += text + '\n\n';
                        }
                    });
                } else {
                    // Fallback: Grab all P tags in article structure
                    $art('article p').each((i, p) => {
                        bodyText += $art(p).text().trim() + '\n\n';
                    });
                }

                // D. Output Result
                console.log(`📌 Headline: ${headline}`);
                console.log(`🖼️  Image:    ${imageUrl ? imageUrl : 'Not Found ❌'}`);
                console.log(`📝 Content Length: ${bodyText.length} chars`);
                console.log(`📄 FULL CONTENT:\n${bodyText}`);
                console.log(`🔗 Link: ${article.url}`);

            } catch (innerErr) {
                console.error(`❌ Failed to scrape specific article: ${innerErr.message}`);
            }
            
            // Polite delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.error('🔥 [CRITICAL ERROR] Main Scraper Failed:', error.message);
        if (error.response && error.response.status === 403) {
            console.log("⚠️ Bhaskar blocked the request (403). We might need stronger headers or Puppeteer.");
        }
    }
}

scrapeBhaskar();
