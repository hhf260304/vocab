"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Vocabulary } from "@/lib/db/schema";

interface Props {
	vocab: Vocabulary;
	onRemembered: () => void;
	onForgot: () => void;
}

export default function FlashCard({ vocab, onRemembered, onForgot }: Props) {
	const [flipped, setFlipped] = useState(false);

	function speak() {
		const utterance = new SpeechSynthesisUtterance(vocab.japanese);
		utterance.lang = "ja-JP";
		speechSynthesis.speak(utterance);
	}

	useEffect(() => {
		if (flipped) {
			const utterance = new SpeechSynthesisUtterance(vocab.japanese);
			utterance.lang = "ja-JP";
			speechSynthesis.speak(utterance);
		}
	}, [flipped, vocab.japanese]);

	function handleAnswer(remembered: boolean) {
		setFlipped(false);
		setTimeout(() => {
			if (remembered) {
				onRemembered();
			} else {
				onForgot();
			}
		}, 150);
	}

	return (
		<div className="flex flex-col items-center gap-6 w-full">
			<div className="perspective w-full max-w-sm">
				<div
					className={`relative w-full h-56 cursor-pointer transform-style-3d transition-transform duration-500 ${flipped ? "rotate-y-180" : ""}`}
					onClick={() => setFlipped((f) => !f)}
				>
					<div className="backface-hidden absolute inset-0 bg-white rounded-3xl border-2 border-stone-200 flex flex-col items-center justify-center p-6 shadow-sm">
						<p className="text-4xl font-bold text-stone-900 text-center">
							{vocab.chinese}
						</p>
						<p className="text-stone-400 text-sm mt-4">點擊翻轉</p>
					</div>

					<div className="backface-hidden rotate-y-180 absolute inset-0 bg-stone-800 rounded-3xl flex flex-col items-center justify-center p-6 shadow-sm">
						<p className="text-4xl font-bold text-white text-center">
							{vocab.japanese}
						</p>
						<div className="flex items-center gap-2 mt-2">
							<button
								onClick={(e) => {
									e.stopPropagation();
									speak();
								}}
								className="text-stone-300 hover:text-white transition-colors text-xl"
							>
								🔊
							</button>
						</div>
						{vocab.exampleJp && (
							<div className="mt-4 text-center">
								<p className="text-stone-200 text-sm">{vocab.exampleJp}</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{flipped && (
				<div className="flex gap-4 w-full max-w-sm">
					<Button
						variant="outline"
						className="flex-1 h-auto py-3.5 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-600 rounded-2xl font-semibold"
						onClick={() => handleAnswer(false)}
					>
						😞 忘記
					</Button>
					<Button
						variant="outline"
						className="flex-1 h-auto py-3.5 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-600 rounded-2xl font-semibold"
						onClick={() => handleAnswer(true)}
					>
						😊 記得
					</Button>
				</div>
			)}
		</div>
	);
}
