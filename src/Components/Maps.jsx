/* eslint-disable react/prop-types */
import { useCallback, useRef, useState, useEffect } from "react";
import { GoogleMap, Marker, StandaloneSearchBox } from "@react-google-maps/api";
import { Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { BiSearch } from "react-icons/bi";

const initialCenter = { lat: 20.5937, lng: 78.9629 };

const MapComponent = ({ apiKey, setmapData }) => {
  const [markerPosition, setMarkerPosition] = useState(null);
  const [zoom, setZoom] = useState(5);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const mapRef = useRef(null);
  const searchBoxRef = useRef(null);

  useEffect(() => {
    const scriptId = "google-maps-script";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      document.body.removeChild(existingScript);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      setIsScriptLoaded(false);
    };
  }, [apiKey]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMarkerPosition(userLocation);
          setZoom(10);
          geocodeLatLng(userLocation.lat, userLocation.lng);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  const handleMapClick = (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    setMarkerPosition({ lat, lng });
    setZoom(10);
    geocodeLatLng(lat, lng);
  };

  const handlePlacesChanged = () => {
    const places = searchBoxRef.current.getPlaces();
    if (places.length === 0) return;

    const place = places[0];
    if (place.geometry) {
      const location = place.geometry.location;
      const lat = location.lat();
      const lng = location.lng();
      setMarkerPosition({ lat, lng });
      mapRef.current.panTo(location);
      setZoom(10);
    } else {
      
    }
  };

  const geocodeLatLng = (lat, lng) => {
    const geocoder = new window.google.maps.Geocoder();
    const latlng = { lat, lng };
    let address = { latlng };

    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === "OK") {
        if (results[0]) {
          results[0].address_components.forEach((component) => {
            if (component.types.includes("locality")) {
              address = { ...address, city: component.long_name };
            }
            if (component.types.includes("postal_code")) {
              address = { ...address, pin: component.long_name };
            }
          });
          setmapData(address);
        } else {
          
        }
      } else {
        
      }
    });
  };

  const onMarkerDragEnd = (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    setMarkerPosition({ lat, lng });
    geocodeLatLng(lat, lng);
  };

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
  }, []);

  return (
    <>
      {isScriptLoaded && (
        <>
          <StandaloneSearchBox
            onLoad={(ref) => (searchBoxRef.current = ref)}
            onPlacesChanged={handlePlacesChanged}
          >
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <BiSearch color="gray.300" />
              </InputLeftElement>
              <Input type="text" placeholder="Search for a location" />
            </InputGroup>
          </StandaloneSearchBox>
          <GoogleMap
            onLoad={onLoad}
            mapContainerStyle={{
              width: "100%",
              height: "70vh",
              marginTop: "20px",
            }}
            center={markerPosition || initialCenter}
            zoom={zoom}
            onClick={handleMapClick}
          >
            {markerPosition && (
              <Marker
                position={markerPosition}
                draggable={true}
                onDragEnd={onMarkerDragEnd}
              />
            )}
          </GoogleMap>
        </>
      )}
    </>
  );
};

export default MapComponent;
