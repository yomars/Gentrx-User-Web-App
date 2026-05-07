import { useQuery } from "@tanstack/react-query"; // Adjust the import according to your project structure
import { GET } from "../Controllers/ApiControllers";

const getData = async () => {
  const res = await GET(`get_configurations`);
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
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
    staleTime: 5 * 60 * 1000,  // treat settings as fresh for 5 minutes
    gcTime: 30 * 60 * 1000,    // keep in cache for 30 minutes
  });
  return { settingsData, settingsLoading, settingsError };
};

export default useSettingsData;
