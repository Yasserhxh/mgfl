import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import Field from '../components/Field';
import Card from '../components/Card';
import { errorStatus, flushOfflineQueue, isNetworkError, login, setAuthToken } from '../lib/api';
import { saveSession } from '../lib/storage';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (): Promise<void> => {
    if (!username.trim() || !password) {
      setError('Veuillez saisir votre nom d’utilisateur et votre mot de passe.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const session = await login(username.trim(), password);
      await saveSession(session);
      setAuthToken(session.token);
      // Network is up: push any pre-declarations queued while offline.
      void flushOfflineQueue();
      navigation.reset({ index: 0, routes: [{ name: 'Voyages' }] });
    } catch (e) {
      if (isNetworkError(e)) {
        setError('Serveur injoignable. Vérifiez votre connexion réseau.');
      } else if (errorStatus(e) === 401 || errorStatus(e) === 400) {
        setError('Identifiants invalides. Veuillez réessayer.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>MGFL</Text>
            </View>
            <Text style={styles.title}>Espace Transporteur</Text>
            <Text style={styles.subtitle}>
              Marché de Gros de Fruits et Légumes — Casablanca
            </Text>
          </View>

          <Card>
            <Field
              label="Nom d'utilisateur"
              placeholder="ex. transporteur"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
            />
            <Field
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Button title="Se connecter" onPress={() => void handleLogin()} loading={loading} />
          </Card>

          <Text style={styles.footer}>
            Pré-déclarez vos arrivages et présentez le QR code au pont à bascule.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  logoText: {
    color: colors.surface,
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
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
  footer: {
    marginTop: spacing.xl,
    textAlign: 'center',
    color: colors.muted,
    fontSize: fontSize.xs,
  },
});
