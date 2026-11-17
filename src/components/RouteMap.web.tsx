import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '../theme';
import type { LatLng, Route } from '../types/models';
import { T } from './ui';

/** Webversie: react-native-maps werkt niet in de browser. De app is bedoeld voor iOS/Android. */
export interface RouteMapHandle {
  fitTo: (points: LatLng[], bottomPadding: number) => void;
  centerOn: (p: LatLng) => void;
}

const RouteMap = forwardRef<RouteMapHandle, { routes: Route[]; selectedRouteId: string | null; onSelectRoute: (id: string) => void; origin: LatLng | null; destination: LatLng | null; waypoints: LatLng[]; showUser: boolean }>(
  function RouteMap(_p, ref) {
    const c = useColors();
    useImperativeHandle(ref, () => ({ fitTo: () => {}, centerOn: () => {} }));
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }]}>
        <T color="subtle">Kaart is alleen beschikbaar in de mobiele app</T>
      </View>
    );
  },
);

export default RouteMap;
