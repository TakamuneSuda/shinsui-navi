import type { Geometry } from 'maplibre-gl';

/**
 * GeoJSONジオメトリから座標を安全に取得する
 */
export function getCoordinatesFromGeometry(
	geometry: Geometry | null | undefined
): [number, number] | null {
	if (!geometry) return null;

	// Point geometry
	if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
		return geometry.coordinates as [number, number];
	}

	// LineString, Polygon などの最初の座標を取得
	if ('coordinates' in geometry && Array.isArray(geometry.coordinates)) {
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
