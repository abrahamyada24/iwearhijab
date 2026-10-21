import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useAppColorScheme } from 'twrnc';
import { Button, Field, tw } from '../retail/ui';
import api from '../services/api';
import {
  clearAuthSession,
  loadAuthSession,
  migrateLegacyAuthStorage,
  saveAuthSession,
} from '../services/secureAuthStorage';
import { bootstrapRetail } from '../retail/data';

export default function LoginScreen({ navigation }: any) {
  useAppColorScheme(tw);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const enter = async () => {
    const data = await bootstrapRetail();
    navigation.replace(data.license.isActive ? 'Main' : 'Lock');
  };
  useEffect(() => {
    (async () => {
      try {
        await migrateLegacyAuthStorage();
        const session = await loadAuthSession();
        if (session && !session.offline) await enter();
        else if (session) await clearAuthSession();
      } catch (error: any) {
        if ([401, 403].includes(error.response?.status))
          await clearAuthSession();
        else
          Alert.alert(
            'Sesi Belum Dimuat',
            'Periksa koneksi lalu masuk kembali.',
          );
      } finally {
        setRestoring(false);
      }
    })();
  }, []);
  const login = async () => {
    if (loading || !identifier.trim() || !password) return;
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        identifier: identifier.trim().toLowerCase(),
        password,
        clientType: 'ANDROID',
        deviceName: 'Android ' + Platform.Version,
      });
      const { token, user } = response.data;
      if (!token || !user) throw new Error('Respons login belum lengkap.');
      if (user.mustChangePassword) {
        await api
          .post(
            '/auth/logout',
            {},
            { headers: { Authorization: 'Bearer ' + token } },
          )
          .catch(() => {});
        throw new Error(
          'Masuk ke website Iwearing Hijab untuk mengganti password terlebih dahulu.',
        );
      }
      await saveAuthSession({ token, user, remember });
      await enter();
    } catch (error: any) {
      Alert.alert(
        'Login Belum Berhasil',
        error.response?.data?.message ||
          error.message ||
          'Periksa koneksi internet.',
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-blue-600`}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={tw`flex-grow justify-center`}
      >
        <View style={tw`items-center px-10 py-10`}>
          <Image
            source={require('../assets/brand-monogram.png')}
            style={{ width: 100, height: 100, tintColor: 'white' }}
            resizeMode="contain"
          />
          <Text style={tw`text-white text-2xl tracking-widest mt-4`}>
            IWEARING HIJAB
          </Text>
        </View>
        <View style={tw`bg-white rounded-t-3xl p-8 flex-1 justify-center`}>
          <View style={tw`w-full max-w-sm self-center`}>
            <Text style={tw`text-gray-900 text-3xl font-bold text-center mb-8`}>
              Sistem Kasir
            </Text>
            {restoring ? (
              <ActivityIndicator color={tw.color('blue-600')} />
            ) : (
              <>
                <Field
                  label="Username atau email"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  onSubmitEditing={login}
                />
                <Button
                  title={
                    showPassword ? 'Sembunyikan password' : 'Tampilkan password'
                  }
                  secondary
                  onPress={() => setShowPassword(!showPassword)}
                />
                <View style={tw`flex-row items-center justify-between my-3`}>
                  <Text style={tw`text-gray-600`}>Ingat saya</Text>
                  <Switch
                    value={remember}
                    onValueChange={setRemember}
                    trackColor={{ true: tw.color('blue-600') }}
                  />
                </View>
                <Button
                  title={loading ? 'Memproses...' : 'Masuk Sekarang'}
                  disabled={loading || !identifier.trim() || !password}
                  onPress={login}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
