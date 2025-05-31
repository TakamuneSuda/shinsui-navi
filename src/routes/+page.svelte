<script lang="ts">
	import Sidebar from './sidebar/Sidebar.svelte';
	import Map from './Map.svelte';
</script>

<div class="h-screen w-screen flex">
	<div class="w-[300px] h-full">
		<Sidebar />
	</div>
	<div class="flex-1 h-full">
		<Map />
	</div>
</div>
