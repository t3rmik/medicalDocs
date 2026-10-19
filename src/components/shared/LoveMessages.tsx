'use client'

import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function LoveMessages() {
  useEffect(() => {
    const messages = [
      "Sei bravissima, Ylenia! Francesco fa il tifo per la tua laurea! ❤️",
      "Ogni pagina che studi ti avvicina al traguardo. Spacca tutto, Ylenia! ✨",
      "Ricordati di fare una pausa ogni tanto, amore mio. Ti amo! - Fra 📚💖",
      "Sei la futura dottoressa più brillante del mondo (e della mia vita). 💕",
      "Il tuo impegno e la tua dedizione ripagheranno presto. Credi in te stessa! 🚀",
      "Vai a prenderti quella corona d'alloro, Ylenia! Sono orgoglioso di te. 🎓🌟"
    ];

    const showLove = () => {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      toast((t) => (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-sm">🎓 Per la mia dottoressa:</p>
            <p className="text-xs mt-0.5">{randomMsg}</p>
          </div>
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="bg-pink-200 hover:bg-pink-300 text-pink-800 font-bold px-2 py-1 rounded-full text-xs transition"
          >
            ✕
          </button>
        </div>
      ), { 
        duration: 8000, 
        position: 'top-right',
        style: { 
          background: '#fdf2f8', 
          color: '#be185d', 
          border: '2px solid #f472b6',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(244, 114, 182, 0.4)',
          maxWidth: '350px'
        }
      });
    };

    // Subito dopo 3 secondi dall'avvio
    const initialTimer = setTimeout(() => {
      showLove();
      // Poi ripeti ogni 5 minuti esatti (300.000 ms)
      const interval = setInterval(showLove, 300000);
      return () => clearInterval(interval);
    }, 3000);

    return () => clearTimeout(initialTimer);
  }, []);

  return null;
}