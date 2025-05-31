<script lang="ts">
	import RiverItem from './RiverItem.svelte';

	export let scaleName: string;
	export let rivers: string[];
	export let category: string = '';
	export let prefecture: string = '';

	let isExpanded = false;

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}
</script>

<div class="mb-2">
	<button
		class="w-full text-left p-2 font-normal bg-green-50 hover:bg-green-100 rounded flex items-center justify-between"
		on:click={toggleExpanded}
	>
		<span>{scaleName}</span>
		<span class="text-sm">
			{isExpanded ? '−' : '+'}
		</span>
	</button>

	<div class="expandable-content" class:expanded={isExpanded}>
		<div class="ml-4 mt-2">
			{#each rivers as river (river)}
				<RiverItem {river} {category} {prefecture} scale={scaleName} />
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
		max-height: 1000px;
		transition: max-height 0.3s ease-in;
	}
</style>
