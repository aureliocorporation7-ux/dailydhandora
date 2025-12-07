const Parser = require('rss-parser');

async function debugRSSImages() {
  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'media:content'],
        ['media:thumbnail', 'media:thumbnail'],
        ['content:encoded', 'contentEncoded'],
      ]
    }
  });

  const RSS_FEEDS = [
    'https://news.google.com/rss/topics/CAAqJQgKIh9DQkFTRVFvSUwyMHZNRFZ4ZERBU0JXVnVMVWRDS0FBUAE?ceid=IN:en&hl=en-IN', // India
  ];

  for (const feedUrl of RSS_FEEDS) {
    console.log('\n🔍 Analyzing feed:', feedUrl);
    console.log('─'.repeat(80));

    const feed = await parser.parseURL(feedUrl);
    const item = feed.items[0]; // First article

    console.log('\n📰 Article:', item.title.substring(0, 60) + '...');
    console.log('\n🔑 Available Keys:');
    console.log(Object.keys(item));

    console.log('\n📝 Item Structure:');
    console.log(JSON.stringify(item, null, 2).substring(0, 2000));

    console.log('\n\n🖼️  IMAGE DETECTION RESULTS:');
    console.log('─'.repeat(80));

    // Test 1: Enclosure
    if (item.enclosure) {
      console.log('✅ FOUND: item.enclosure');
      console.log('   URL:', item.enclosure.url || item.enclosure);
    } else {
      console.log('❌ NOT FOUND: item.enclosure');
    }

    // Test 2: media:content
    if (item['media:content']) {
      console.log('✅ FOUND: item["media:content"]');
      console.log('   Data:', JSON.stringify(item['media:content'], null, 2).substring(0, 300));
    } else {
      console.log('❌ NOT FOUND: item["media:content"]');
    }

    // Test 3: media:thumbnail
    if (item['media:thumbnail']) {
      console.log('✅ FOUND: item["media:thumbnail"]');
      console.log('   Data:', JSON.stringify(item['media:thumbnail'], null, 2).substring(0, 300));
    } else {
      console.log('❌ NOT FOUND: item["media:thumbnail"]');
    }

    // Test 4: HTML in content
    const htmlContent = item.content || item.description || item.contentSnippet || '';
    console.log('\n📄 HTML Content Length:', htmlContent.length);
    
    if (htmlContent) {
      console.log('📄 HTML Preview (first 500 chars):');
      console.log(htmlContent.substring(0, 500));
      
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
      const matches = [...htmlContent.matchAll(imgRegex)];
      
      if (matches.length > 0) {
        console.log('\n✅ FOUND IMAGES IN HTML:', matches.length);
        matches.forEach((match, idx) => {
          console.log(`   Image ${idx + 1}:`, match[1].substring(0, 80));
        });
      } else {
        console.log('❌ NO IMAGES FOUND IN HTML');
      }
    }

    // Test 5: content:encoded
    if (item.contentEncoded) {
      console.log('\n✅ FOUND: item.contentEncoded');
      console.log('   Length:', item.contentEncoded.length);
      console.log('   Preview:', item.contentEncoded.substring(0, 200));
    } else {
      console.log('❌ NOT FOUND: item.contentEncoded');
    }

    break; // Only test first feed
  }
}

debugRSSImages().catch(console.error);
