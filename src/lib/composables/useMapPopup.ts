import { getCoordinatesFromGeometry } from '$lib/utils/geometry';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import type { RiverData, MapPopupState } from '$lib/types';
import maplibregl from 'maplibre-gl';

/**
 * マップポップアップの状態管理カスタムフック
 */
export function createMapPopupManager() {
	const popupState = $state<MapPopupState>({
		feature: null,
		riverData: null,
		lnglat: null,
		isClicked: false
	});

	/**
	 * ポップアップを表示する共通ロジック
	 */
	function showPopup(event: MapLayerMouseEvent, riverData: RiverData, isClick = false) {
		const feature = event.features?.[0];
		if (!feature) return;

		popupState.feature = feature;
		popupState.riverData = riverData;
		popupState.isClicked = isClick;

		// 座標取得の共通ロジック
		const coords = getCoordinatesFromGeometry(feature.geometry);
		if (coords) {
			const [lng, lat] = coords;
			popupState.lnglat = new maplibregl.LngLat(lng, lat);
		} else {
			popupState.lnglat = event.lngLat;
		}
	}

	/**
	 * ホバーイベントハンドラー
	 */
	function handleMouseMove(event: MapLayerMouseEvent, riverData: RiverData) {
		showPopup(event, riverData, false);
	}

	/**
	 * クリックイベントハンドラー
	 */
	function handleClick(event: MapLayerMouseEvent, riverData: RiverData) {
		showPopup(event, riverData, true);
	}

	/**
	 * マウスリーブハンドラー
	 */
	function handleMouseLeave() {
		// クリックされた場合はホバー離脱で消さない
		if (!popupState.isClicked) {
			closePopup();
		}
	}

	/**
	 * ポップアップを閉じる
	 */
	function closePopup() {
		popupState.feature = null;
		popupState.riverData = null;
		popupState.lnglat = null;
		popupState.isClicked = false;
	}

	/**
	 * ポップアップが表示されているかどうか
	 */
	const isPopupVisible = $derived(
		popupState.feature !== null && popupState.lnglat !== null && popupState.riverData !== null
	);

	return {
		get popupState() {
			return popupState;
		},
		get isPopupVisible() {
			return isPopupVisible;
		},
		handleMouseMove,
		handleClick,
		handleMouseLeave,
		closePopup
	};
}
