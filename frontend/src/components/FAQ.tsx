"use client";

import React, { useState } from 'react';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';

const faqs = [
  {
    question: 'Do I need to install anything to use QuickSync?',
    answer: 'No! QuickSync runs entirely in your browser using standard WebRTC. Just create a meeting, share the link, and the other person can join instantly.'
  },
  {
    question: 'Is it really free?',
    answer: 'Yes, our core peer-to-peer features are completely free to use without even signing up. We will offer a Pro tier soon with advanced team management and recording features.'
  },
  {
    question: 'Are my calls secure?',
    answer: 'Absolutely. We use WebRTC which has end-to-end encryption built right in. Your audio, video, and screen sharing data never touches our servers.'
  },
  {
    question: 'How many people can join a meeting?',
    answer: 'QuickSync is currently optimized for 1-on-1 and small team syncs (up to 4-6 people) to ensure zero latency and crystal-clear quality without requiring a central media server.'
  },
  {
    question: 'What are the benefits of signing in?',
    answer: 'Signing in with Google allows you to save your meeting history and create dedicated, recurring "channels" for your team to use anytime.'
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="mt-10 sm:mt-16 relative theme-transition">
      <div className="text-center mb-10">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 flex items-center justify-center gap-2" style={{ color: 'var(--fg)' }}>
          <MessageCircleQuestion className="text-indigo-400" size={24} />
          Frequently Asked Questions
        </h2>
        <p className="text-sm max-w-2xl mx-auto" style={{ color: 'var(--fg-faint)' }}>
          Everything you need to know about the product and how it works.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => toggle(idx)}
              className="w-full text-left px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4 focus:outline-none"
            >
              <span className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{faq.question}</span>
              <ChevronDown
                size={18}
                className={`transition-transform duration-300 shrink-0 ${openIndex === idx ? 'rotate-180 text-indigo-400' : ''}`}
                style={{ color: openIndex === idx ? undefined : 'var(--fg-muted)' }}
              />
            </button>
            <div
              className={`px-4 sm:px-6 overflow-hidden transition-all duration-300 ease-in-out ${openIndex === idx ? 'max-h-40 pb-4 sm:pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
