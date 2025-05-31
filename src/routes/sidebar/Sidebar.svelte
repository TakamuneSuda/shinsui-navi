<script lang="ts">
	import { layers } from '$lib/layers';
	import CategoryItem from './CategoryItem.svelte';

	let expandedCategories: Set<string> = new Set();

	function toggleCategory(category: string) {
		if (expandedCategories.has(category)) {
			expandedCategories.delete(category);
		} else {
			expandedCategories.add(category);
		}
		expandedCategories = expandedCategories;
	}
</script>

<div class="flex h-full w-full flex-col overflow-hidden">
	<div class="flex h-16 items-center justify-between border-b px-4">
		<h1 class="text-xl font-bold">レイヤー</h1>
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
