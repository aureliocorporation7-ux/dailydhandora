const STOCK_IMAGES = {
  schemes: [
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
  jobs: [
    "https://i.ibb.co/0Ry90pGt/image.png",
    "https://i.ibb.co/gbJwRXk3/image.png",
    "https://i.ibb.co/s9gVj2Db/image.png",
    "https://i.ibb.co/vCykWHdd/image.png",
    "https://i.ibb.co/7xfSnQmV/image.png",
    "https://i.ibb.co/HTBpP799/image.png",
    "https://i.ibb.co/yFRcxty2/image.png",
    "https://i.ibb.co/Vpt3YpYw/image.png"
    
  ],
  mandi: [
    "https://i.ibb.co/v64vMRwm/image.png"
  ],
  education: [
    "https://i.ibb.co/GQ5rMqS7/image.png"
  ],
  shiksha_vibhag: [
    "https://placehold.co/1200x675/1e3a8a/ffffff/png?text=Rajasthan+Education+Update", // Placeholder 1
    "https://placehold.co/1200x675/1e3a8a/ffffff/png?text=School+News", // Placeholder 2
    "https://i.ibb.co/GQ5rMqS7/image.png" // Fallback to generic edu
  ],
  bharti_result: [
    "https://placehold.co/1200x675/0f766e/ffffff/png?text=Result+Declared", // Placeholder 1
    "https://i.ibb.co/0Ry90pGt/image.png" // Fallback to generic jobs
  ],
  rajasthan: [
    "https://i.ibb.co/Ndcmzbzc/image.png"
  ],
  default: [
    "https://i.ibb.co/Ndcmzbzc/image.png"
  ]
};

function getRandom(arr) {
  if (!arr || arr.length === 0) return STOCK_IMAGES.default[0];
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCategoryFallback(category) {
  if (!category) return getRandom(STOCK_IMAGES.default);
  
  const cat = category.toLowerCase().trim();
  
  if (cat.includes('yojana') || cat.includes('scheme') || cat.includes('सरकारी योजना')) {
    return getRandom(STOCK_IMAGES.schemes);
  }
  if (cat.includes('job') || cat.includes('naukri') || cat.includes('भर्ती व रिजल्ट') || cat.includes('नौकरियां')) {
    return getRandom(STOCK_IMAGES.bharti_result); // Use specific list
  }
  if (cat.includes('mandi') || cat.includes('bhav') || cat.includes('मंडी भाव')) {
    return getRandom(STOCK_IMAGES.mandi);
  }
  if (cat.includes('शिक्षा विभाग')) { // Exact match preference
    return getRandom(STOCK_IMAGES.shiksha_vibhag);
  }
  if (cat.includes('education') || cat.includes('school') || cat.includes('शिक्षा')) {
    return getRandom(STOCK_IMAGES.education);
  }
  if (cat.includes('rajasthan') || cat.includes('politics') || cat.includes('नागौर न्यूज़') || cat.includes('राजस्थान')) {
    return getRandom(STOCK_IMAGES.rajasthan);
  }
  
  return getRandom(STOCK_IMAGES.default);
}

module.exports = { STOCK_IMAGES, getCategoryFallback };
