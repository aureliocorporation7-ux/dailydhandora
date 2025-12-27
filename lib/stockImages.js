export const STOCK_IMAGES = {
  politics: [
    "https://i.ibb.co/LdGj0S07/image.png",
    "https://i.ibb.co/Sw8zgqsr/image.png",
    "https://i.ibb.co/QS6mrt4/image.png",
    "https://i.ibb.co/wNq9Dz33/image.png",
    "https://i.ibb.co/bgd0m4Pw/image.png",
    "https://i.ibb.co/QF7XdBKD/image.png",
    "https://i.ibb.co/kgHZtCQ6/image.png",
    "https://i.ibb.co/d4z9jg3m/image.png",
    "https://i.ibb.co/nMvQ7HhX/image.png",
    "https://i.ibb.co/spS4rZ7n/image.png",
    "https://i.ibb.co/GQwKpvY7/image.png"
  ],
  sports: [
    "https://i.ibb.co/M51FHhNk/image.png",
    "https://i.ibb.co/WNZGbYty/image.png",
    "https://i.ibb.co/vvmfZyGD/image.png",
    "https://i.ibb.co/RT0GxtVt/image.png",
    "https://i.ibb.co/G3crFFsz/image.png",
    "https://i.ibb.co/FbPZYMZZ/image.png",
    "https://i.ibb.co/DfCnMwYy/image.png",
    "https://i.ibb.co/bjTWgVMs/image.png",
    "https://i.ibb.co/qFj0mkJP/image.png",
    "https://i.ibb.co/WNGqHpc3/image.png"
  ],
  entertainment: [
    "https://i.ibb.co/rKd9YTbs/image.png",
    "https://i.ibb.co/gLHThZKh/image.png",
    "https://i.ibb.co/wrpZDZF8/image.png",
    "https://i.ibb.co/F49sLpZ8/image.png",
    "https://i.ibb.co/DfzF0D68/image.png",
    "https://i.ibb.co/sp8rK873/image.png",
    "https://i.ibb.co/sJHPQbb5/image.png",
    "https://i.ibb.co/G4gmvcf7/image.png",
    "https://i.ibb.co/ZnWfpbJ/image.png",
    "https://i.ibb.co/dsfjcdpB/image.png"
  ],
  tech: [
    "https://i.ibb.co/Y72wNJND/image.png",
    "https://i.ibb.co/PvfdG87c/image.png",
    "https://i.ibb.co/DPSS1P98/image.png",
    "https://i.ibb.co/hx8HF8Vs/image.png",
    "https://i.ibb.co/hFRCPYSX/image.png",
    "https://i.ibb.co/vKZD01d/image.png",
    "https://i.ibb.co/Xf7ZFsrB/image.png",
    "https://i.ibb.co/6cttQpN9/image.png",
    "https://i.ibb.co/qYVxHYwP/image.png",
    "https://i.ibb.co/7dkyrZv7/image.png"
  ],
  business: [
    "https://i.ibb.co/xPrM8sZ/image.png",
    "https://i.ibb.co/6RbbKNH9/image.png",
    "https://i.ibb.co/nMQv6TNd/image.png",
    "https://i.ibb.co/1GXWgFdB/image.png",
    "https://i.ibb.co/Y4RShWSW/image.png",
    "https://i.ibb.co/zTRZqVjY/image.png",
    "https://i.ibb.co/twCgVM2k/image.png",
    "https://i.ibb.co/WNNrg1Y7/image.png",
    "https://i.ibb.co/8DPhrRp6/image.png",
    "https://i.ibb.co/nNVJ6Rxc/image.png"
  ],
  health: [
    "https://i.ibb.co/TxT4NbK0/image.png",
    "https://i.ibb.co/8LyCWFzs/image.png",
    "https://i.ibb.co/Q7KMQHHp/image.png",
    "https://i.ibb.co/PZ8XKdzG/image.png",
    "https://i.ibb.co/WWqKdphH/image.png",
    "https://i.ibb.co/xtFLBgbF/image.png",
    "https://i.ibb.co/zhNrtZVJ/image.png",
    "https://i.ibb.co/380kTnq/image.png",
    "https://i.ibb.co/szGNXjS/image.png",
    "https://i.ibb.co/3yjZkx0V/image.png"
  ],
  default: [
    "https://i.ibb.co/V04TnG8D/image.png",
    "https://i.ibb.co/Vp3KWBZr/image.png",
    "https://i.ibb.co/wNDYNyy5/image.png",
    "https://i.ibb.co/BV4Zwk3J/image.png",
    "https://i.ibb.co/wNJ0fZM1/image.png",
    "https://i.ibb.co/b5JCZ69y/image.png",
    "https://i.ibb.co/CK6v7Pbz/image.png",
    "https://i.ibb.co/LzQRBBhc/image.png",
    "https://i.ibb.co/p6DB9MVC/image.png",
    "https://i.ibb.co/67qV2Db0/image.png"
  ]
};

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getCategoryFallback(category) {
  if (!category) return getRandom(STOCK_IMAGES.default);
  
  const lowerCat = category.toLowerCase().trim();
  
  if (lowerCat.includes('politic')) {
    return getRandom(STOCK_IMAGES.politics);
  }
  if (lowerCat.includes('sport') || lowerCat.includes('cricket')) {
    return getRandom(STOCK_IMAGES.sports);
  }
  if (lowerCat.includes('tech') || lowerCat.includes('gadget')) {
    return getRandom(STOCK_IMAGES.tech);
  }
  if (lowerCat.includes('movie') || lowerCat.includes('cinema') || lowerCat.includes('music')) {
    return getRandom(STOCK_IMAGES.entertainment);
  }
  if (lowerCat.includes('business') || lowerCat.includes('market') || lowerCat.includes('money')) {
    return getRandom(STOCK_IMAGES.business);
  }
  if (lowerCat.includes('health') || lowerCat.includes('doctor')) {
    return getRandom(STOCK_IMAGES.health);
  }
  
  return getRandom(STOCK_IMAGES.default);
}
