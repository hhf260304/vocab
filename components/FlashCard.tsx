'use client'

import { useState } from 'react'
import { Vocabulary } from '@/lib/types'

interface Props {
  vocab: Vocabulary
  onRemembered: () => void
  onForgot: () => void
}

export default function FlashCard({ vocab, onRemembered, onForgot }: Props) {
  const [flipped, setFlipped] = useState(false)

  function speak() {
    const utterance = new SpeechSynthesisUtterance(vocab.kana)
    utterance.lang = 'ja-JP'
    speechSynthesis.speak(utterance)
  }

  function handleAnswer(remembered: boolean) {
    setFlipped(false)
    setTimeout(() => {
      if (remembered) { onRemembered() } else { onForgot() }
    }, 150)
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="perspective w-full max-w-sm">
        <div
          className={`relative w-full h-56 cursor-pointer transform-style-3d transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''}`}
          onClick={() => !flipped && setFlipped(true)}
        >
          <div className="backface-hidden absolute inset-0 bg-white rounded-3xl border-2 border-gray-200 flex flex-col items-center justify-center p-6 shadow-sm">
            <p className="text-4xl font-bold text-gray-900 text-center">{vocab.chinese}</p>
            <p className="text-gray-400 text-sm mt-4">點擊翻轉</p>
          </div>

          <div className="backface-hidden rotate-y-180 absolute inset-0 bg-indigo-600 rounded-3xl flex flex-col items-center justify-center p-6 shadow-sm">
            <p className="text-4xl font-bold text-white text-center">{vocab.japanese}</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-indigo-200 text-lg">{vocab.kana}</p>
              <button
                onClick={(e) => { e.stopPropagation(); speak() }}
                className="text-indigo-200 hover:text-white transition-colors text-xl"
              >
                🔊
              </button>
            </div>
            {vocab.exampleJp && (
              <div className="mt-4 text-center">
                <p className="text-indigo-100 text-sm">{vocab.exampleJp}</p>
                <p className="text-indigo-200 text-xs mt-1">{vocab.exampleZh}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flex gap-4 w-full max-w-sm">
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 py-3.5 bg-red-50 text-red-600 border border-red-200 rounded-2xl font-semibold hover:bg-red-100 transition-colors"
          >
            😞 忘記
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 py-3.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl font-semibold hover:bg-emerald-100 transition-colors"
          >
            😊 記得
          </button>
        </div>
      )}
    </div>
  )
}
