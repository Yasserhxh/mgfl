import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { flushOfflineQueue, setAuthToken } from './src/lib/api';
import { loadSession } from './src/lib/storage';
import { colors } from './src/lib/theme';
import type { RootStackParamList } from './src/types';
import LoginScreen from './src/screens/LoginScreen';
import VoyagesScreen from './src/screens/VoyagesScreen';
import NewPreDeclarationScreen from './src/screens/NewPreDeclarationScreen';
import QrScreen from './src/screens/QrScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');

  // Restore the persisted session on cold start, then try to sync the
  // offline queue of pre-declarations.
  useEffect(() => {
    void (async () => {
      const session = await loadSession();
      if (session) {
        setAuthToken(session.token);
        setInitialRoute('Voyages');
        void flushOfflineQueue();
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.surface} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.surface,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Voyages"
            component={VoyagesScreen}
            options={{ title: 'Mes voyages' }}
          />
          <Stack.Screen
            name="NewPreDeclaration"
            component={NewPreDeclarationScreen}
            options={{ title: 'Nouvelle pré-déclaration' }}
          />
          <Stack.Screen
            name="Qr"
            component={QrScreen}
            options={{ title: 'QR de passage' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
});
