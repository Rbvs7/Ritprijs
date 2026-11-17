import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { font, radius, spacing, useColors } from '../theme';
import type { ValueSource } from '../types/models';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

// ---------- Layout ----------
export function Screen({ children, scroll = true, edges = ['top'], contentStyle }: { children: React.ReactNode; scroll?: boolean; edges?: Edge[]; contentStyle?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[{ padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg }, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, raised }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; raised?: boolean }) {
  const c = useColors();
  return (
    <View
      style={[
        { backgroundColor: raised ? c.surfaceRaised : c.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, gap: spacing.md },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({ children, style, gap = spacing.md }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

// ---------- Tekst ----------
type Variant = keyof typeof font;
export function T({ children, v = 'body', color, style, numberOfLines, center }: { children: React.ReactNode; v?: Variant; color?: 'muted' | 'subtle' | 'accent' | 'warning' | 'danger' | string; style?: StyleProp<TextStyle>; numberOfLines?: number; center?: boolean }) {
  const c = useColors();
  const map: Record<string, string> = { muted: c.textMuted, subtle: c.textSubtle, accent: c.accent, warning: c.warning, danger: c.danger };
  return (
    <Text numberOfLines={numberOfLines} style={[font[v], { color: color ? map[color] ?? color : c.text }, center && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
      <T v="tiny" color="subtle" style={{ textTransform: 'uppercase' }}>
        {children}
      </T>
      {right}
    </Row>
  );
}

// ---------- Knoppen ----------
export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  style,
  small,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const bg = { primary: c.accent, secondary: c.surfaceRaised, ghost: 'transparent', danger: 'transparent' }[kind];
  const fg = { primary: c.onAccent, secondary: c.text, ghost: c.accent, danger: c.danger }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: small ? 40 : 54,
          paddingHorizontal: small ? spacing.md : spacing.xl,
          borderRadius: radius.md,
          backgroundColor: kind === 'primary' && pressed ? c.accentPressed : bg,
          borderWidth: kind === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: c.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: disabled ? 0.4 : pressed && kind !== 'primary' ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 18 : 20} color={fg} /> : null}
      <Text style={[small ? font.small : font.bodyStrong, { color: fg, fontWeight: '700' }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, size = 44, color }: { icon: IconName; onPress: () => void; label: string; size?: number; color?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceRaised, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={size * 0.5} color={color ?? c.text} />
    </Pressable>
  );
}

export function Chip({ label, icon, active, onPress, onLongPress }: { label: string; icon?: IconName; active?: boolean; onPress: () => void; onLongPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={() => {
        tap();
        onPress();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: active ? c.accentSoft : c.surfaceRaised,
        borderWidth: 1,
        borderColor: active ? c.accent : c.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon && <Ionicons name={icon} size={16} color={active ? c.accent : c.textMuted} />}
      <Text style={[font.small, { color: active ? c.accent : c.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.bg, borderRadius: radius.md, padding: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={{ flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? c.surfaceRaised : 'transparent', paddingHorizontal: 6 }}
          >
            <Text style={[font.small, { color: active ? c.text : c.textMuted, fontWeight: active ? '700' : '500' }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 9, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T v="bodyStrong">{label}</T>
      <Row gap={spacing.lg}>
        <IconButton icon="remove" label="Minder" onPress={() => onChange(Math.max(min, value - 1))} />
        <T v="h2" style={{ minWidth: 28, textAlign: 'center' }}>
          {value}
        </T>
        <IconButton icon="add" label="Meer" onPress={() => onChange(Math.min(max, value + 1))} />
      </Row>
    </Row>
  );
}

export function ToggleRow({ label, value, onChange, hint, disabled }: { label: string; value: boolean; onChange: (b: boolean) => void; hint?: string; disabled?: boolean }) {
  const c = useColors();
  return (
    <Row style={{ justifyContent: 'space-between', opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flex: 1 }}>
        <T v="bodyStrong">{label}</T>
        {hint ? (
          <T v="small" color="muted">
            {hint}
          </T>
        ) : null}
      </View>
      <Switch disabled={disabled} value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.border }} thumbColor="#fff" accessibilityLabel={label} />
    </Row>
  );
}

// ---------- Invoer ----------
export function Field({ label, suffix, source, hint, error, style, ...props }: TextInputProps & { label: string; suffix?: string; source?: ValueSource; hint?: string; error?: string | null }) {
  const c = useColors();
  return (
    <View style={[{ gap: 6 }, style as StyleProp<ViewStyle>]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="small" color="muted">
          {label}
        </T>
        {source && <SourceBadge source={source} />}
      </Row>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.bg, borderRadius: radius.md, borderWidth: 1, borderColor: error ? c.danger : c.border, paddingHorizontal: spacing.md, minHeight: 52 }}>
        <TextInput placeholderTextColor={c.textSubtle} style={[font.body, { flex: 1, color: c.text, paddingVertical: 12 }]} {...props} accessibilityLabel={label} />
        {suffix ? (
          <T v="small" color="subtle">
            {suffix}
          </T>
        ) : null}
      </View>
      {error ? (
        <T v="small" color="danger">
          {error}
        </T>
      ) : hint ? (
        <T v="small" color="subtle">
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function SourceBadge({ source }: { source: ValueSource }) {
  const c = useColors();
  const cfg = {
    rdw: { label: 'RDW', color: c.info, icon: 'shield-checkmark' as IconName },
    user: { label: 'Zelf ingevuld', color: c.accent, icon: 'person' as IconName },
    estimate: { label: 'Geschat', color: c.warning, icon: 'help-circle' as IconName },
  }[source];
  return (
    <Row gap={4}>
      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
      <Text style={[font.tiny, { color: cfg.color }]}>{cfg.label}</Text>
    </Row>
  );
}

// ---------- Meldingen ----------
export function Banner({ kind = 'info', children, icon, action }: { kind?: 'info' | 'warning' | 'danger'; children: React.ReactNode; icon?: IconName; action?: { label: string; onPress: () => void } }) {
  const c = useColors();
  const color = kind === 'warning' ? c.warning : kind === 'danger' ? c.danger : c.info;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: kind === 'warning' ? c.warningSoft : c.surfaceRaised, borderLeftWidth: 3, borderLeftColor: color, alignItems: 'flex-start' }}>
      <Ionicons name={icon ?? (kind === 'info' ? 'information-circle' : 'warning')} size={20} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 6 }}>
        {typeof children === 'string' ? <T v="small">{children}</T> : children}
        {action && (
          <Pressable onPress={action.onPress} accessibilityRole="button">
            <T v="small" color={color} style={{ fontWeight: '700' }}>
              {action.label}
            </T>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: { label: string; onPress: () => void } }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.md }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={32} color={c.accent} />
      </View>
      <T v="h3" center>
        {title}
      </T>
      <T v="body" color="muted" center>
        {text}
      </T>
      {action && <Button title={action.label} onPress={action.onPress} style={{ alignSelf: 'stretch', marginTop: spacing.sm }} />}
    </View>
  );
}

export function KeyValue({ k, v, strong, badge }: { k: string; v: string; strong?: boolean; badge?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Row gap={6} style={{ flex: 1 }}>
        <T v={strong ? 'bodyStrong' : 'body'} color={strong ? undefined : 'muted'}>
          {k}
        </T>
        {badge}
      </Row>
      <T v={strong ? 'h3' : 'bodyStrong'}>{v}</T>
    </Row>
  );
}
