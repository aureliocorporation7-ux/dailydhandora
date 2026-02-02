'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

/**
 * 🔥 Trending Section
 * 
 * Shows top viewed articles from last 24 hours
 * Horizontal scrollable cards with fire emoji
 * 
 * @param {Object[]} articles - Array of article objects
 * @param {boolean} showViewCounts - Whether to show view counts (from admin settings)
 */
export default function TrendingSection({ articles = [], showViewCounts = true }) {
    const scrollContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Get top 6 articles sorted by views
    const trendingArticles = [...articles]
        .filter(a => a.views > 0)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 6);

    // Check scroll position
    const checkScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        setCanScrollLeft(container.scrollLeft > 10);
        setCanScrollRight(
            container.scrollLeft < container.scrollWidth - container.clientWidth - 10
        );
    };

    useEffect(() => {
        checkScroll();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            return () => container.removeEventListener('scroll', checkScroll);
        }
    }, [trendingArticles]);

    const scroll = (direction) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollAmount = 300;
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // Don't render if no trending articles
    if (trendingArticles.length === 0) return null;

    return (
        <section className="mb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Flame className="w-6 h-6 text-orange-500" />
                    <h2 className="text-xl font-bold text-white">चर्चित खबरें</h2>
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full font-medium">
                        Trending
                    </span>
                </div>

                {/* Scroll Buttons - Desktop */}
                <div className="hidden md:flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className={`p-2 rounded-full bg-neutral-800 transition-all ${canScrollLeft
                            ? 'hover:bg-neutral-700 text-white'
                            : 'opacity-50 cursor-not-allowed text-gray-500'
                            }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className={`p-2 rounded-full bg-neutral-800 transition-all ${canScrollRight
                            ? 'hover:bg-neutral-700 text-white'
                            : 'opacity-50 cursor-not-allowed text-gray-500'
                            }`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable Cards */}
            <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {trendingArticles.map((article, index) => (
                    <Link
                        key={article.id}
                        href={`/article/${article.id}`}
                        className="flex-shrink-0 w-72 snap-start group"
                    >
                        <div className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10">
                            {/* Image */}
                            <div className="relative h-40 overflow-hidden">
                                <Image
                                    src={article.imageUrl || '/placeholder.jpg'}
                                    alt={article.headline || 'News'}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    sizes="288px"
                                />
                                {/* Rank Badge */}
                                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full">
                                    <Flame className="w-3 h-3 text-orange-500" />
                                    <span className="text-xs font-bold text-white">#{index + 1}</span>
                                </div>
                                {/* Views Badge - Only show if admin toggle is ON */}
                                {showViewCounts && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full">
                                        <Eye className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-300">{article.views || 0}</span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-3">
                                {/* Category */}
                                <span className="text-xs text-orange-400 font-medium">
                                    {article.category || 'नागौर न्यूज़'}
                                </span>
                                {/* Headline */}
                                <h3 className="text-sm font-medium text-white mt-1 line-clamp-2 group-hover:text-orange-400 transition-colors">
                                    {article.headline}
                                </h3>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Scroll Indicator - Mobile */}
            <div className="flex justify-center gap-1 mt-3 md:hidden">
                {trendingArticles.map((_, index) => (
                    <div
                        key={index}
                        className="w-1.5 h-1.5 rounded-full bg-neutral-700"
                    />
                ))}
            </div>
        </section>
    );
}
