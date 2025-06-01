<script lang="ts">
	import {
		MapLibre,
		NavigationControl,
		ScaleControl,
		GlobeControl,
		GeoJSONSource,
		CircleLayer,
		SymbolLayer,
		Popup
	} from 'svelte-maplibre-gl';
	import type { MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { getRiverContext } from '$lib/context/riverContext';
	import { layers } from '$lib/layers';

	// River data type
	type RiverData = {
		id: string;
		category: string;
		prefecture: string;
		scale: string;
		river: string;
		url: string;
	};

	// Context APIからデータを取得
	const riverContext = getRiverContext();

	let cluster = $state(true);
	let clusterMaxZoom = $state(10);
	let clusterRadius = $state(50);

	// ホバー状態の管理
	let popupLnglat = $state.raw(new maplibregl.LngLat(0, 0));
	let popupFeature = $state<MapGeoJSONFeature | null>(null);
	let popupRiverData = $state<RiverData | null>(null);
	let isClicked = $state<boolean>(false); // クリックされたかどうかの状態

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

	// GeoJSONの座標を安全に取得するヘルパー関数
	function getCoordinatesFromGeometry(geometry: any): [number, number] | null {
		if (!geometry) return null;

		// Point geometry
		if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
			return geometry.coordinates as [number, number];
		}

		// LineString, Polygon などの最初の座標を取得
		if (geometry.coordinates && Array.isArray(geometry.coordinates)) {
			let coords = geometry.coordinates;
			// ネストした配列を展開して最初の座標ペアを取得
			while (Array.isArray(coords[0])) {
				coords = coords[0];
			}
			if (Array.isArray(coords) && coords.length >= 2) {
				return [coords[0], coords[1]];
			}
		}

		return null;
	}

	// ホバーイベントハンドラー
	function handleMouseMove(event: MapLayerMouseEvent, riverData: RiverData) {
		const feature = event.features?.[0];
		if (feature) {
			popupFeature = feature;
			popupRiverData = riverData;

			// GeoJSONの座標を取得
			const coords = getCoordinatesFromGeometry(feature.geometry);
			if (coords) {
				const [lng, lat] = coords;
				popupLnglat = new maplibregl.LngLat(lng, lat);
			} else {
				// フォールバック: イベントの座標を使用
				popupLnglat = event.lngLat;
			}
		}
	}

	// クリックイベントハンドラー
	function handleClick(event: MapLayerMouseEvent, riverData: RiverData) {
		const feature = event.features?.[0];
		if (feature) {
			popupFeature = feature;
			popupRiverData = riverData;

			// GeoJSONの座標を取得
			const coords = getCoordinatesFromGeometry(feature.geometry);
			if (coords) {
				const [lng, lat] = coords;
				popupLnglat = new maplibregl.LngLat(lng, lat);
			} else {
				// フォールバック: イベントの座標を使用
				popupLnglat = event.lngLat;
			}

			isClicked = true;
		}
	}

	function handleMouseLeave() {
		// クリックされた場合はホバー離脱で消さない
		if (!isClicked) {
			popupFeature = null;
			popupRiverData = null;
			popupLnglat = new maplibregl.LngLat(0, 0);
		}
	}

	// ポップアップを閉じる
	function closePopup() {
		popupFeature = null;
		popupRiverData = null;
		popupLnglat = new maplibregl.LngLat(0, 0);
		isClicked = false;
	}
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
			<!-- クラスターレイヤー -->
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

			<!-- クラスターラベル -->
			<SymbolLayer
				filter={['has', 'point_count']}
				layout={{
					'text-field': '{point_count_abbreviated}',
					'text-size': 12
				}}
			/>

			<!-- 個別マーカー -->
			<CircleLayer
				filter={['!', ['has', 'point_count']]}
				paint={{
					'circle-color': '#3b82f6',
					'circle-radius': 6,
					'circle-opacity': 0.8,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}}
				onmousemove={(event) => handleMouseMove(event, riverData)}
				onmouseleave={handleMouseLeave}
				onclick={(event) => handleClick(event, riverData)}
			/>
		</GeoJSONSource>
	{/each}

	<!-- ホバーポップアップ -->
	{#if popupFeature && popupLnglat && popupRiverData}
		<Popup
			lnglat={popupLnglat}
			anchor="bottom"
			offset={[0, -10]}
			closeButton={isClicked}
			closeOnClick={isClicked}
			onclose={closePopup}
		>
			<div class="p-3 min-w-[200px] bg-white rounded relative">
				<!-- 閉じるボタン -->
				<button
					class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
					onclick={closePopup}
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

				<h3 class="font-bold text-lg mb-2 text-blue-600 pr-8">{popupRiverData.river}</h3>
				<div class="space-y-1 text-sm">
					<div><span class="font-semibold">カテゴリ:</span> {popupRiverData.category}</div>
					<div><span class="font-semibold">都道府県:</span> {popupRiverData.prefecture}</div>
					<div><span class="font-semibold">規模:</span> {popupRiverData.scale}</div>
				</div>
				{#if popupFeature.properties}
					<div class="mt-3 pt-2 border-t border-gray-200">
						<div class="text-xs text-gray-600 font-semibold mb-1">詳細情報:</div>
						{#each Object.entries(popupFeature.properties) as [key, value] (key)}
							{#if key !== 'cluster' && key !== 'cluster_id' && key !== 'point_count' && key !== 'point_count_abbreviated'}
								<div class="text-xs text-gray-700">
									<span class="font-medium">{key}:</span>
									{value}
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</Popup>
	{/if}
</MapLibre>
