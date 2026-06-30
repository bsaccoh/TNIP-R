import { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

export interface LatLng {
  latitude: number;
  longitude: number;
  color?: string;
}

interface Props {
  coordinates: LatLng[];
  /** Controls whether the map follows the last coordinate in real time */
  live?: boolean;
  style?: object;
}

function buildHtml(coords: LatLng[], live: boolean): string {
  const points = coords.map((c) => `[${c.latitude},${c.longitude}]`).join(',');
  const colors = coords.map((c) => JSON.stringify(c.color || '#1565C0')).join(',');

  const center = coords.length > 0
    ? coords[Math.floor(coords.length / 2)]
    : { latitude: 8.4657, longitude: -13.2317 }; // Freetown default

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { height: 100%; width: 100%; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: false }).setView(
    [${center.latitude}, ${center.longitude}], 14
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  var pts   = [${points}];
  var clrs  = [${colors}];
  var live  = ${live ? 'true' : 'false'};

  // Draw colored polyline segments
  function drawRoute(pts, clrs) {
    for (var i = 1; i < pts.length; i++) {
      L.polyline([pts[i-1], pts[i]], {
        color: clrs[i] || clrs[i-1] || '#1565C0',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round'
      }).addTo(map);
    }
  }

  if (pts.length > 1) drawRoute(pts, clrs);

  // Start marker
  if (pts.length > 0) {
    var startIcon = L.divIcon({
      html: '<div style="background:#2E7D32;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7], className: ''
    });
    L.marker(pts[0], { icon: startIcon }).addTo(map).bindPopup('Start');
  }

  // End / current position marker
  var endMarkerDiv = '<div style="background:#C62828;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>';
  var endIcon = L.divIcon({ html: endMarkerDiv, iconSize: [14,14], iconAnchor:[7,7], className:'' });
  var endMarker = pts.length > 0 ? L.marker(pts[pts.length-1], { icon: endIcon }).addTo(map) : null;

  if (pts.length > 1) {
    var bounds = L.latLngBounds(pts);
    map.fitBounds(bounds, { padding: [32, 32] });
  }

  // Live update handler — called from React Native via injectJavaScript
  window.addPoint = function(lat, lng, color) {
    var pt = [lat, lng];
    if (pts.length > 0) {
      L.polyline([pts[pts.length-1], pt], {
        color: color || '#1565C0', weight: 5, opacity: 0.85, lineJoin: 'round'
      }).addTo(map);
    }
    pts.push(pt);
    clrs.push(color || '#1565C0');
    if (endMarker) {
      endMarker.setLatLng(pt);
    } else {
      endMarker = L.marker(pt, { icon: endIcon }).addTo(map);
    }
    if (live) map.setView(pt, map.getZoom());
  };
</script>
</body>
</html>`;
}

export default function LeafletMap({ coordinates, live = false, style }: Props) {
  const ref = useRef<WebView>(null);
  const prevLen = useRef(0);

  // For live mode: push new points instead of rebuilding the whole page
  useEffect(() => {
    if (!live || !ref.current) return;
    const newPts = coordinates.slice(prevLen.current);
    newPts.forEach((c) => {
      ref.current!.injectJavaScript(
        `window.addPoint(${c.latitude}, ${c.longitude}, ${JSON.stringify(c.color || '#1565C0')}); true;`
      );
    });
    prevLen.current = coordinates.length;
  }, [coordinates, live]);

  const html = buildHtml(live ? [] : coordinates, live);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={ref}
        source={{ html }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
