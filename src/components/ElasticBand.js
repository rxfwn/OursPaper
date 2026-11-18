import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function ElasticBand({ right = '10%' }) {
  return (
    <View
      style={[
        styles.band,
        {
          right,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 4,
          elevation: 4,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 11,
    backgroundColor: '#0a0a0a',
    zIndex: 10,
  },
});
