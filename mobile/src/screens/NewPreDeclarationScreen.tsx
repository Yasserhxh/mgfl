import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import SelectField from '../components/SelectField';
import { createPreDeclaration, fetchArticles, isNetworkError, uploadPhoto } from '../lib/api';
import { SOURCES } from '../lib/config';
import { enqueuePreDeclaration, loadSession } from '../lib/storage';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import type {
  Article,
  NewPreDeclarationPayload,
  PreDeclarationItem,
  RootStackParamList,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewPreDeclaration'>;

interface ItemLine {
  id: number;
  article: string | null;
  /** Raw text input, parsed on submit ("3,5" accepted). */
  tonnage: string;
}

type LocationState =
  | { kind: 'pending' }
  | { kind: 'ok'; latitude: number; longitude: number }
  | { kind: 'denied' }
  | { kind: 'error' };

let nextLineId = 1;

function parseTonnage(raw: string): number {
  return Number.parseFloat(raw.replace(',', '.'));
}

export default function NewPreDeclarationScreen({ navigation }: Props): React.JSX.Element {
  const [matricule, setMatricule] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [lines, setLines] = useState<ItemLine[]>([{ id: nextLineId, article: null, tonnage: '' }]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationState>({ kind: 'pending' });
  const [transporteur, setTransporteur] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const articleNames = useMemo(() => articles.map((a) => a.name), [articles]);

  // Load articles (with offline fallback) and the logged-in transporteur name.
  useEffect(() => {
    void fetchArticles().then(setArticles);
    void loadSession().then((session) => {
      if (session) {
        setTransporteur(session.user.fullName);
      }
    });
  }, []);

  // Auto-capture geolocation; degrade gracefully when permission is denied.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocation({ kind: 'denied' });
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setLocation({
            kind: 'ok',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch {
        if (!cancelled) setLocation({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addLine = (): void => {
    nextLineId += 1;
    setLines((prev) => [...prev, { id: nextLineId, article: null, tonnage: '' }]);
  };

  const removeLine = (id: number): void => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  const updateLine = (id: number, patch: Partial<Omit<ItemLine, 'id'>>): void => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const takePhoto = async (): Promise<void> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Caméra non autorisée',
        'Autorisez l’accès à la caméra pour photographier la marchandise.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const validate = (): PreDeclarationItem[] | null => {
    if (!matricule.trim()) {
      setFormError('Le matricule du véhicule est obligatoire.');
      return null;
    }
    if (!source) {
      setFormError('Veuillez sélectionner la source de la marchandise.');
      return null;
    }
    const items: PreDeclarationItem[] = [];
    for (const line of lines) {
      if (!line.article) {
        setFormError('Chaque ligne doit avoir un article sélectionné.');
        return null;
      }
      const tonnage = parseTonnage(line.tonnage);
      if (!Number.isFinite(tonnage) || tonnage <= 0) {
        setFormError(`Tonnage invalide pour « ${line.article} ».`);
        return null;
      }
      items.push({ article: line.article, tonnage });
    }
    if (items.length === 0) {
      setFormError('Ajoutez au moins un article.');
      return null;
    }
    setFormError(null);
    return items;
  };

  /** Persists the payload in the offline queue and informs the user. */
  const queueOffline = async (payload: NewPreDeclarationPayload): Promise<void> => {
    await enqueuePreDeclaration(payload);
    Alert.alert(
      'Hors-ligne',
      'Enregistré hors-ligne — sera synchronisé dès que la connexion sera rétablie.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const submit = async (): Promise<void> => {
    const items = validate();
    if (!items) {
      return;
    }
    const basePayload: Omit<NewPreDeclarationPayload, 'photoUrl'> = {
      matricule: matricule.trim().toUpperCase(),
      transporteur,
      source: source as string,
      items,
      latitude: location.kind === 'ok' ? location.latitude : null,
      longitude: location.kind === 'ok' ? location.longitude : null,
    };
    setSubmitting(true);
    try {
      // Upload the photo first so the declaration references a server URL.
      let photoUrl: string | null = null;
      if (photoUri) {
        try {
          photoUrl = await uploadPhoto(photoUri);
        } catch (e) {
          if (isNetworkError(e)) {
            // Offline: queue with the local URI — uploaded during the next flush.
            await queueOffline({ ...basePayload, photoUrl: photoUri });
            return;
          }
          // Rejected by the server (format/size): declare without the photo.
          Alert.alert(
            'Photo non envoyée',
            'La photo a été refusée par le serveur (format ou taille non conforme). La pré-déclaration sera enregistrée sans photo.'
          );
          photoUrl = null;
        }
      }
      try {
        const created = await createPreDeclaration({ ...basePayload, photoUrl });
        navigation.replace('Qr', { preDeclaration: created });
      } catch (e) {
        if (isNetworkError(e)) {
          // Offline tolerance: persist locally, flushed on next connectivity.
          // Keep the server URL if the upload already succeeded (avoids re-upload).
          await queueOffline({ ...basePayload, photoUrl });
        } else {
          Alert.alert('Erreur', 'La pré-déclaration n’a pas pu être enregistrée. Réessayez.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const locationLabel =
    location.kind === 'ok'
      ? `Position : ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
      : location.kind === 'pending'
        ? 'Acquisition de la position…'
        : location.kind === 'denied'
          ? 'Localisation refusée — la pré-déclaration sera envoyée sans position.'
          : 'Localisation indisponible — la pré-déclaration sera envoyée sans position.';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Véhicule</Text>
        <Field
          label="Matricule"
          placeholder="ex. 12345-A-6"
          value={matricule}
          onChangeText={setMatricule}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <SelectField
          label="Source de la marchandise"
          placeholder="Sélectionner une source"
          value={source}
          options={SOURCES}
          onSelect={setSource}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Articles chargés</Text>
        {lines.map((line, index) => (
          <View key={line.id} style={styles.lineRow}>
            <SelectField
              compact
              placeholder={`Article ${index + 1}`}
              value={line.article}
              options={articleNames}
              onSelect={(name) => updateLine(line.id, { article: name })}
            />
            <TextInput
              style={styles.tonnageInput}
              placeholder="t"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={line.tonnage}
              onChangeText={(text) => updateLine(line.id, { tonnage: text })}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Supprimer la ligne"
              style={styles.removeButton}
              onPress={() => removeLine(line.id)}
              disabled={lines.length === 1}
            >
              <Text style={[styles.removeText, lines.length === 1 && styles.removeDisabled]}>
                ✕
              </Text>
            </Pressable>
          </View>
        ))}
        <Button title="＋ Ajouter un article" variant="ghost" onPress={addLine} />
        <Text style={styles.hint}>Tonnage approximatif par article, en tonnes.</Text>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Photo de la marchandise</Text>
        {photoUri ? (
          <View style={styles.photoRow}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <Button title="Reprendre la photo" variant="outline" onPress={() => void takePhoto()} />
          </View>
        ) : (
          <Button title="Prendre une photo" variant="outline" onPress={() => void takePhoto()} />
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Géolocalisation</Text>
        <Text style={location.kind === 'ok' ? styles.locationOk : styles.locationWarn}>
          {locationLabel}
        </Text>
      </Card>

      {formError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      ) : null}

      <Button
        title="Enregistrer la pré-déclaration"
        onPress={() => void submit()}
        loading={submitting}
        style={styles.submit}
      />
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tonnageInput: {
    width: 84,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'right',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },
  removeText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  removeDisabled: {
    opacity: 0.3,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationOk: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  locationWarn: {
    color: colors.warning,
    fontSize: fontSize.sm,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
  submit: {
    marginBottom: spacing.xl,
  },
});
