/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PairConfig, NewsItem } from '../types';

export const MAJOR_FOREX_PAIRS: Omit<PairConfig, 'sparkline'>[] = [
  {
    sym: 'EURUSD',
    label: 'EUR/USD',
    bnLabel: 'ইউরো / ইউএস ডলার',
    base: 1.08420,
    pip: 0.0001,
    dec: 5,
    spread: 0.8,
  },
  {
    sym: 'GBPUSD',
    label: 'GBP/USD',
    bnLabel: 'পাউন্ড / ইউএস ডলার',
    base: 1.27150,
    pip: 0.0001,
    dec: 5,
    spread: 1.1,
  },
  {
    sym: 'USDJPY',
    label: 'USD/JPY',
    bnLabel: 'ইউএস ডলার / জাপানি ইয়েন',
    base: 156.450,
    pip: 0.01,
    dec: 3,
    spread: 1.4,
  },
  {
    sym: 'XAUUSD',
    label: 'XAU/USD (Gold)',
    bnLabel: 'স্বর্ণ / ইউএস ডলার',
    base: 3350.00,
    pip: 0.1,
    dec: 2,
    spread: 2.5,
  },
  {
    sym: 'AUDUSD',
    label: 'AUD/USD',
    bnLabel: 'অস্ট্রেলিয়ান / ইউএস ডলার',
    base: 0.66520,
    pip: 0.0001,
    dec: 5,
    spread: 1.0,
  },
  {
    sym: 'USDCAD',
    label: 'USD/CAD',
    bnLabel: 'ইউএস ডলার / কানাডিয়ান ডলার',
    base: 1.36240,
    pip: 0.0001,
    dec: 5,
    spread: 1.2,
  },
  {
    sym: 'BTCUSD',
    label: 'BTC/USD (Bitcoin)',
    bnLabel: 'বিটকয়েন / ইউএস ডলার',
    base: 95000.00,
    pip: 1.0,
    dec: 2,
    spread: 8.5,
  },
];

export const FOREX_NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news-1',
    time: '১ ঘণ্টা আগে',
    title: 'NFP Job Growth Surpasses Estimates, Dollar Strengthens',
    titleBn: 'প্রত্যাশিত এনএফপি জব গ্রোথ বৃদ্ধি, ডলারের শক্তি সঞ্চার',
    impact: 'HIGH',
    source: 'Bloomberg',
    summary: 'აშშ-এর নন-ফার্ম পেরোল বৃদ্ধি পেয়ে ২,৭২,০০০ জনে উন্নীত হয়েছে যা বিশেষজ্ঞদের প্রত্যাশার চেয়ে অনেক বেশি। এর ফলে ফেড সুদের হার বেশিদিন ধরে রাখতে পারে এবং ইউএস ডলার শক্তিশালী হচ্ছে।',
    impactColor: 'text-[#ff3d57] bg-red-950/40 border-red-800/30',
  },
  {
    id: 'news-2',
    time: '৩ ঘণ্টা আগে',
    title: 'ECB Signals Cautious Rate Cuts Amid Stubborn CPI',
    titleBn: 'মুদ্রাস্ফীতির কারণে ইসিবি-র সুদের হার কমাতে সতর্কতা',
    impact: 'MEDIUM',
    source: 'Reuters',
    summary: 'ইউরোপীয় ইউনিয়ন অঞ্চলের সিপিআই প্রত্যাশিত ৩% এ স্থির থাকায় ডন জোন্স ও ইসিবি মেম্বাররা সুদের হার হ্রাসের সিদ্ধান্ত ধীরেসুস্থে নেওয়ার তাগিদ দিচ্ছেন।',
    impactColor: 'text-[#ffc107] bg-yellow-950/40 border-yellow-800/30',
  },
  {
    id: 'news-3',
    time: '৫ ঘণ্টা আগে',
    title: 'BOJ Core CPI Rises, Pressuring Yen Pair Boundaries',
    titleBn: 'জাপানের মূল সিপিআই বৃদ্ধি, ইয়েন জোড়ায় তীব্র মুভমেন্ট',
    impact: 'HIGH',
    source: 'Nikkei',
    summary: 'ব্যাংক অব জাপান জানিয়েছে যে কোর মুদ্রাস্ফীতি ২.৫% ছাড়িয়েছে, যার ফলে বন্ড বাই হ্রাস এবং পরবর্তী কোয়ার্টারে সুদের হার বৃদ্ধির সম্ভাবনা উঁকি দিচ্ছে।',
    impactColor: 'text-[#ff3d57] bg-red-950/40 border-red-800/30',
  },
  {
    id: 'news-4',
    time: '৮ ঘণ্টা আগে',
    title: 'Gold Retreats From Highs as Yields Recover Pace',
    titleBn: 'বন্ড ইয়েল্ড পুনরুদ্ধারে স্বর্ণের কিছুটা মূল্য সংশোধন',
    impact: 'LOW',
    source: 'Kitco News',
    summary: '১০ বছরের মার্কিন ট্রেজারি বিল ও ইয়েল্ডের রিবাউন্ডের কারণে স্বর্ণের আকাশচুম্বী মূল্যে ডব্লিউ-আকারের কারেকশন দেখা যাচ্ছে।',
    impactColor: 'text-[#00d4ff] bg-cyan-950/40 border-cyan-800/30',
  },
];
