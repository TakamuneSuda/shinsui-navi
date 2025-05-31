import { getContext, setContext } from 'svelte';

export interface SelectedRiver {
	category: string;
	prefecture: string;
	scale: string;
	river: string;
}

export interface RiverContextValue {
	selectedRiver: SelectedRiver | null;
	visibleLayers: Set<string>;
	selectRiver: (category: string, prefecture: string, scale: string, river: string) => void;
	toggleLayerVisibility: (layerId: string) => void;
	selectedRiverGeoJSONUrl: string | null;
}

const RIVER_CONTEXT_KEY = Symbol('river-context');

export function setRiverContext(context: RiverContextValue): void {
	setContext(RIVER_CONTEXT_KEY, context);
}

export function getRiverContext(): RiverContextValue {
	const context = getContext<RiverContextValue>(RIVER_CONTEXT_KEY);
	if (!context) {
		throw new Error(
			'getRiverContext must be called within a component that has a river context provider'
		);
	}
	return context;
}
