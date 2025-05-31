<script lang="ts">
	import ScaleItem from './ScaleItem.svelte';

	// Svelte 5のrunesモードでpropsを定義
	let {
		prefectureName,
		prefecture,
		category = ''
	}: {
		prefectureName: string;
		prefecture: Record<string, string[]>;
		category?: string;
	} = $props();

	let isExpanded = $state(false);

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}
</script>

<div class="mb-2">
	<button
		class="w-full text-left p-2 font-medium bg-blue-50 hover:bg-blue-100 rounded flex items-center justify-between"
		onclick={toggleExpanded}
	>
		<span>{prefectureName}</span>
		<span class="text-sm">
			{isExpanded ? '−' : '+'}
		</span>
	</button>

	<div class="expandable-content" class:expanded={isExpanded}>
		<div class="ml-4 mt-2">
			{#each Object.entries(prefecture) as [scaleName, rivers] (scaleName)}
				<ScaleItem {scaleName} rivers={rivers as string[]} {category} prefecture={prefectureName} />
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
		max-height: 1500px;
		transition: max-height 0.3s ease-in;
	}
</style>
