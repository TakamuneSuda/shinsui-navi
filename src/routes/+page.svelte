<script lang="ts">
	import Sidebar from './sidebar/Sidebar.svelte';
	import Map from './Map.svelte';
	import { setRiverContext, type RiverContextValue } from '$lib/context/riverContext';
	import type { SelectedRiver } from '$lib/types';

	// Context Providerを作成
	let selectedRiver = $state<SelectedRiver | null>(null);
	let visibleLayers = $state<Set<string>>(new Set());

	// 選択された河川のGeoJSONURLを生成
	let selectedRiverGeoJSONUrl = $derived(
		selectedRiver
			? `https://d35i4h3qfw3o9a.cloudfront.net/${encodeURIComponent(selectedRiver.category)}/${encodeURIComponent(selectedRiver.prefecture)}/${encodeURIComponent(selectedRiver.scale)}/${encodeURIComponent(selectedRiver.river)}.geojson`
			: null
	);

	function selectRiver(category: string, prefecture: string, scale: string, river: string) {
		selectedRiver = { category, prefecture, scale, river };
	}

	function toggleLayerVisibility(layerId: string) {
		const newLayers = new Set(visibleLayers);
		if (newLayers.has(layerId)) {
			newLayers.delete(layerId);
		} else {
			newLayers.add(layerId);
		}
		visibleLayers = newLayers;
	}

	const riverContextValue: RiverContextValue = {
		get selectedRiver() {
			return selectedRiver;
		},
		get visibleLayers() {
			return visibleLayers;
		},
		get selectedRiverGeoJSONUrl() {
			return selectedRiverGeoJSONUrl;
		},
		selectRiver,
		toggleLayerVisibility
	};

	setRiverContext(riverContextValue);
</script>

<div class="h-screen w-screen flex">
	<div class="w-[300px] h-full">
		<Sidebar />
	</div>
	<div class="flex-1 h-full">
		<Map />
	</div>
</div>
