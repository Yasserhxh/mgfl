import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../components/Card';
import Pill from '../components/Pill';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Qr'>;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('fr-FR');
}

export default function QrScreen({ route }: Props): React.JSX.Element {
  const { preDeclaration } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.qrCard}>
        <Text style={styles.instructions}>
          Présentez ce QR code au pont à bascule
        </Text>
        <View style={styles.qrWrapper}>
          <QRCode
            value={preDeclaration.code}
            size={240}
            color={colors.text}
            backgroundColor={colors.surface}
          />
        </View>
        <Text style={styles.code}>{preDeclaration.code}</Text>
      </Card>

      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Résumé du voyage</Text>
          <Pill status={preDeclaration.status} />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Matricule</Text>
          <Text style={styles.value}>{preDeclaration.matricule}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Transporteur</Text>
          <Text style={styles.value}>{preDeclaration.transporteur}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Source</Text>
          <Text style={styles.value}>{preDeclaration.source}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Créée le</Text>
          <Text style={styles.value}>{formatDate(preDeclaration.createdAt)}</Text>
        </View>
        {preDeclaration.magasin ? (
          <View style={styles.row}>
            <Text style={styles.label}>Magasin</Text>
            <Text style={styles.value}>{preDeclaration.magasin}</Text>
          </View>
        ) : null}
        {preDeclaration.netWeight != null ? (
          <View style={styles.row}>
            <Text style={styles.label}>Poids net</Text>
            <Text style={styles.value}>{preDeclaration.netWeight} kg</Text>
          </View>
        ) : null}
        {preDeclaration.tax != null ? (
          <View style={styles.row}>
            <Text style={styles.label}>Taxe</Text>
            <Text style={styles.value}>{preDeclaration.tax} DH</Text>
          </View>
        ) : null}

        <Text style={styles.itemsTitle}>Articles déclarés</Text>
        {preDeclaration.items.map((item, index) => (
          <View key={`${item.article}-${index}`} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.article}</Text>
            <Text style={styles.itemTonnage}>{item.tonnage} t</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  qrCard: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  instructions: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  qrWrapper: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  code: {
    marginTop: spacing.lg,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  itemsTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemName: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  itemTonnage: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
});
