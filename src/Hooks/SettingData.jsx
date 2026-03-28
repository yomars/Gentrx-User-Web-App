import { useQuery } from "@tanstack/react-query"; // Adjust the import according to your project structure
import { GET } from "../Controllers/ApiControllers";

const getData = async () => {
  const res = await GET(`get_configurations`);
  console.debug("[SettingsData] API response:", { type: typeof res, hasData: !!res?.data, isArray: Array.isArray(res), response: res });
  
  if (Array.isArray(res?.data)) {
    console.debug("[SettingsData] Returning res.data (array)");
    return res.data;
  }
  if (Array.isArray(res)) {
    console.debug("[SettingsData] Returning res (array)");
    return res;
  }
  console.debug("[SettingsData] Returning empty array (no data found)");
  return [];
};

const useSettingsData = () => {
  const {
    isLoading: settingsLoading,
    data: settingsData,
    error: settingsError,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: getData,
    retry: 1,
  });
  
  if (settingsData?.length) {
    console.debug("[SettingsData] Hook - Found settings:", {
      count: settingsData.length,
      settingNames: settingsData.map(s => s.id_name).join(", "),
    });
  }
  
  return { settingsData, settingsLoading, settingsError };
};

export default useSettingsData;
