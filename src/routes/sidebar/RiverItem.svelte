<script lang="ts">
	import { selectRiver } from '$lib/stores/riverStore';

	export let river: string;
	export let category: string = '';
	export let prefecture: string = '';
	export let scale: string = '';

	function handleRiverClick() {
		selectRiver(category, prefecture, scale, river);
		console.log(`川を選択: ${river} (${prefecture} - ${scale})`);
	}
</script>

<button
	class="w-full p-2 text-sm bg-white border rounded hover:bg-gray-50 mb-1 text-left transition-colors duration-200"
	on:click={handleRiverClick}
>
	{river}
</button>
