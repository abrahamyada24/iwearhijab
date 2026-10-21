import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from '../theme';
export { tw };

export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  ...props
}: any) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      {...props}
      style={tw`${
        secondary ? 'bg-blue-50 dark:bg-gray-700' : 'bg-blue-600'
      } rounded-xl p-3 items-center justify-center my-1 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <Text
        style={tw`${
          secondary ? 'text-blue-700 dark:text-blue-200' : 'text-white'
        } font-bold text-center`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
export function Field({ label, ...props }: any) {
  return (
    <View style={tw`mb-3`}>
      <Text style={tw`text-xs font-bold text-gray-600 dark:text-gray-300 mb-1`}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9296a0"
        {...props}
        style={tw`border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-white`}
      />
    </View>
  );
}
export function Card({ children }: any) {
  return (
    <View
      style={tw`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl mb-3`}
    >
      {children}
    </View>
  );
}
export function Title({ title, subtitle, navigation, children }: any) {
  return (
    <View
      style={tw`bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-700`}
    >
      <View style={tw`flex-row items-center`}>
        {navigation && (
          <TouchableOpacity
            accessibilityLabel="Kembali"
            onPress={() => navigation.goBack()}
            style={tw`p-2 mr-2`}
          >
            <Icon name="arrow-left" size={24} color={tw.color('blue-600')} />
          </TouchableOpacity>
        )}
        <View style={tw`flex-1`}>
          <Text style={tw`text-xl font-bold text-gray-900 dark:text-white`}>
            {title}
          </Text>
          {subtitle && (
            <Text style={tw`text-xs text-gray-500 mt-1`}>{subtitle}</Text>
          )}
        </View>
      </View>
      {children}
    </View>
  );
}
export function Sheet({
  visible,
  onClose,
  title,
  children,
  busy = false,
}: any) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => !busy && onClose()}
    >
      <View style={tw`flex-1 justify-end bg-black/50`}>
        <View style={tw`bg-white dark:bg-gray-800 rounded-t-3xl max-h-[90%]`}>
          <View style={tw`flex-row p-4 items-center`}>
            <Text
              style={tw`font-bold text-xl text-gray-900 dark:text-white flex-1`}
            >
              {title}
            </Text>
            <Button title="Tutup" secondary disabled={busy} onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={tw`p-5 pb-10`}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function Chips({ options, value, onChange }: any) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw`py-2`}
    >
      {options.map((option: any) => {
        const key = option.value ?? option;
        const label = option.label ?? option;
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: key === value }}
            key={String(key)}
            onPress={() => onChange(key)}
            style={tw`${
              key === value ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-700'
            } rounded-full px-4 py-2 mr-2`}
          >
            <Text
              style={tw`${
                key === value
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-200'
              } font-bold text-xs`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
export function Empty({ loading = false, text = 'Belum ada data.' }: any) {
  return loading ? (
    <ActivityIndicator style={tw`my-12`} color={tw.color('blue-600')} />
  ) : (
    <Text style={tw`text-center text-gray-500 p-8`}>{text}</Text>
  );
}
export function DateFilter({ start, end, setStart, setEnd, onApply }: any) {
  return (
    <>
      <View style={tw`flex-row`}>
        <View style={tw`flex-1 mr-2`}>
          <Field
            label="Dari (YYYY-MM-DD)"
            value={start}
            onChangeText={setStart}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={tw`flex-1`}>
          <Field
            label="Sampai (YYYY-MM-DD)"
            value={end}
            onChangeText={setEnd}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
      <Button title="Terapkan" secondary onPress={onApply} />
    </>
  );
}
