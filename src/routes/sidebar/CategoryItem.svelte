<script lang="ts">
	import PrefectureItem from './PrefectureItem.svelte';

	export let categoryName: string;
	export let category: Record<string, Record<string, string[]>>;
	export let isExpanded: boolean;
	export let onToggle: () => void;
</script>

<div class="mb-2">
	<button
		class="w-full text-left p-2 font-semibold bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-between"
		on:click={onToggle}
	>
		<span>{categoryName}</span>
		<span class="text-sm">
			{isExpanded ? '−' : '+'}
		</span>
	</button>

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
		max-height: 2000px;
		transition: max-height 0.3s ease-in;
	}
</style>
