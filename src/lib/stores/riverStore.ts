import { writable } from 'svelte/store';

export interface SelectedRiver {
	category: string;
	prefecture: string;
	scale: string;
	river: string;
}

export const selectedRiver = writable<SelectedRiver | null>(null);

export function selectRiver(category: string, prefecture: string, scale: string, river: string) {
	selectedRiver.set({ category, prefecture, scale, river });
}
