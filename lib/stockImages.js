/**
 * 📷 Stock Images Library
 * Category-wise fallback images for DailyDhandora
 * 
 * Priority System:
 * 1. AI Generated Image (if enabled)
 * 2. Stock Image from this library
 * 3. Generate Card (for WhatsApp essentials)
 */

const STOCK_IMAGES = {
  // ✅ सरकारी योजना (Government Schemes) - WELL STOCKED
  sarkari_yojana: [
    "https://i.ibb.co/4wYxc5FV/image.png",
    "https://i.ibb.co/tP3dLg4g/image.png",
    "https://i.ibb.co/DP5Hy6QG/image.png",
    "https://i.ibb.co/MyT2mXz1/image.png",
    "https://i.ibb.co/ymzZTB2W/image.png",
    "https://i.ibb.co/twVCNL2N/image.png",
    "https://i.ibb.co/s9jTvpvY/image.png",
    "https://i.ibb.co/cSpHXgfM/image.png",
    "https://i.ibb.co/kgpR7G0N/image.png",
    "https://i.ibb.co/nqmnygDV/image.png"
  ],

  // ✅ भर्ती व रिजल्ट (Jobs & Results)
  bharti_result: [
    "https://i.ibb.co/0Ry90pGt/image.png",
    "https://i.ibb.co/gbJwRXk3/image.png",
    "https://i.ibb.co/s9gVj2Db/image.png",
    "https://i.ibb.co/vCykWHdd/image.png",
    "https://i.ibb.co/7xfSnQmV/image.png",
    "https://i.ibb.co/HTBpP799/image.png",
    "https://i.ibb.co/yFRcxty2/image.png",
    "https://i.ibb.co/Vpt3YpYw/image.png"
  ],

  // ⚠️ मंडी भाव (Mandi Rates) - NEEDS MORE IMAGES
  // Add your mandi/agriculture related images here
  // If empty, will trigger card generation
  mandi_bhav: [
    "https://i.ibb.co/v64vMRwm/image.png"
    // Add more mandi images here...
  ],

  // ⚠️ शिक्षा विभाग (Education Department) - NEEDS MORE IMAGES
  // Add your education related images here
  // If empty, will trigger card generation
  shiksha_vibhag: [
    "https://i.ibb.co/GQ5rMqS7/image.png"
    // Add more education images here...
  ],

  // ✅ नागौर न्यूज़ (Nagaur News)
  nagaur_news: [
    "https://i.ibb.co/Ndcmzbzc/image.png"
    // Add more Nagaur/Rajasthan images here...
  ],

  // 🔄 Default fallback
  default: [
    "https://i.ibb.co/Ndcmzbzc/image.png"
  ]
};

// Aliases for backward compatibility
STOCK_IMAGES.schemes = STOCK_IMAGES.sarkari_yojana;
STOCK_IMAGES.jobs = STOCK_IMAGES.bharti_result;
STOCK_IMAGES.mandi = STOCK_IMAGES.mandi_bhav;
STOCK_IMAGES.education = STOCK_IMAGES.shiksha_vibhag;
STOCK_IMAGES.rajasthan = STOCK_IMAGES.nagaur_news;

/**
 * Get random item from array
 */
function getRandom(arr) {
  if (!arr || arr.length === 0) return STOCK_IMAGES.default[0];
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Check if a category has real stock images (not just placeholders)
 * @param {string} category - Category name (Hindi or English)
 * @returns {boolean} - True if category has at least 1 real image
 */
function hasStockImages(category) {
  const key = getCategoryKey(category);
  const images = STOCK_IMAGES[key];

  // Check if images exist and are not placeholder URLs
  if (!images || images.length === 0) return false;

  // Filter out placeholder URLs
  const realImages = images.filter(url =>
    !url.includes('placehold.co') &&
    !url.includes('placeholder') &&
    url.startsWith('http')
  );

  return realImages.length > 0;
}

/**
 * Get the internal key for a category
 * @param {string} category - Category name (Hindi or English)
 * @returns {string} - Internal key
 */
function getCategoryKey(category) {
  if (!category) return 'default';

  const cat = category.toLowerCase().trim();

  // Hindi category matching
  if (cat.includes('सरकारी योजना') || cat.includes('yojana') || cat.includes('scheme')) {
    return 'sarkari_yojana';
  }
  if (cat.includes('भर्ती व रिजल्ट') || cat.includes('नौकरियां') || cat.includes('job') || cat.includes('bharti')) {
    return 'bharti_result';
  }
  if (cat.includes('मंडी भाव') || cat.includes('mandi') || cat.includes('bhav')) {
    return 'mandi_bhav';
  }
  if (cat.includes('शिक्षा विभाग') || cat.includes('shiksha')) {
    return 'shiksha_vibhag';
  }
  if (cat.includes('नागौर न्यूज़') || cat.includes('nagaur') || cat.includes('rajasthan') || cat.includes('राजस्थान')) {
    return 'nagaur_news';
  }

  return 'default';
}

/**
 * Get a random fallback image for a category
 * @param {string} category - Category name (Hindi or English)
 * @returns {string} - Image URL
 */
function getCategoryFallback(category) {
  const key = getCategoryKey(category);
  return getRandom(STOCK_IMAGES[key]) || getRandom(STOCK_IMAGES.default);
}

/**
 * Get list of WhatsApp essential categories (cards MUST be generated)
 * @returns {string[]} - Array of category names
 */
function getWhatsAppEssentials() {
  return ['शिक्षा विभाग', 'मंडी भाव'];
}

/**
 * Check if a category is WhatsApp essential
 * @param {string} category - Category name
 * @returns {boolean}
 */
function isWhatsAppEssential(category) {
  if (!category) return false;
  const essentials = getWhatsAppEssentials();
  return essentials.some(e => category.includes(e) || e.includes(category));
}

module.exports = {
  STOCK_IMAGES,
  getCategoryFallback,
  getCategoryKey,
  hasStockImages,
  getWhatsAppEssentials,
  isWhatsAppEssential
};
