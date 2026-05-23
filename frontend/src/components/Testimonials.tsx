import React from 'react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Product Manager',
    content: 'QuickSync has completely changed how our remote team communicates. Zero latency and super easy to use!',
    avatar: 'PS',
    bg: 'bg-indigo-500/10',
    color: 'text-indigo-400'
  },
  {
    name: 'Rahul Verma',
    role: 'Software Engineer',
    content: 'I love that I don\'t need to install anything. Just sharing a link and the meeting starts in seconds. Highly recommended.',
    avatar: 'RV',
    bg: 'bg-emerald-500/10',
    color: 'text-emerald-400'
  },
  {
    name: 'Anjali Desai',
    role: 'Freelance Designer',
    content: 'The UI is clean, modern, and the audio/video quality is unmatched. Best peer-to-peer communication tool I\'ve used so far.',
    avatar: 'AD',
    bg: 'bg-purple-500/10',
    color: 'text-purple-400'
  },
  {
    name: 'Karan Patel',
    role: 'Marketing Director',
    content: 'We use QuickSync for all our client pitches now. The direct connection means we never have awkward video lag or buffering issues.',
    avatar: 'KP',
    bg: 'bg-rose-500/10',
    color: 'text-rose-400'
  },
  {
    name: 'Neha Gupta',
    role: 'Tech Lead',
    content: 'Security was our main concern. QuickSync’s WebRTC encryption guarantees that our internal discussions stay strictly between us.',
    avatar: 'NG',
    bg: 'bg-cyan-500/10',
    color: 'text-cyan-400'
  },
  {
    name: 'Arjun Reddy',
    role: 'Startup Founder',
    content: 'As a startup, we need tools that just work out of the box. No accounts, no hassle—QuickSync is brilliant in its simplicity.',
    avatar: 'AR',
    bg: 'bg-amber-500/10',
    color: 'text-amber-400'
  },
];

export function Testimonials() {
  return (
    <section className="mt-8 mb-8 relative theme-transition">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-2" style={{ color: 'var(--fg)' }}>
          <Quote className="text-indigo-400" size={24} />
          Loved by Teams Worldwide
        </h2>
        <p className="text-sm max-w-2xl mx-auto" style={{ color: 'var(--fg-faint)' }}>
          See what professionals are saying about their experience with QuickSync's seamless zero-latency meetings.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, idx) => (
          <div key={idx} className="p-6 rounded-3xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 30px var(--shadow)' }}>
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm leading-relaxed mb-6 italic" style={{ color: 'var(--fg-muted)' }}>
              "{t.content}"
            </p>
            <div className="flex items-center gap-3 mt-auto">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${t.bg} ${t.color}`} style={{ border: '1px solid var(--border)' }}>
                {t.avatar}
              </div>
              <div>
                <h4 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{t.name}</h4>
                <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
