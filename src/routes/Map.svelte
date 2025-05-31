<script lang="ts">
	import {
		MapLibre,
		NavigationControl,
		ScaleControl,
		GlobeControl,
		GeoJSONSource,
		CircleLayer,
		SymbolLayer
	} from 'svelte-maplibre-gl';
	import { getRiverContext } from '$lib/context/riverContext';
	import { layers } from '$lib/layers';

	// Context APIからデータを取得
	const riverContext = getRiverContext();

	let cluster = $state(true);
	let clusterMaxZoom = $state(10);
	let clusterRadius = $state(50);

	// 表示可能な全ての河川のリストを生成
	let allRivers = $derived(
		Object.entries(layers).flatMap(([categoryName, category]) =>
			Object.entries(category).flatMap(([prefectureName, prefecture]) =>
				Object.entries(prefecture).flatMap(([scaleName, rivers]) =>
					rivers.map((river) => ({
						id: `${categoryName}-${prefectureName}-${scaleName}-${river}`,
						category: categoryName,
						prefecture: prefectureName,
						scale: scaleName,
						river: river,
						url: `https://d35i4h3qfw3o9a.cloudfront.net/${encodeURIComponent(categoryName)}/${encodeURIComponent(prefectureName)}/${encodeURIComponent(scaleName)}/${encodeURIComponent(river)}.geojson`
					}))
				)
			)
		)
	);

	// 表示する河川をフィルタリング
	let visibleRivers = $derived(
		allRivers.filter((river) => riverContext.visibleLayers.has(river.id))
	);
</script>

<MapLibre
	style="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
	zoom={3.5}
	center={{ lng: 137, lat: 36 }}
	class="h-full w-full"
>
	<NavigationControl />
	<ScaleControl />
	<GlobeControl />

	{#each visibleRivers as riverData (riverData.id)}
		<GeoJSONSource
			id={riverData.id}
			data={riverData.url}
			{cluster}
			clusterMaxZoom={cluster ? clusterMaxZoom : undefined}
			clusterRadius={cluster ? clusterRadius : undefined}
		>
			<CircleLayer
				filter={['has', 'point_count']}
				paint={{
					'circle-color': [
						'step',
						['get', 'point_count'],
						'#51bbd6',
						50,
						'#f1f075',
						150,
						'#f28cb1'
					],
					'circle-radius': ['+', 10, ['sqrt', ['get', 'point_count']]],
					'circle-opacity': 0.8
				}}
			/>
			<SymbolLayer
				filter={['has', 'point_count']}
				layout={{
					'text-field': '{point_count_abbreviated}',
					'text-size': 12
				}}
			/>
			<CircleLayer
				filter={['!', ['has', 'point_count']]}
				paint={{
					'circle-color': '#3b82f6',
					'circle-radius': 6,
					'circle-opacity': 0.8,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}}
			/>
		</GeoJSONSource>
	{/each}
</MapLibre>
