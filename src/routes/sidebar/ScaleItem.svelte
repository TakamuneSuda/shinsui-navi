<script lang="ts">
	import RiverItem from './RiverItem.svelte';
	import { getRiverContext } from '$lib/context/riverContext';

	// Svelte 5のrunesモードでpropsを定義
	let {
		scaleName,
		rivers,
		category = '',
		prefecture = ''
	}: {
		scaleName: string;
		rivers: string[];
		category?: string;
		prefecture?: string;
	} = $props();

	// Context APIからデータと関数を取得
	const riverContext = getRiverContext();

	let isExpanded = $state(false);

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	// 該当スケールの一括表示
	function showAllInScale() {
		rivers.forEach((river) => {
			const layerId = `${category}-${prefecture}-${scaleName}-${river}`;
			if (!riverContext.visibleLayers.has(layerId)) {
				riverContext.toggleLayerVisibility(layerId);
			}
		});
	}

	// 該当スケールの一括非表示
	function hideAllInScale() {
		rivers.forEach((river) => {
			const layerId = `${category}-${prefecture}-${scaleName}-${river}`;
			if (riverContext.visibleLayers.has(layerId)) {
				riverContext.toggleLayerVisibility(layerId);
			}
		});
	}

	// 表示されている河川数を計算
	let visibleRiversCount = $derived(
		rivers.filter((river) => {
			const layerId = `${category}-${prefecture}-${scaleName}-${river}`;
			return riverContext.visibleLayers.has(layerId);
		}).length
	);
</script>

<div class="mb-2">
	<button
		class="w-full text-left p-2 font-normal bg-green-50 hover:bg-green-100 rounded flex items-center justify-between"
		onclick={toggleExpanded}
	>
		<span>{scaleName}</span>
		<div class="flex items-center gap-2">
			{#if visibleRiversCount > 0}
				<span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
					{visibleRiversCount}/{rivers.length}
				</span>
			{/if}
			<span class="text-sm">
				{isExpanded ? '−' : '+'}
			</span>
		</div>
	</button>

	<!-- 一括操作ボタン（計画規模と想定最大規模のみ） -->
	{#if scaleName === '計画規模' || scaleName === '想定最大規模'}
		<div class="mt-1 flex gap-1">
			<button
				class="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded transition-colors"
				onclick={showAllInScale}
			>
				すべて表示
			</button>
			<button
				class="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded transition-colors"
				onclick={hideAllInScale}
			>
				すべて非表示
			</button>
		</div>
	{/if}

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
