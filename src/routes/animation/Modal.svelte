<script lang="ts">
	import { fly } from 'svelte/transition';

	type Props = {
		isOpen: boolean;
		onClose: () => void;
		title?: string;
		children?: import('svelte').Snippet;
	};

	let { isOpen, onClose, title, children }: Props = $props();
</script>

{#if isOpen}
	<!-- モーダルコンテンツ -->
	<div
		class="fixed bottom-2 left-1/2 transform -translate-x-1/2 w-180 max-w-[90vw] bg-white rounded-lg shadow-xl z-50 max-h-[75vh] overflow-y-auto border border-gray-200"
		transition:fly={{ y: 100, duration: 500, delay: 100 }}
	>
		<!-- ヘッダー -->
		<div class="flex items-center justify-between p-3 border-b border-gray-200">
			{#if title}
				<h2 class="text-base font-semibold text-gray-900">{title}</h2>
			{:else}
				<div></div>
			{/if}
			<button
				class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
				onclick={onClose}
				aria-label="閉じる"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					></path>
				</svg>
			</button>
		</div>

		<!-- コンテンツ -->
		<div class="p-3">
			{@render children?.()}
		</div>
	</div>
{/if}
