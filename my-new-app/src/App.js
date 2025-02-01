import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const{expoPushToken, notification} = usePushNotifications()
  const data = JSON.stringify(notification, undefined, 2);

  useEffect(() => {
    console.log("Expo Push Token:", expoPushToken?.data);
    console.log("Notification Data:", notification);
  }, [expoPushToken, notification]);

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Auth"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}