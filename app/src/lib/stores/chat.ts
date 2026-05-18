import { writable } from 'svelte/store';

export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	cost?: number;       // USDC cost of this inference (raw, 6 dec)
	txHash?: string;     // onchain deduction tx
	modelId?: string;
	timestamp: number;
}

export const messages  = writable<Message[]>([]);
export const thinking  = writable(false);
export const totalCost = writable(0n); // running USDC total this session (raw)

export function addMessage(msg: Omit<Message, 'id' | 'timestamp'>) {
	const full: Message = { ...msg, id: crypto.randomUUID(), timestamp: Date.now() };
	messages.update((prev) => [...prev, full]);
	return full;
}

export function clearChat() {
	messages.set([]);
	totalCost.set(0n);
}
