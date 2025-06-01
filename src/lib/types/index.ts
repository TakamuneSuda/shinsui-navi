export type Layer = {
	[key: string]: {
		[key: string]: {
			[key: string]: string[];
		};
	};
};

export interface SelectedRiver {
	category: string;
	prefecture: string;
	scale: string;
	river: string;
}

export interface RiverData {
	id: string;
	category: string;
	prefecture: string;
	scale: string;
	river: string;
	url: string;
}

export interface MapPopupState {
	feature: import('maplibre-gl').MapGeoJSONFeature | null;
	riverData: RiverData | null;
	lnglat: import('maplibre-gl').LngLat | null;
	isClicked: boolean;
}
