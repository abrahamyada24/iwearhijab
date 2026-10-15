import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export const openKitchenQueue = (attempt = 0) => {
    if (navigationRef.isReady()) {
        navigationRef.navigate('KitchenQueue');
        return;
    }

    if (attempt < 10) {
        setTimeout(() => openKitchenQueue(attempt + 1), 300);
    }
};
