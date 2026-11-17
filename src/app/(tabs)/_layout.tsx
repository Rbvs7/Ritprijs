import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { useApp } from '../../state/AppState';
import { useColors } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Navigatie', icon: 'navigate-outline', iconActive: 'navigate' },
  { name: 'ritten', title: 'Ritten', icon: 'time-outline', iconActive: 'time' },
  { name: 'auto', title: 'Mijn Auto', icon: 'car-sport-outline', iconActive: 'car-sport' },
  { name: 'vergelijken', title: 'Vergelijken', icon: 'git-compare-outline', iconActive: 'git-compare' },
  { name: 'profiel', title: 'Profiel', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  const c = useColors();
  const { prefs } = useApp();
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textSubtle,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? t.iconActive : t.icon} color={color as string} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
