<script lang="ts">
	import {
		MapLibre,
		NavigationControl,
		ScaleControl,
		GlobeControl,
		GeoJSONSource,
		CircleLayer,
		SymbolLayer,
		Popup,
		RasterTileSource,
		RasterLayer
	} from 'svelte-maplibre-gl';
	import type { MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { getRiverContext } from '$lib/context/riverContext';
	import { layers } from '$lib/layers';
	import Modal from './animation/Modal.svelte';
	import { onDestroy } from 'svelte';

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

	// 地図の中心位置
	let mapCenter = $state({ lng: 137, lat: 36 });
	let mapZoom = $state(3.5);

	// ホバー状態の管理
	let popupLnglat = $state.raw(new maplibregl.LngLat(0, 0));
	let popupFeature = $state<MapGeoJSONFeature | null>(null);
	let popupRiverData = $state<RiverData | null>(null);
	let isClicked = $state<boolean>(false); // クリックされたかどうかの状態

	// モーダル状態の管理
	let isModalOpen = $state(false);
	let selectedRiverForModal = $state<RiverData | null>(null);
	let selectedFeatureForModal = $state<MapGeoJSONFeature | null>(null);
	let selectedFeatureId = $state<string | null>(null); // 選択された破堤点のID

	// 浸水アニメーション用の状態
	let isAnimating = $state(false);
	let animationTileUrl = $state<string | null>(null);
	let currentTimeIndex = $state(0); // 現在のアニメーション時刻インデックス
	let animationIntervalId = $state<number | null>(null); // アニメーションタイマーID
	// 固定の時間配列（分単位）
	const FIXED_TIME_ARRAY = [
		10, 20, 30, 40, 50, 60, 70, 80, 90, 120, 180, 240, 300, 360, 420, 540, 720, 900, 1080, 1260,
		1440, 1800, 2160, 2520, 2880, 3600, 4320, 5040, 5760
	];
	let bpTimeArray = $state<number[]>(FIXED_TIME_ARRAY); // 破堤開始からの経過時間配列

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
	function getCoordinatesFromGeometry(geometry: unknown): [number, number] | null {
		if (!geometry || typeof geometry !== 'object') return null;

		const geom = geometry as Record<string, unknown>;

		// Point geometry
		if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
			return geom.coordinates as [number, number];
		}

		// LineString, Polygon などの最初の座標を取得
		if (geom.coordinates && Array.isArray(geom.coordinates)) {
			let coords = geom.coordinates;
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

			// 自動でモーダルを開く
			setTimeout(() => {
				openModal(riverData);
			}, 100);
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

	// モーダルを開く
	function openModal(riverData: RiverData) {
		// 既にモーダルが開いている場合は、アニメーション状態を完全にリセット
		if (isModalOpen) {
			console.log('既存のモーダルが開いているため、アニメーション状態をリセットします');
			resetAnimation();
		}

		// popupFeatureを先に保存してからポップアップを閉じる
		const currentFeature = popupFeature;

		// デバッグ: 実際のGeoJSONプロパティを調査
		if (currentFeature?.properties) {
			console.log('=== GeoJSONプロパティの詳細調査 ===');
			console.log('全プロパティ:', Object.keys(currentFeature.properties));
			console.log('プロパティの詳細:', currentFeature.properties);
			console.log('BPTimeプロパティの存在:', 'BPTime' in currentFeature.properties);
			console.log('BPTimeの値:', currentFeature.properties.BPTime);
			console.log('BPTimeの型:', typeof currentFeature.properties.BPTime);
		}

		// 選択された破堤点のIDを保存
		if (currentFeature?.properties?.ID) {
			selectedFeatureId = currentFeature.properties.ID;
		}

		// ポップアップを閉じる
		closePopup();

		// 十分な遅延でモーダルを開く（イベント競合を防ぐため）
		setTimeout(() => {
			selectedRiverForModal = riverData;
			selectedFeatureForModal = currentFeature;
			isModalOpen = true;

			// アニメーション状態を完全に初期化
			currentTimeIndex = 0;
			isAnimating = false;
			animationTileUrl = null;
			if (animationIntervalId !== null) {
				clearInterval(animationIntervalId);
				animationIntervalId = null;
			}

			// モーダル表示時にbpTimeArrayを固定配列で初期化
			bpTimeArray = getTimeArray();
			console.log('モーダル表示時にbpTimeArray配列をセットしました:', bpTimeArray.length, '個');
			console.log('アニメーション状態を初期化しました: currentTimeIndex=0, isAnimating=false');
		}, 250); // 遅延を250msに増加
	}

	// モーダルを閉じる
	function closeModal() {
		isModalOpen = false;
		selectedRiverForModal = null;
		selectedFeatureForModal = null;
		selectedFeatureId = null; // 選択された破堤点IDをクリア
		// アニメーションを完全にリセット
		resetAnimation();
	}

	// 固定時間配列を返す関数（簡略化）
	function getTimeArray(): number[] {
		return FIXED_TIME_ARRAY;
	}

	// 分を時間・分の形式で表示するヘルパー関数（日数は時間に変換）
	function formatTimeDisplay(minutes: number): string {
		if (minutes < 60) {
			return `${minutes}分`;
		} else if (minutes < 120) {
			// 60分〜119分は時間と分で表示
			const hours = Math.floor(minutes / 60);
			const remainingMinutes = minutes % 60;
			return remainingMinutes > 0 ? `${hours}時間${remainingMinutes}分` : `${hours}時間`;
		} else {
			// 2時間以降は時間のみで表示（日数も時間に変換）
			const hours = Math.floor(minutes / 60);
			return `${hours}時間`;
		}
	}

	// 時系列アニメーションURLを生成する関数
	function generateTimeSeriesUrl(
		officeCode: string,
		rainScale: string,
		extendedRiverCode: string,
		bpName: string,
		timeMinutes: number
	): string {
		// 経過時間を5桁ゼロパディング
		const paddedTime = String(timeMinutes).padStart(5, '0');
		const url = `https://suiboumap.gsi.go.jp/ShinsuiMap/Tile/${officeCode}/${rainScale}/${extendedRiverCode}/${bpName}/${bpName}_${paddedTime}m/{z}/{x}/{y}.png`;
		console.log(`時系列タイルURL生成 (${timeMinutes}分):`, url);
		return url;
	}

	// 降雨規模コードを取得するユーティリティ関数
	function getRainScaleCode(csvScale: string | number | null | undefined): string {
		const scaleStr = String(csvScale);
		switch (scaleStr) {
			case '0':
				return 'L2';
			case '1':
				return 'L1';
			case '-1':
				return 'L1b';
			default:
				return 'L1';
		}
	}

	// 拡張河川コードを取得するユーティリティ関数
	function getExtendedRiverCode(
		riverCode: string,
		subRiverCode: string | null | undefined
	): string {
		if (subRiverCode && subRiverCode !== '_') {
			return riverCode + subRiverCode;
		} else {
			return riverCode;
		}
	}

	// 浸水アニメーションを開始
	function startAnimation(resetPosition: boolean = false) {
		if (!selectedFeatureForModal?.properties) return;

		const props = selectedFeatureForModal.properties;
		const officeCode = props.OfficeCode;
		const csvScale = props.CSVScale;
		const riverCode = props.RiverCode;
		const subRiverCode = props.SubRiverCode;
		const bpName = props.BPName || props.ID;
		const bpTimeString = props.BPTime; // 破堤開始からの経過時間配列

		console.log('アニメーション開始処理:', {
			officeCode,
			csvScale,
			riverCode,
			subRiverCode,
			bpName,
			bpTimeString,
			hasRequiredParams: !!(
				officeCode &&
				csvScale !== null &&
				csvScale !== undefined &&
				riverCode &&
				bpName
			)
		});

		if (!officeCode || csvScale === null || csvScale === undefined || !riverCode || !bpName) {
			console.error('必要なパラメータが不足しています:', {
				officeCode,
				csvScale,
				riverCode,
				bpName
			});
			return;
		}

		// 固定時間配列を取得
		const timeArray = getTimeArray();
		console.log('使用する時間配列:', timeArray);

		// 降雨規模コードを変換（文字列と数値の両方に対応）
		let rainScale: string;
		const scaleStr = String(csvScale);
		switch (scaleStr) {
			case '0':
				rainScale = 'L2';
				break;
			case '1':
				rainScale = 'L1';
				break;
			case '-1':
				rainScale = 'L1b';
				break;
			default:
				console.error('不明な降雨規模コード:', csvScale, '(型:', typeof csvScale, ')');
				// フォールバック: L1を使用
				rainScale = 'L1';
				break;
		}

		// 拡張河川コードを作成（11桁または10桁）
		let extendedRiverCode: string;
		if (subRiverCode && subRiverCode !== '_') {
			extendedRiverCode = riverCode + subRiverCode;
		} else {
			extendedRiverCode = riverCode;
		}

		console.log('時系列アニメーション設定:', {
			rainScale,
			extendedRiverCode,
			timeArray: timeArray.slice(0, 5), // 最初の5要素のみ表示
			totalFrames: timeArray.length
		});

		// アニメーション状態を設定
		bpTimeArray = timeArray;
		// resetPositionがtrueの場合のみ位置をリセット
		if (resetPosition) {
			currentTimeIndex = 0;
		}
		isAnimating = true;

		// 最初のフレームを表示
		try {
			updateAnimationFrame(officeCode, rainScale, extendedRiverCode, bpName);
		} catch (error) {
			console.error('最初のフレーム表示エラー:', error);
			stopAnimation();
			return;
		}

		// 時系列アニメーションを開始（2秒間隔）
		animationIntervalId = Number(
			setInterval(() => {
				currentTimeIndex = (currentTimeIndex + 1) % bpTimeArray.length;
				try {
					updateAnimationFrame(officeCode, rainScale, extendedRiverCode, bpName);
				} catch (error) {
					console.error('アニメーションフレーム更新エラー:', error);
					stopAnimation();
				}
			}, 2000)
		);

		console.log('時系列アニメーション開始:', {
			officeCode,
			rainScale,
			extendedRiverCode,
			bpName,
			timeArray: bpTimeArray,
			totalFrames: bpTimeArray.length
		});
	}

	// アニメーションフレームを更新する関数
	function updateAnimationFrame(
		officeCode: string,
		rainScale: string,
		extendedRiverCode: string,
		bpName: string
	) {
		console.log('=== updateAnimationFrame 実行開始 ===');
		console.log('パラメータ:', { officeCode, rainScale, extendedRiverCode, bpName });
		console.log('bpTimeArray.length:', bpTimeArray.length);
		console.log('currentTimeIndex:', currentTimeIndex);

		if (bpTimeArray.length === 0) {
			console.warn('bpTimeArray が空のため処理を中断');
			return;
		}

		const currentTime = bpTimeArray[currentTimeIndex];
		console.log('現在の時間:', currentTime, '分');

		const newTileUrl = generateTimeSeriesUrl(
			officeCode,
			rainScale,
			extendedRiverCode,
			bpName,
			currentTime
		);
		console.log('生成された新しいURL:', newTileUrl);

		const oldTileUrl = animationTileUrl;
		animationTileUrl = newTileUrl;

		console.log('URL更新:', {
			old: oldTileUrl,
			new: animationTileUrl,
			changed: oldTileUrl !== newTileUrl
		});

		console.log(`アニメーションフレーム更新 (${currentTimeIndex + 1}/${bpTimeArray.length}):`, {
			time: currentTime,
			url: newTileUrl
		});
		console.log('=== updateAnimationFrame 実行完了 ===');
	}

	// アニメーションタイマーのみを停止（タイル表示は維持）
	function pauseAnimation() {
		// タイマーをクリア（タイルとデータは保持）
		if (animationIntervalId !== null) {
			clearInterval(animationIntervalId);
			animationIntervalId = null;
		}
		isAnimating = false;
	}

	// アニメーションを停止し、位置もリセットする
	function stopAnimation() {
		isAnimating = false;
		animationTileUrl = null;
		currentTimeIndex = 0;

		// タイマーをクリア
		if (animationIntervalId !== null) {
			clearInterval(animationIntervalId);
			animationIntervalId = null;
		}
	}

	// モーダルを閉じるときに呼び出す完全リセット関数
	function resetAnimation() {
		stopAnimation();
		bpTimeArray = []; // プレイヤーコントロールを非表示にする
	}

	// コンポーネント破棄時のクリーンアップ
	onDestroy(() => {
		if (animationIntervalId !== null) {
			clearInterval(animationIntervalId);
		}
	});
</script>

<MapLibre
	style="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
	zoom={mapZoom}
	center={mapCenter}
	class="h-full w-full"
>
	<NavigationControl />
	<ScaleControl />
	<GlobeControl />
	<RasterTileSource
		tiles={['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg']}
		minzoom={2}
		maxzoom={18}
		attribution="<a href='https://maps.gsi.go.jp/development/ichiran.html'>国土地理院</a>"
	>
		<RasterLayer />
	</RasterTileSource>

	{#each visibleRivers as riverData (riverData.id)}
		<GeoJSONSource
			id={riverData.id}
			data={riverData.url}
			{cluster}
			clusterMaxZoom={cluster ? clusterMaxZoom : undefined}
			clusterRadius={cluster ? clusterRadius : undefined}
			attribution="<a href='https://suiboumap.gsi.go.jp'>国土交通省『浸水ナビ』</a>"
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
					'circle-color': [
						'case',
						['==', ['get', 'ID'], selectedFeatureId || ''],
						'#ef4444', // 選択された破堤点は赤色
						'#3b82f6' // デフォルトは青色
					],
					'circle-radius': [
						'case',
						['==', ['get', 'ID'], selectedFeatureId || ''],
						8, // 選択された破堤点は少し大きく
						4 // デフォルトサイズ
					],
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

	<!-- 浸水想定タイルレイヤー（アニメーション時または手動操作時に表示） -->
	{#if animationTileUrl}
		<RasterTileSource tiles={[animationTileUrl]} minzoom={2} maxzoom={19}>
			<RasterLayer layout={{ visibility: 'visible' }} paint={{ 'raster-opacity': 0.7 }} />
		</RasterTileSource>
	{/if}
</MapLibre>

<!-- 浸水想定モーダル -->
<Modal isOpen={isModalOpen} onClose={closeModal} title="破堤点詳細情報">
	{#if selectedRiverForModal && selectedFeatureForModal?.properties}
		{@const props = selectedFeatureForModal.properties}
		<div class="space-y-2 overflow-auto">
			<!-- 河川基本情報と破堤点情報を横並びに -->
			<div class="grid grid-cols-2 gap-3">
				<!-- 河川基本情報 -->
				<div class="bg-blue-50 px-3 py-2 rounded-lg">
					<h3 class="font-bold text-sm text-blue-800 mb-2">河川基本情報</h3>
					<div class="text-xs font-medium text-blue-700 mb-1">
						{props.EntryRiverName || selectedRiverForModal.river}
					</div>
					<div class="space-y-1 text-xs text-gray-600">
						<div><span class="font-medium">都道府県:</span> {selectedRiverForModal.prefecture}</div>
						<div><span class="font-medium">規模:</span> {selectedRiverForModal.scale}</div>
						{#if props.RiverCode}
							<div>
								<span class="font-medium">河川コード:</span>
								{props.RiverCode}{props.SubRiverCode !== '_' ? `-${props.SubRiverCode}` : ''}
							</div>
						{/if}
					</div>
				</div>

				<!-- 破堤点情報 -->
				<div class="bg-red-50 px-3 py-2 rounded-lg">
					<h4 class="font-bold text-sm text-red-800 mb-2">破堤点情報</h4>
					<div class="space-y-1 text-xs">
						{#if props.BPName}
							<div>
								<span class="font-medium text-gray-700">名称:</span>
								<span class="text-gray-900">{props.BPName}</span>
							</div>
						{/if}
						{#if props.ID}
							<div>
								<span class="font-medium text-gray-700">ID:</span>
								<span class="text-gray-900">{props.ID}</span>
							</div>
						{/if}
						{#if props.BPLocation}
							<div>
								<span class="font-medium text-gray-700">位置:</span>
								<span class="text-gray-900">{props.BPLocation}</span>
							</div>
						{/if}
						{#if props.BPLat && props.BPLon}
							<div class="grid grid-cols-2 gap-1">
								<div>
									<span class="font-medium text-gray-700">緯度:</span>
									<span class="text-gray-900 text-xs">{props.BPLat}</span>
								</div>
								<div>
									<span class="font-medium text-gray-700">経度:</span>
									<span class="text-gray-900 text-xs">{props.BPLon}</span>
								</div>
							</div>
						{/if}
						{#if props.WSID}
							<div>
								<span class="font-medium text-gray-700">水位観測所ID:</span>
								<span class="text-gray-900">{props.WSID}</span>
							</div>
						{/if}
					</div>
				</div>
			</div>

			{#if props.isDepthMax === 'true' || props.isStartMax === 'true' || props.isDurationMax === 'true'}
				<div class="bg-yellow-50 px-3 py-2 rounded-lg">
					<h4 class="font-semibold text-sm text-yellow-800 mb-2">破堤点特性</h4>
					<div class="space-y-1 text-xs">
						{#if props.isDepthMax === 'true'}
							<div class="flex items-center gap-2">
								<span class="w-2 h-2 bg-red-500 rounded-full"></span>
								<span class="text-gray-900">最大浸水をもたらす破堤点</span>
							</div>
						{/if}
						{#if props.isStartMax === 'true'}
							<div class="flex items-center gap-2">
								<span class="w-2 h-2 bg-orange-500 rounded-full"></span>
								<span class="text-gray-900">最速浸水開始をもたらす破堤点</span>
							</div>
						{/if}
						{#if props.isDurationMax === 'true'}
							<div class="flex items-center gap-2">
								<span class="w-2 h-2 bg-blue-500 rounded-full"></span>
								<span class="text-gray-900">最長浸水時間をもたらす破堤点</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- 統合型プレイヤーコントロール -->
			<div class="space-y-2 pt-2">
				{#if bpTimeArray.length > 0}
					<div class="rounded-lg bg-gray-50 px-4 py-2 shadow-sm border border-gray-100">
						<!-- 現在の時間表示 - 大きめに表示 -->
						<div class="text-center mb-1">
							<div class="text-lg font-bold text-blue-700">
								{formatTimeDisplay(bpTimeArray[currentTimeIndex])}
							</div>
							<div class="text-xs text-gray-500">破堤開始からの経過時間</div>
						</div>

						<!-- コントロールボタン -->
						<div class="flex justify-center items-center gap-6">
							<!-- 前へボタン -->
							<button
								class="h-8 w-8 flex items-center justify-center text-gray-700 hover:text-blue-700 bg-white hover:bg-blue-50 rounded-full border border-gray-200 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="前のフレーム"
								onclick={() => {
									if (bpTimeArray.length > 0 && currentTimeIndex > 0) {
										currentTimeIndex = currentTimeIndex - 1;
										if (selectedFeatureForModal?.properties) {
											const props = selectedFeatureForModal.properties;
											updateAnimationFrame(
												props.OfficeCode,
												getRainScaleCode(props.CSVScale),
												getExtendedRiverCode(props.RiverCode, props.SubRiverCode),
												props.BPName || props.ID
											);
										}
									}
								}}
								disabled={currentTimeIndex <= 0}
								title="前のフレーム"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 19l-7-7 7-7"
									></path>
								</svg>
							</button>

							<!-- 再生/一時停止ボタン -->
							<button
								class="h-10 w-10 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-md transition-colors"
								onclick={() => {
									if (isAnimating) {
										pauseAnimation();
									} else {
										startAnimation();
									}
								}}
								title={isAnimating ? '一時停止' : '再生'}
							>
								{#if isAnimating}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2.5"
											d="M10 9v6m4-6v6"
										></path>
									</svg>
								{:else}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2.5"
											d="M9 5l7 7-7 7"
										></path>
									</svg>
								{/if}
							</button>

							<!-- 次へボタン -->
							<button
								class="h-8 w-8 flex items-center justify-center text-gray-700 hover:text-blue-700 bg-white hover:bg-blue-50 rounded-full border border-gray-200 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="次のフレーム"
								onclick={() => {
									if (bpTimeArray.length > 0 && currentTimeIndex < bpTimeArray.length - 1) {
										currentTimeIndex = currentTimeIndex + 1;
										if (selectedFeatureForModal?.properties) {
											const props = selectedFeatureForModal.properties;
											updateAnimationFrame(
												props.OfficeCode,
												getRainScaleCode(props.CSVScale),
												getExtendedRiverCode(props.RiverCode, props.SubRiverCode),
												props.BPName || props.ID
											);
										}
									}
								}}
								disabled={currentTimeIndex >= bpTimeArray.length - 1}
								title="次のフレーム"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									></path>
								</svg>
							</button>
						</div>

						<!-- 進行状況と時間スライダー -->
						<div class="space-y-1">
							<!-- スライダー -->
							<div class="relative">
								<input
									type="range"
									min="0"
									max={bpTimeArray.length - 1}
									bind:value={currentTimeIndex}
									oninput={(e) => {
										console.log('=== スライダー操作開始 ===');

										// スライダー操作時は自動アニメーションタイマーのみ停止（isAnimatingは維持）
										if (animationIntervalId !== null) {
											console.log('自動アニメーションタイマーを停止します');
											clearInterval(animationIntervalId);
											animationIntervalId = null;
											isAnimating = false;
										}

										const newIndex = parseInt((e.target as HTMLInputElement)?.value || '0');
										console.log(
											'新しいインデックス:',
											newIndex,
											'時間:',
											bpTimeArray[newIndex],
											'分'
										);
										currentTimeIndex = newIndex;

										if (selectedFeatureForModal?.properties) {
											const props = selectedFeatureForModal.properties;
											updateAnimationFrame(
												props.OfficeCode,
												getRainScaleCode(props.CSVScale),
												getExtendedRiverCode(props.RiverCode, props.SubRiverCode),
												props.BPName || props.ID
											);
										} else {
											console.error('selectedFeatureForModal.properties が見つかりません');
										}

										console.log('=== スライダー操作完了 ===');
									}}
									class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
									style="background: linear-gradient(to right, #3b82f6 0%, #3b82f6 {(currentTimeIndex /
										(bpTimeArray.length - 1)) *
										100}%, #e5e7eb {(currentTimeIndex / (bpTimeArray.length - 1)) *
										100}%, #e5e7eb 100%);"
									title="{formatTimeDisplay(bpTimeArray[currentTimeIndex])} ({formatTimeDisplay(
										bpTimeArray[currentTimeIndex]
									)}後)"
								/>
							</div>

							<!-- 時間範囲表示 -->
							<div class="flex justify-between items-center text-xs text-gray-500">
								<span>{formatTimeDisplay(bpTimeArray[0])}</span>
								<span>{formatTimeDisplay(bpTimeArray[bpTimeArray.length - 1])}</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="text-center text-gray-500 py-4">データを読み込んでいます...</div>
	{/if}
</Modal>
