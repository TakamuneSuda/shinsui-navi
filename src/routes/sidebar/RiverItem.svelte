<script lang="ts">
	import { getRiverContext } from '$lib/context/riverContext';

	// Svelte 5のrunesモードでpropsを定義
	let {
		river,
		category = '',
		prefecture = '',
		scale = ''
	}: {
		river: string;
		category?: string;
		prefecture?: string;
		scale?: string;
	} = $props();

	// Context APIからデータと関数を取得
	const riverContext = getRiverContext();

	// レイヤーIDを生成（一意になるように）
	let layerId = $derived(`${category}-${prefecture}-${scale}-${river}`);

	// 表示状態を監視
	let isVisible = $derived(riverContext.visibleLayers.has(layerId));

	function handleRiverClick() {
		riverContext.selectRiver(category, prefecture, scale, river);
		riverContext.toggleLayerVisibility(layerId);
		console.log(`川を選択: ${river} (${prefecture} - ${scale})`);
	}
</script>

<button
	class="w-full p-2 text-sm border rounded mb-1 text-left transition-colors duration-200"
	class:bg-blue-100={isVisible}
	class:border-blue-400={isVisible}
	class:bg-white={!isVisible}
	class:border-gray-300={!isVisible}
	class:hover:bg-gray-50={!isVisible}
	class:hover:bg-blue-200={isVisible}
	onclick={handleRiverClick}
>
	<div class="flex items-center justify-between">
		<span>{river}</span>
		<span class="text-xs text-gray-500">
			{isVisible ? '表示中' : '非表示'}
		</span>
	</div>
</button>
