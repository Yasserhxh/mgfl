import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../components/Card';
import Pill from '../components/Pill';
import Button from '../components/Button';
import { errorStatus, fetchPreDeclarations, isNetworkError, setAuthToken } from '../lib/api';
import { clearSession, getQueue } from '../lib/storage';
import { cardShadow, colors, fontSize, radius, spacing } from '../lib/theme';
import type { PreDeclaration, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Voyages'>;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('fr-FR');
}

export default function VoyagesScreen({ navigation }: Props): React.JSX.Element {
  const [voyages, setVoyages] = useState<PreDeclaration[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(async (): Promise<void> => {
    await clearSession();
    setAuthToken(null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable accessibilityRole="button" onPress={() => void handleLogout()}>
          <Text style={styles.logout}>Déconnexion</Text>
        </Pressable>
      ),
    });
  }, [navigation, handleLogout]);

  const load = useCallback(async (): Promise<void> => {
    try {
      const data = await fetchPreDeclarations();
      // Most recent first.
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setVoyages(data);
      setError(null);
    } catch (e) {
      if (errorStatus(e) === 401) {
        // Token expired: force re-authentication.
        await handleLogout();
        return;
      }
      setError(
        isNetworkError(e)
          ? 'Mode hors-ligne — impossible de charger les voyages.'
          : 'Erreur lors du chargement des voyages.'
      );
    } finally {
      setPendingCount((await getQueue()).length);
    }
  }, [handleLogout]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderVoyage = ({ item }: { item: PreDeclaration }): React.JSX.Element => (
    <Pressable onPress={() => navigation.navigate('Qr', { preDeclaration: item })}>
      <Card style={styles.voyageCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.code}>{item.code}</Text>
          <Pill status={item.status} />
        </View>
        <Text style={styles.matricule}>{item.matricule}</Text>
        <Text style={styles.meta}>{item.source}</Text>
        <Text style={styles.items} numberOfLines={2}>
          {item.items.map((i) => `${i.article} (${i.tonnage} t)`).join(' · ')}
        </Text>
        {item.netWeight != null || item.tax != null ? (
          <Text style={styles.meta}>
            {item.netWeight != null ? `Poids net : ${item.netWeight} kg` : ''}
            {item.netWeight != null && item.tax != null ? '  ·  ' : ''}
            {item.tax != null ? `Taxe : ${item.tax} DH` : ''}
          </Text>
        ) : null}
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </Card>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {pendingCount > 0 ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            {pendingCount} pré-déclaration{pendingCount > 1 ? 's' : ''} en attente de
            synchronisation
          </Text>
        </View>
      ) : null}

      <FlatList
        data={voyages}
        keyExtractor={(item) => item.code}
        renderItem={renderVoyage}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {error ? (
              <>
                <Text style={styles.emptyText}>{error}</Text>
                <Button
                  title="Réessayer"
                  variant="outline"
                  onPress={() => void load()}
                  style={styles.retry}
                />
              </>
            ) : (
              <Text style={styles.emptyText}>
                Aucun voyage pour le moment.{'\n'}Créez votre première pré-déclaration.
              </Text>
            )}
          </View>
        }
      />

      <Pressable
        accessibilityRole="button"
        style={styles.fab}
        onPress={() => navigation.navigate('NewPreDeclaration')}
      >
        <Text style={styles.fabText}>＋ Nouvelle pré-déclaration</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  logout: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  offlineBanner: {
    backgroundColor: colors.warningSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  offlineText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 96,
    flexGrow: 1,
  },
  voyageCard: {
    marginBottom: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  code: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  matricule: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  items: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  date: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  retry: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    minWidth: 160,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    ...cardShadow,
  },
  fabText: {
    color: colors.surface,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
