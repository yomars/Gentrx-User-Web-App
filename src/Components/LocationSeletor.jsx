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
import { setStorageItem } from "../lib/storage";

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

const getCity = async (lat, lng) => {
  const res = await GET(`get_current_city?latitude=${lat}&longitude=${lng}`);
  // Backend may return different response formats; check both cases
  const isSuccess = res?.response === 200 || res?.status === true || res?.data;
  if (!isSuccess) {
    console.error("API returned invalid response:", res);
    throw new Error(`Failed to get city - Invalid response: ${JSON.stringify(res)}`);
  }
  return res.data || res;
};

const getCities = async () => {
  const res = await GET("get_city?active=1");
  // Backend may return different response formats; check both cases
  const isSuccess = res?.response === 200 || res?.status === true || Array.isArray(res) || res?.data;
  if (!isSuccess) {
    console.error("API returned invalid response for cities:", res);
    throw new Error(`Failed to get cities - Invalid response: ${JSON.stringify(res)}`);
  }
  return Array.isArray(res) ? res : (res.data || res);
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

    const fallback = cityList.find((city) => city.default_city === 1) || cityList[0];
    const formattedCity = {
      id: fallback.id,
      city: fallback.title,
      latitude: fallback.latitude,
      longitude: fallback.longitude,
    };

    setSelectedCity(formattedCity);
    setStorageItem("currentCity", JSON.stringify(formattedCity));
    return true;
  }, [cityList, setSelectedCity]);

  const fetchLocation = useCallback(async () => {
    setisLoading(true); // Start loading
    try {
      const location = await getCurrentLocation();
      try {
        const city = await getCity(location.latitude, location.longitude);
        const formattedCity = {
          id: city.city_id,
          city: city.city,
        };
        setStorageItem("currentCity", JSON.stringify(formattedCity));
        setSelectedCity(formattedCity);
      } catch (error) {
        const hasFallback = applyFallbackCity();
        toast({
          title: "Failed to get city",
          description: hasFallback
            ? "Using default city from server settings"
            : "Please select a city manually",
          status: hasFallback ? "warning" : "error",
          duration: 2000,
          isClosable: true,
        });
        console.error("Error fetching city:", error);
      }
    } catch (error) {
      const hasFallback = applyFallbackCity();
      toast({
        title: "Failed to get city",
        description: hasFallback
          ? "Location access unavailable. Using default city."
          : "Please select a city manually",
        status: hasFallback ? "warning" : "error",
        duration: 2000,
        isClosable: true,
      });
      console.error("Error fetching location:", error);
    } finally {
      setisLoading(false); // End loading
    }
  }, [applyFallbackCity, setSelectedCity, toast]);

  useEffect(() => {
    if (!selectedCity) {
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
