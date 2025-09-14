import * as Location from "expo-location";
import { Camera, CameraType } from "expo-camera";
import { useEffect, useRef, useState } from "react";

export async function requestLocationPermissions() {
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== "granted") {
throw new Error("Location permission not granted");
}
}

export async function getCurrentCoords() {
const { coords } = await Location.getCurrentPositionAsync({});
return coords;
}

export function useCameraController() {
const [hasPermission, setHasPermission] = useState<boolean>(false);
// const cameraRef = useRef<Camera | null>(null);
useEffect(() => {
(async () => {
const { status } = await Camera.requestCameraPermissionsAsync();
setHasPermission(status === "granted");
})();
}, []);
return { hasPermission, cameraRef };
}
