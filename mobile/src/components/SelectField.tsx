import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

interface SelectFieldProps {
  label?: string;
  placeholder: string;
  value: string | null;
  options: readonly string[];
  onSelect: (value: string) => void;
  /** Compact mode (no label margin) for use inside table-like rows. */
  compact?: boolean;
}

/** Simple modal-based single-choice picker (no extra native dependency). */
export default function SelectField({
  label,
  placeholder,
  value,
  options,
  onSelect,
  compact = false,
}: SelectFieldProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        style={styles.trigger}
        onPress={() => setOpen(true)}
      >
        <Text style={value ? styles.value : styles.placeholder} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label ?? placeholder}</Text>
            <FlatList
              data={[...options]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, item === value && styles.optionSelected]}>
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  compactContainer: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  value: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  placeholder: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.muted,
  },
  chevron: {
    marginLeft: spacing.sm,
    color: colors.muted,
    fontSize: fontSize.md,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: 420,
    paddingVertical: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  optionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  optionSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
});
