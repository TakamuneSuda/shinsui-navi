<script lang="ts">
	import { MapLibre, NavigationControl, ScaleControl, GlobeControl, GeoJSONSource, CircleLayer, SymbolLayer } from 'svelte-maplibre-gl';

	  let cluster = $state(true);
		let clusterMaxZoom = $state(10);
		let clusterRadius = $state(50);
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

	<GeoJSONSource
		id="japan-rivers"
		data="https://d35i4h3qfw3o9a.cloudfront.net/県単位/岩手/計画規模/安家川.geojson"
		{cluster}
		clusterMaxZoom={cluster ? clusterMaxZoom : undefined}
		clusterRadius={cluster ? clusterRadius : undefined}
	>
    <CircleLayer
      filter={['has', 'point_count']}
      paint={{
        'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 50, '#f1f075', 150, '#f28cb1'],
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
        'circle-color': '#ffff00',
        'circle-radius': 10
      }}
    />
	</GeoJSONSource>
	
</MapLibre>
