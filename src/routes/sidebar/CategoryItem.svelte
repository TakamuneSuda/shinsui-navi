<script lang="ts">
	import PrefectureItem from './PrefectureItem.svelte';
	import { getRiverContext } from '$lib/context/riverContext';

	// Svelte 5のrunesモードでpropsを定義
	let {
		categoryName,
		category,
		isExpanded,
		onToggle
	}: {
		categoryName: string;
		category: Record<string, Record<string, string[]>>;
		isExpanded: boolean;
		onToggle: () => void;
	} = $props();

	// Context APIからデータと関数を取得
	const riverContext = getRiverContext();

	// カテゴリ内のレイヤー数を計算
	let categoryLayerCount = $derived(() => {
		let count = 0;
		Object.values(category).forEach((prefecture) => {
			Object.values(prefecture).forEach((rivers) => {
				rivers.forEach((river) => {
					const layerId = `${categoryName}-${Object.keys(category).find((p) => category[p] === prefecture)}-${Object.keys(prefecture).find((s) => prefecture[s] === rivers)}-${river}`;
					if (riverContext.visibleLayers.has(layerId)) {
						count++;
					}
				});
			});
		});
		return count;
	});

	// カテゴリ内の全レイヤー数を計算
	let totalLayersInCategory = $derived(() => {
		let count = 0;
		Object.values(category).forEach((prefecture) => {
			Object.values(prefecture).forEach((rivers) => {
				count += rivers.length;
			});
		});
		return count;
	});
</script>

<div class="mb-2">
	<div class="flex items-center gap-2 mb-1">
		<button
			class="flex-1 text-left p-2 font-semibold bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-between"
			onclick={onToggle}
		>
			<span>{categoryName}</span>
			<div class="flex items-center gap-2">
				{#if categoryLayerCount() > 0}
					<span class="bg-green-100 text-green-800 text-xs font-medium px-1.5 py-0.5 rounded">
						{categoryLayerCount()}/{totalLayersInCategory()}
					</span>
				{/if}
				<span class="text-sm">
					{isExpanded ? '−' : '+'}
				</span>
			</div>
		</button>
	</div>

	<div class="expandable-content" class:expanded={isExpanded}>
		<div class="ml-4 mt-2">
			{#each Object.entries(category) as [prefectureName, prefecture] (prefectureName)}
				<PrefectureItem {prefectureName} {prefecture} category={categoryName} />
			{/each}
		</div>
	</div>
</div>

<style>
	.expandable-content {
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.3s ease-out;
	}

	.expandable-content.expanded {
		max-height: 10000px;
		transition: max-height 0.3s ease-in;
	}
</style>
