import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useColors } from '../theme';
import type { LatLng, Route } from '../types/models';

export interface RouteMapHandle {
  fitTo: (points: LatLng[], bottomPadding: number) => void;
  centerOn: (p: LatLng) => void;
}

interface Props {
  routes: Route[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  origin: LatLng | null;
  destination: LatLng | null;
  waypoints: LatLng[];
  showUser: boolean;
}

const NL_CENTER = { latitude: 52.2, longitude: 5.3, latitudeDelta: 2.6, longitudeDelta: 2.6 };

const RouteMap = forwardRef<RouteMapHandle, Props>(function RouteMap(p, ref) {
  const c = useColors();
  const map = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    fitTo: (points, bottomPadding) => {
      if (points.length) map.current?.fitToCoordinates(points, { edgePadding: { top: 180, right: 40, bottom: bottomPadding, left: 40 }, animated: true });
    },
    centerOn: (pt) => map.current?.animateToRegion({ ...pt, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 500),
  }));

  const ordered = [...p.routes].sort((a, b) => Number(a.id === p.selectedRouteId) - Number(b.id === p.selectedRouteId));

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={NL_CENTER}
      showsUserLocation={p.showUser}
      showsMyLocationButton={false}
      userInterfaceStyle={c.scheme}
      toolbarEnabled={false}
      showsPointsOfInterests={false}
    >
      {ordered.map((r) => {
        const selected = r.id === p.selectedRouteId;
        return (
          <Polyline
            key={r.id}
            coordinates={r.path}
            strokeColor={selected ? c.route : c.routeAlt}
            strokeWidth={selected ? 6 : 4}
            tappable
            onPress={() => p.onSelectRoute(r.id)}
            zIndex={selected ? 2 : 1}
          />
        );
      })}
      {p.origin && <Marker coordinate={p.origin} pinColor="#6EA8FF" title="Vertrek" />}
      {p.waypoints.map((w, i) => (
        <Marker key={i} coordinate={w} pinColor="#FFB547" title={`Tussenstop ${i + 1}`} />
      ))}
      {p.destination && <Marker coordinate={p.destination} pinColor={c.accent} title="Bestemming" />}
    </MapView>
  );
});

export default RouteMap;
