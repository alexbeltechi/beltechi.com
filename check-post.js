require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkPosts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const entries = db.collection('entries');
    
    // Get all posts
    const allPosts = await entries.find({ collection: 'posts' }).toArray();
    console.log(`📝 Total posts in database: ${allPosts.length}\n`);
    
    // Get published posts
    const publishedPosts = await entries.find({ 
      collection: 'posts', 
      status: 'published' 
    }).toArray();
    console.log(`✅ Published posts: ${publishedPosts.length}\n`);
    
    // Show recent posts
    const recentPosts = await entries
      .find({ collection: 'posts' })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log('📋 Most recent posts:');
    recentPosts.forEach(post => {
      console.log(`  - "${post.data.title}" (${post.status}) - ${post.createdAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkPosts();
