import React, { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { submitFeedback } from '../lib/api';

interface FeedbackModalProps {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please enter your feedback message.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await submitFeedback(message);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl theme-transition"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <MessageCircle size={18} className="text-indigo-400" />
            Submit Feedback
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'var(--fg-faint)' }}
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={20} />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-green-400">Feedback Sent!</h3>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Thank you for helping us improve QuickSync.</p>
            </div>
          ) : (
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
                Have a suggestion, found a bug, or just want to say hi? Let us know below!
              </p>
              
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}
              
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full h-32 rounded-xl p-3 text-sm resize-none mb-4 focus:outline-none transition-all theme-transition"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
              />
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
                {!isSubmitting && <Send size={14} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
