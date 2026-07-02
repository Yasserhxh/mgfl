import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontSize, radius, spacing, statusStyle } from '../lib/theme';
import type { PreDeclarationStatus } from '../types';

interface PillProps {
  status: PreDeclarationStatus;
}

/** Status pill: En attente = amber, Pesé = blue, Clôturé = green. */
export default function Pill({ status }: PillProps): React.JSX.Element {
  const palette = statusStyle[status];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
