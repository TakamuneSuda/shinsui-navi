import { writable, derived } from 'svelte/store';

export interface SelectedRiver {
	category: string;
	prefecture: string;
	scale: string;
	river: string;
}

export const selectedRiver = writable<SelectedRiver | null>(null);

// 選択された河川のGeoJSONURLを生成
export const selectedRiverGeoJSONUrl = derived(selectedRiver, ($selectedRiver) => {
	if (!$selectedRiver) return null;

	const { category, prefecture, scale, river } = $selectedRiver;
	return `https://d35i4h3qfw3o9a.cloudfront.net/${encodeURIComponent(category)}/${encodeURIComponent(prefecture)}/${encodeURIComponent(scale)}/${encodeURIComponent(river)}.geojson`;
});

// 表示されているレイヤーのリスト
export const visibleLayers = writable<Set<string>>(new Set());

export function selectRiver(category: string, prefecture: string, scale: string, river: string) {
	selectedRiver.set({ category, prefecture, scale, river });
}

export function toggleLayerVisibility(layerId: string) {
	visibleLayers.update((layers) => {
		const newLayers = new Set(layers);
		if (newLayers.has(layerId)) {
			newLayers.delete(layerId);
		} else {
			newLayers.add(layerId);
		}
		return newLayers;
	});
}
