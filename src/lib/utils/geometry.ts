/**
 * GeoJSONジオメトリから座標を安全に取得する
 */
export function getCoordinatesFromGeometry(
	geometry: unknown | null | undefined
): [number, number] | null {
	if (!geometry || typeof geometry !== 'object') return null;

	const geom = geometry as Record<string, unknown>;

	// Point geometry
	if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
		return geom.coordinates as [number, number];
	}

	// LineString, Polygon などの最初の座標を取得
	if ('coordinates' in geom && Array.isArray(geom.coordinates)) {
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
