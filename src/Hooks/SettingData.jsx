import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";

const normalizeSettings = (data) => {
  // Handle multiple API response formats
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (data?.settings && Array.isArray(data.settings)) return data.settings;
  if (typeof data === "object" && data !== null) {
    // Try to extract array from object values
    const values = Object.values(data);
    const arrays = values.filter(Array.isArray);
    if (arrays.length === 1) return arrays[0];
  }
  return [];
};

const getData = async () => {
  try {
    const res = await GET(`get_configurations`);
    const settings = normalizeSettings(res);

    if (Array.isArray(settings) && settings.length > 0) {
      return settings;
    }

    return [];
  } catch (err) {
    return [];
  }
};

const useSettingsData = () => {
  const {
    isLoading: settingsLoading,
    data: settingsData = [],
    error: settingsError,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: getData,
    retry: 2,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
  
  return {
    settingsData: settingsData || [],
    settingsLoading,
    settingsError,
  };
};

export default useSettingsData;
