import React from 'react';
import {StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Box, Icon, IconName} from 'components';

interface BaseHomeViewProps {
  children?: React.ReactNode;
  iconName?: IconName;
  testID?: string;
}

export const BaseHomeView = ({children, iconName, testID}: BaseHomeViewProps) => {
  return (
    <>
      <ScrollView alwaysBounceVertical={false} testID={testID} contentContainerStyle={styles.scrollContainer}>
        <SafeAreaView edges={['left', 'right']}>
          <Box width="100%" justifyContent="flex-start" marginBottom="-l">
            <Box style={{...styles.primaryIcon}}>
              <Icon name={iconName} height={120} width={150} />
            </Box>
          </Box>
          <Box
            width="100%"
            flex={1}
            alignItems="flex-start"
            justifyContent="flex-start"
            paddingHorizontal="m"
            marginBottom="l"
          >
            {children}
          </Box>
        </SafeAreaView>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  primaryIcon: {marginLeft: -40, marginBottom: 30},
  scrollContainerWithAnimation: {
    marginTop: -100,
  },
  scrollContainer: {
    maxWidth: 600,
    alignItems: 'flex-start',
  },
});
