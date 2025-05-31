<script lang="ts">
	import { layers } from '$lib/layers';
	import { getRiverContext } from '$lib/context/riverContext';
	import CategoryItem from './CategoryItem.svelte';

	// Context APIからデータを取得
	const riverContext = getRiverContext();

	let expandedCategories = $state<Set<string>>(new Set());

	function toggleCategory(category: string) {
		if (expandedCategories.has(category)) {
			expandedCategories.delete(category);
		} else {
			expandedCategories.add(category);
		}
		expandedCategories = new Set(expandedCategories);
	}

	// 表示中のレイヤー数を計算
	let visibleLayerCount = $derived(riverContext.visibleLayers.size);
</script>

<div class="flex h-full w-full flex-col overflow-hidden">
	<div class="flex h-16 items-center justify-between border-b px-4">
		<h1 class="text-xl font-bold">レイヤー</h1>
		{#if visibleLayerCount > 0}
			<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
				{visibleLayerCount}件表示中
			</span>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto p-4">
		{#each Object.entries(layers) as [categoryName, category] (categoryName)}
			<CategoryItem
				{categoryName}
				{category}
				isExpanded={expandedCategories.has(categoryName)}
				onToggle={() => toggleCategory(categoryName)}
			/>
		{/each}
	</div>
</div>
