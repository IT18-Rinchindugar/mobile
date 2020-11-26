import React, {useCallback, useEffect, useState, useRef, useLayoutEffect} from 'react';
import {useNetInfo} from '@react-native-community/netinfo';
import {useNavigation} from '@react-navigation/native';
import {BottomSheet, BottomSheetBehavior, Box, Header} from 'components';
import {DevSettings, Linking, Animated, View} from 'react-native';
import {TEST_MODE} from 'env';
import {
  ExposureStatusType,
  SystemStatus,
  useExposureStatus,
  useUpdateExposureStatus,
  useStartExposureNotificationService,
  useSystemStatus,
} from 'services/ExposureNotificationService';
import {useStorage} from 'services/StorageService';
import {usePrevious} from 'shared/usePrevious';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useExposureNotificationSystemStatusAutomaticUpdater} from '../../services/ExposureNotificationService';

import {BluetoothDisabledView} from './views/BluetoothDisabledView';
import {CollapsedOverlayView} from './views/CollapsedOverlayView';
import {DiagnosedShareView} from './views/DiagnosedShareView';
import {DiagnosedView} from './views/DiagnosedView';
import {ExposureNotificationsDisabledView} from './views/ExposureNotificationsDisabledView';
import {ExposureNotificationsUnauthorizedView} from './views/ExposureNotificationsUnauthorizedView';
import {ExposureView} from './views/ExposureView';
import {NoExposureNoRegionView} from './views/NoExposureNoRegionView';
import {NetworkDisabledView} from './views/NetworkDisabledView';
import {OverlayView} from './views/OverlayView';
import {FrameworkUnavailableView} from './views/FrameworkUnavailableView';
import {UnknownProblemView} from './views/UnknownProblemView';
import {
  useNotificationPermissionStatus,
  NotificationPermissionStatusProvider,
} from './components/NotificationPermissionStatus';
import {LocationOffView} from './views/LocationOffView';

interface ContentProps {
  isBottomSheetExpanded: boolean;
}

const Content = ({isBottomSheetExpanded}: ContentProps) => {
  const exposureStatus = useExposureStatus();
  const [systemStatus] = useSystemStatus();
  const [, turnNotificationsOn] = useNotificationPermissionStatus();
  useEffect(() => {
    return turnNotificationsOn();
  }, [turnNotificationsOn]);

  const network = useNetInfo();

  const getNoExposureView = () => {
    return <NoExposureNoRegionView isBottomSheetExpanded={isBottomSheetExpanded} />;
  };

  // this is for the test menu
  const {forceScreen} = useStorage();
  if (TEST_MODE) {
    switch (forceScreen) {
      case 'NoExposureView':
        return getNoExposureView();
      case 'ExposureView':
        return <ExposureView isBottomSheetExpanded={isBottomSheetExpanded} />;
      case 'DiagnosedShareView':
        return <DiagnosedShareView isBottomSheetExpanded={isBottomSheetExpanded} />;
      case 'DiagnosedView':
        return <DiagnosedView isBottomSheetExpanded={isBottomSheetExpanded} />;
      default:
        break;
    }
  }

  switch (systemStatus) {
    case SystemStatus.Undefined:
      return <UnknownProblemView isBottomSheetExpanded={isBottomSheetExpanded} />;
    case SystemStatus.Unauthorized:
      return <ExposureNotificationsUnauthorizedView isBottomSheetExpanded={isBottomSheetExpanded} />;
    case SystemStatus.Disabled:
    case SystemStatus.Restricted:
      return <ExposureNotificationsDisabledView isBottomSheetExpanded={isBottomSheetExpanded} />;
    case SystemStatus.PlayServicesNotAvailable:
      return <FrameworkUnavailableView isBottomSheetExpanded={isBottomSheetExpanded} />;
  }

  switch (exposureStatus.type) {
    case ExposureStatusType.Exposed:
      return <ExposureView isBottomSheetExpanded={isBottomSheetExpanded} />;
    case ExposureStatusType.Diagnosed:
      if (!network.isConnected) {
        return <NetworkDisabledView />;
      }
      return exposureStatus.needsSubmission ? (
        <DiagnosedShareView isBottomSheetExpanded={isBottomSheetExpanded} />
      ) : (
        <DiagnosedView isBottomSheetExpanded={isBottomSheetExpanded} />
      );
    case ExposureStatusType.Monitoring:
    default:
      if (!network.isConnected) {
        return <NetworkDisabledView />;
      }
      switch (systemStatus) {
        case SystemStatus.BluetoothOff:
          return <BluetoothDisabledView />;
        case SystemStatus.LocationOff:
          return <LocationOffView isBottomSheetExpanded={isBottomSheetExpanded} />;
        case SystemStatus.Active:
          return getNoExposureView();
        default:
          return <UnknownProblemView isBottomSheetExpanded={isBottomSheetExpanded} />;
      }
  }
};

const CollapsedContent = (bottomSheetBehavior: BottomSheetBehavior) => {
  const [systemStatus] = useSystemStatus();
  const [notificationStatus, turnNotificationsOn] = useNotificationPermissionStatus();
  const showNotificationWarning = notificationStatus !== 'granted';

  return (
    <CollapsedOverlayView
      status={systemStatus}
      notificationWarning={showNotificationWarning}
      turnNotificationsOn={turnNotificationsOn}
      bottomSheetBehavior={bottomSheetBehavior}
    />
  );
};

const ExpandedContent = (bottomSheetBehavior: BottomSheetBehavior) => {
  const [systemStatus] = useSystemStatus();
  const [notificationStatus, turnNotificationsOn] = useNotificationPermissionStatus();
  const showNotificationWarning = notificationStatus !== 'granted';
  const toSettings = useCallback(() => {
    Linking.openSettings();
  }, []);
  const turnNotificationsOnFn = notificationStatus === 'blocked' ? toSettings : turnNotificationsOn;

  return (
    <OverlayView
      status={systemStatus}
      notificationWarning={showNotificationWarning}
      turnNotificationsOn={turnNotificationsOnFn}
      bottomSheetBehavior={bottomSheetBehavior}
    />
  );
};

export const HomeScreen = () => {
  const navigation = useNavigation();
  useEffect(() => {
    if (__DEV__ && TEST_MODE) {
      DevSettings.addMenuItem('Show Demo Menu', () => {
        navigation.navigate('TestScreen');
      });
    }
  }, [navigation]);

  // This only initiate system status updater.
  // The actual updates will be delivered in useSystemStatus().
  const subscribeToStatusUpdates = useExposureNotificationSystemStatusAutomaticUpdater();
  useEffect(() => {
    return subscribeToStatusUpdates();
  }, [subscribeToStatusUpdates]);

  const startExposureNotificationService = useStartExposureNotificationService();
  const updateExposureStatus = useUpdateExposureStatus();
  useEffect(() => {
    startExposureNotificationService();
    updateExposureStatus();
  }, [startExposureNotificationService, updateExposureStatus]);

  const bottomSheetRef = useRef<BottomSheetBehavior>(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const currentStatus = useExposureStatus().type;
  const previousStatus = usePrevious(currentStatus);
  useLayoutEffect(() => {
    if (previousStatus === ExposureStatusType.Monitoring && currentStatus === ExposureStatusType.Diagnosed) {
      bottomSheetRef.current?.collapse();
    }
  }, [currentStatus, previousStatus]);
  useLayoutEffect(() => {
    bottomSheetRef.current?.setOnStateChange(setIsBottomSheetExpanded);
  }, []);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(
    () =>
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay: 1000,
        duration: 10,
        useNativeDriver: false,
      }).start(),
    [fadeAnim],
  );

  return (
    <NotificationPermissionStatusProvider>
      <Box position="absolute" backgroundColor="newIce" height="100%" width="100%" />
      <Box position="absolute" backgroundColor="newBlue" height={350} width="100%" />
      <Box flex={1} alignItems="center" backgroundColor="transparent">
        <Box
          flex={1}
          paddingTop="m"
          paddingBottom="m"
          alignSelf="stretch"
          accessibilityElementsHidden={isBottomSheetExpanded}
          importantForAccessibility={isBottomSheetExpanded ? 'no-hide-descendants' : undefined}
        >
          <SafeAreaView>
            <Header />
            <Animated.View
              style={{
                opacity: fadeAnim,
                marginLeft: 16,
                marginRight: 16,
                marginTop: 20,
                borderRadius: 15,
                backgroundColor: 'white',
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 30,
                paddingBottom: 30,
                shadowColor: '#2567ED',
                shadowOffset: {
                  width: 0,
                  height: 1,
                },
                shadowOpacity: 0.1,
                shadowRadius: 5,

                elevation: 3,
              }}
            >
              <Content isBottomSheetExpanded={isBottomSheetExpanded} />
            </Animated.View>
          </SafeAreaView>
        </Box>
        <BottomSheet ref={bottomSheetRef} expandedComponent={ExpandedContent} collapsedComponent={CollapsedContent} />
      </Box>
    </NotificationPermissionStatusProvider>
  );
};
