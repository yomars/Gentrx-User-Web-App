import { MdLocationCity } from "react-icons/md";
/* eslint-disable react/prop-types */
import { BiChevronDown } from "react-icons/bi";
import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Input,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  HStack,
  MenuItem,
  Text,
  theme,
} from "@chakra-ui/react";
import { FaMapMarkerAlt } from "react-icons/fa";
import { GET } from "../Controllers/ApiControllers";
import { useQuery } from "@tanstack/react-query";
import { useCity } from "../Context/SelectedCity";
import { motion } from "framer-motion";
import { setStorageItem, getStorageJSON } from "../lib/storage";

const LOCATION_TOAST_ID = "location-selector-city-required";
let hasAttemptedInitialLocationFetch = false;

const LoadingText = () => {
  return (
    <Text>
      Loading
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
      >
        .
      </motion.span>
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
      >
        .
      </motion.span>
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
      >
        .
      </motion.span>
    </Text>
  );
};

// Retry logic with exponential backoff for API calls
const retryWithBackoff = async (fn, maxRetries = 3, delay = 500) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const backoffDelay = delay * Math.pow(2, attempt);
      console.warn(`[LocationSelector] Attempt ${attempt + 1} failed, retrying in ${backoffDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
};

const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude }); // Return lat and lng
        },
        (error) => {
          reject(error.message); // Return the error message
        }
      );
    } else {
      reject("Geolocation is not supported by this browser.");
    }
  });
};

const extractCityFields = (response) => {
  // Handle multiple API response formats
  const data = response?.data || response;
  if (!data) return null;
  
  // Extract city fields with multiple fallback options
  const cityId = data.city_id ?? data.id ?? data.cityId;
  const cityName = data.city ?? data.name ?? data.title;
  const latitude = data.latitude ?? data.lat;
  const longitude = data.longitude ?? data.lng ?? data.lon;
  
  return { cityId, cityName, latitude, longitude };
};

const getCity = async (lat, lng) => {
  try {
    const res = await retryWithBackoff(
      () => GET(`get_current_city?latitude=${lat}&longitude=${lng}`),
      2,
      300
    );

    const fields = extractCityFields(res);
    if (!fields?.cityId || !fields?.cityName) {
      throw new Error("Invalid city response format");
    }

    return fields;
  } catch (err) {
    throw err;
  }
};

const getCities = async () => {
  try {
    const res = await retryWithBackoff(
      () => GET("get_city?active=1"),
      2,
      300
    );

    // Handle multiple response formats
    let citiesData = Array.isArray(res) ? res : res?.data;
    if (!Array.isArray(citiesData)) {
      return [];
    }

    return citiesData;
  } catch (err) {
    return [];
  }
};

const LocationSeletor = ({ type }) => {
  const [searchValue, setSearchValue] = useState("");
  const { selectedCity, setSelectedCity } = useCity();
  const toast = useToast();
  const [isLoading, setisLoading] = useState(false);

  const {
    data: cities,
    isLoading: citiesLoading,
    isError: citiesError,
  } = useQuery({
    queryKey: ["cities"],
    queryFn: getCities,
    retry: 0, // Disable retries to avoid error spam in tracking prevention mode
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const cityList = Array.isArray(cities) ? cities : [];

  const applyFallbackCity = useCallback(() => {
    if (!cityList.length) {
      return false;
    }

    // Prefer default city, then first city, then cached city
    const defaultCity = cityList.find((city) => city.default_city === 1);
    const cachedCity = getStorageJSON("currentCity");
    const fallback = defaultCity || (cachedCity && cityList.find(c => c.id === cachedCity.id)) || cityList[0];
    
    const cityId = fallback.city_id ?? fallback.id;
    const cityName = fallback.city ?? fallback.name ?? fallback.title;
    
    const formattedCity = {
      id: cityId,
      city: cityName,
      latitude: fallback.latitude,
      longitude: fallback.longitude,
    };

    setSelectedCity(formattedCity);
    setStorageItem("currentCity", JSON.stringify(formattedCity));
    return true;
  }, [cityList, setSelectedCity]);

  const fetchLocation = useCallback(async () => {
    setisLoading(true);
    try {
      // Try to get user's current location first
      try {
        const location = await getCurrentLocation();

        try {
          const cityData = await getCity(location.latitude, location.longitude);
          if (cityData?.cityId && cityData?.cityName) {
            const formattedCity = {
              id: cityData.cityId,
              city: cityData.cityName,
              latitude: cityData.latitude,
              longitude: cityData.longitude,
            };
            setStorageItem("currentCity", JSON.stringify(formattedCity));
            setSelectedCity(formattedCity);
            return;
          }
        } catch (cityError) {
        }
      } catch (geoError) {
      }

      // Fallback to default/cached city
      const hasFallback = applyFallbackCity();
      if (!hasFallback && !toast.isActive(LOCATION_TOAST_ID)) {
        toast({
          id: LOCATION_TOAST_ID,
          title: "Select a city",
          description: "Please select your location from the dropdown",
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      }
    } finally {
      setisLoading(false);
    }
  }, [applyFallbackCity, setSelectedCity, toast]);

  useEffect(() => {
    if (!selectedCity && !hasAttemptedInitialLocationFetch) {
      hasAttemptedInitialLocationFetch = true;
      fetchLocation();
    }
  }, [selectedCity, fetchLocation]);

  const filterCities = () => {
    if (searchValue.length > 0) {
      return cityList.filter((city) =>
        city.title.toLowerCase().includes(searchValue.toLowerCase())
      );
    }
    return cityList;
  };

  return (
    <Box>
      {/* Menu for location options */}
      <Menu borderRadius={0}>
        {type === "search" ? (
          <MenuButton
            as={Button}
            leftIcon={<FaMapMarkerAlt />}
            variant={"ghost"}
            color={"gray.900"}
            _hover={{ bg: "none", borderColor: "gray.300" }}
            _active={{ bg: "none" }}
            rightIcon={<BiChevronDown />}
            fontSize={{ base: "sm", md: "md" }}
            border={"1px solid"}
            borderColor={"gray.200"}
            px={4}
            w={"100%"}
            borderRightRadius={{ base: 1, md: 0 }}
            borderRight={{ base: "1px solid", md: "none" }}
            borderRightColor={{ base: "gray.200", md: "none" }}
            borderRadius={{ base: "md", md: 0 }}
            borderLeftRadius={{ base: "md", md: "md" }}
            textAlign={"left"}
            fontWeight={600}
            bg={"white"}
          >
            {isLoading ? (
              <LoadingText />
            ) : selectedCity ? (
              selectedCity.city
            ) : (
              "Select Location"
            )}
          </MenuButton>
        ) : (
          <MenuButton
            as={Button}
            leftIcon={<FaMapMarkerAlt />}
            variant={"ghost"}
            color={"white"}
            _hover={{ bg: "none" }}
            _active={{ bg: "none" }}
            rightIcon={<BiChevronDown />}
            px={0}
            fontSize={{ base: "sm", md: "md" }}
          >
            {isLoading ? (
              <LoadingText />
            ) : selectedCity ? (
              selectedCity.city
            ) : (
              "Select Location"
            )}
          </MenuButton>
        )}

        <MenuList
          w={"400px"}
          maxW={"95vw"}
          zIndex={9999}
          maxH={"80vh"}
          borderRadius={2}
          color={"#000"}
          maxHeight={"80vh"}
          overflowY={"auto"}
          sx={{
            "::-webkit-scrollbar": {
              width: "3px",
            },
            "::-webkit-scrollbar-thumb": {
              background: "blue.800",
              borderRadius: "4px",
            },
            "::-webkit-scrollbar-thumb:hover": {
              background: "gray.700",
            },
            "::-webkit-scrollbar-track": {
              background: "gray.100",
            },
          }}
          borderBottomRadius={8}
        >
          <Box py={4} px={2}>
            {/* Input for searching location */}
            <HStack spacing={3}>
              <Input
                color={"#000"}
                size="md"
                placeholder="Search for a location"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                mb={2}
              />
            </HStack>
            {citiesLoading ? (
              "Loading..."
            ) : (
              <>
                {citiesError && (
                  <Text color="red.500" fontSize="sm" px={4} pb={2}>
                    Unable to load city list. You can still use current location.
                  </Text>
                )}
                <MenuItem
                  onClick={fetchLocation}
                  color={"primary.text"}
                  fontWeight={600}
                  textAlign={"center"}
                  display={"flex"}
                  gap={2}
                  cursor={"pointer"}
                  py={2}
                  px={4}
                  _hover={{ bg: "primary.50" }}
                  _active={{ bg: "primary.100" }}
                >
                  {isLoading ? "Loading..." : "Use Current Location"}
                </MenuItem>
                {filterCities().map((city) => (
                  <MenuItem
                    key={city.id}
                    onClick={() => {
                      const selectdCity = {
                        id: city.id,
                        city: city.title,
                        latitude: city.latitude,
                        longitude: city.longitude,
                      };
                      setSelectedCity(selectdCity);
                      setStorageItem("currentCity", JSON.stringify(selectdCity));
                    }}
                    py={2}
                    px={4}
                    cursor={"pointer"}
                    _hover={{ bg: "primary.50" }}
                    _active={{ bg: "primary.100" }}
                    display={"flex"}
                    gap={2}
                    fontWeight={600}
                  >
                    <MdLocationCity color={theme.colors.gray[600]} />{" "}
                    {city.title}
                  </MenuItem>
                ))}
              </>
            )}
          </Box>
        </MenuList>
      </Menu>
    </Box>
  );
};

export default LocationSeletor;
