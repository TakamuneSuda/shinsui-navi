<script lang="ts">
	import { Popup } from 'svelte-maplibre-gl';
	import type { MapGeoJSONFeature, LngLat } from 'maplibre-gl';
	import type { RiverData } from '$lib/types';

	let {
		feature,
		riverData,
		lnglat,
		isClicked = false,
		onClose
	}: {
		feature: MapGeoJSONFeature;
		riverData: RiverData;
		lnglat: LngLat;
		isClicked?: boolean;
		onClose: () => void;
	} = $props();
</script>

<Popup
	{lnglat}
	anchor="bottom"
	offset={[0, -10]}
	closeButton={isClicked}
	closeOnClick={isClicked}
	onclose={onClose}
>
	<div class="p-3 min-w-[200px] bg-white rounded shadow-lg relative">
		<!-- 閉じるボタン -->
		<button
			class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
			onclick={onClose}
			aria-label="閉じる"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				></path>
			</svg>
		</button>

		<h3 class="font-bold text-lg mb-2 text-blue-600 pr-8">{riverData.river}</h3>
		<div class="space-y-1 text-sm">
			<div><span class="font-semibold">カテゴリ:</span> {riverData.category}</div>
			<div><span class="font-semibold">都道府県:</span> {riverData.prefecture}</div>
			<div><span class="font-semibold">規模:</span> {riverData.scale}</div>
		</div>
		{#if feature.properties}
			<div class="mt-3 pt-2 border-t border-gray-200">
				<div class="text-xs text-gray-600 font-semibold mb-1">詳細情報:</div>
				{#each Object.entries(feature.properties) as [key, value] (key)}
					{#if key !== 'cluster' && key !== 'cluster_id' && key !== 'point_count' && key !== 'point_count_abbreviated'}
						<div class="text-xs text-gray-700">
							<span class="font-medium">{key}:</span>
							{value}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</Popup>
